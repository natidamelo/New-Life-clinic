const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const net = require('net');

// Load environment variables from backend/.env
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  console.error('❌ Could not find backend/.env file.');
  process.exit(1);
}

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI is not defined in backend/.env.');
  process.exit(1);
}

const LOG_FILE = path.join(__dirname, 'cloudflared-tunnel.log');
const GO2RTC_LOG_FILE = path.join(__dirname, 'go2rtc-app.log');

// Clear old log files
if (fs.existsSync(LOG_FILE)) {
  try {
    fs.unlinkSync(LOG_FILE);
  } catch (e) {}
}
if (fs.existsSync(GO2RTC_LOG_FILE)) {
  try {
    fs.unlinkSync(GO2RTC_LOG_FILE);
  } catch (e) {}
}

console.log('🚀 Starting go2rtc stream relay...');
const go2rtcLog = fs.openSync(GO2RTC_LOG_FILE, 'a');

// Start go2rtc.exe in background if it's not already running
const go2rtc = spawn('go2rtc.exe', ['-config', 'go2rtc.yaml'], {
  cwd: __dirname,
  stdio: ['ignore', go2rtcLog, go2rtcLog],
  detached: true
});
go2rtc.unref();

// Start local CORS Proxy — transparent pass-through to go2rtc with CORS headers.
// go2rtc's native HLS session management works fine when HLS.js talks to it directly.
// This proxy only adds CORS headers and cache-busting for .m3u8 files.
const PROXY_PORT = 1985;
const GO2RTC_PORT = 1984;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*'
};
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// ── HLS Session Keepalive Manager ────────────────────────────────────────────
const activeSessions = new Map(); // sessionId -> { lastAccess: timestamp, interval: timer }

function startKeepalive(sessionId, clientHeaders) {
  if (activeSessions.has(sessionId)) {
    activeSessions.get(sessionId).lastAccess = Date.now();
    return;
  }
  
  console.log(`[HLS Proxy] Starting keepalive for session: ${sessionId}`);
  
  const headers = { ...clientHeaders };
  delete headers['host']; // Prevent host header mismatch errors on target localhost:1984
  
  const interval = setInterval(async () => {
    const session = activeSessions.get(sessionId);
    if (!session) {
      clearInterval(interval);
      return;
    }
    
    // Check for idle timeout (30 seconds of no browser access)
    if (Date.now() - session.lastAccess > 30000) {
      console.log(`[HLS Proxy] Session ${sessionId} idle timeout, stopping keepalive`);
      clearInterval(interval);
      activeSessions.delete(sessionId);
      return;
    }
    
    // Fetch playlist to keep the session alive in go2rtc
    try {
      const res = await fetch(`http://localhost:${GO2RTC_PORT}/api/hls/playlist.m3u8?id=${sessionId}`, { headers });
      if (res.status === 404) {
        console.log(`[HLS Proxy] Keepalive fetch returned 404 for session ${sessionId} (transcoder initializing...)`);
      }
    } catch (err) {
      // Ignore fetch errors
    }
  }, 1500);
  
  activeSessions.set(sessionId, {
    lastAccess: Date.now(),
    interval
  });
}

function touchSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastAccess = Date.now();
  }
}

// ── HTTP Proxy Server ────────────────────────────────────────────────────────
const proxyServer = http.createServer((req, res) => {
  // CORS for every response
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL to check query params
  let urlObj;
  try {
    urlObj = new URL(req.url, 'http://localhost');
  } catch (e) {
    urlObj = { searchParams: { get: () => null } };
  }

  // Transparent CORS proxy — forward everything to go2rtc
  const options = {
    hostname: 'localhost',
    port: GO2RTC_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers }
  };
  delete options.headers['host'];

  const isMasterManifest = req.url.includes('/api/stream.m3u8');

  // If this is a request to playlist or segment, touch the session to keep it alive
  const sessId = urlObj.searchParams.get('id');
  if (sessId) {
    touchSession(sessId);
  }

  const proxyReq = http.request(options, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers, ...CORS_HEADERS };
    // Prevent caching of HLS manifests/playlists
    if (req.url.includes('.m3u8')) Object.assign(responseHeaders, NO_CACHE_HEADERS);

    if (isMasterManifest && proxyRes.statusCode === 200) {
      // If it is the master manifest, we need to read the body to extract the session ID
      let body = '';
      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.on('data', chunk => {
        body += chunk;
        res.write(chunk);
      });
      proxyRes.on('end', () => {
        res.end();
        // Parse the body to find "id=..."
        const match = body.match(/id=([A-Za-z0-9_-]+)/);
        if (match) {
          startKeepalive(match[1], req.headers);
        }
      });
    } else {
      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res, { end: true });
    }
  });

  proxyReq.on('error', (err) => {
    console.error(`[CORS Proxy Error] Failed to reach go2rtc: ${err.message}`);
    if (!res.headersSent) { res.writeHead(502); res.end('Bad Gateway'); }
  });

  req.pipe(proxyReq, { end: true });
});

// Handle WebSocket proxying (needed for WebRTC signaling & real-time controls)
proxyServer.on('upgrade', (req, socket, head) => {
  const targetSocket = net.connect(GO2RTC_PORT, 'localhost', () => {
    let rawHeaders = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      if (req.rawHeaders[i].toLowerCase() === 'host') {
        rawHeaders += `Host: localhost:${GO2RTC_PORT}\r\n`;
      } else {
        rawHeaders += `${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}\r\n`;
      }
    }
    rawHeaders += '\r\n';
    targetSocket.write(rawHeaders);
    targetSocket.write(head);
    socket.pipe(targetSocket);
    targetSocket.pipe(socket);
  });

  targetSocket.on('error', (err) => {
    console.error(`[CORS WS Proxy Error] ${err.message}`);
    socket.destroy();
  });
  socket.on('error', () => targetSocket.destroy());
});

proxyServer.listen(PROXY_PORT, () => {
  console.log(`🚀 CORS Proxy + HLS Session Manager on port ${PROXY_PORT} → forwarding to ${GO2RTC_PORT}`);
});

console.log('🚀 Starting Cloudflare Tunnel...');
// Tunnel points to the CORS proxy on port 1985 instead of go2rtc directly on 1984
const cloudflared = spawn('cloudflared.exe', [
  'tunnel',
  '--url', `http://localhost:${PROXY_PORT}`,
  '--logfile', LOG_FILE
], {
  cwd: __dirname
});

// Watch log file for the dynamic trycloudflare.com URL
let urlFound = false;

const checkLogTimer = setInterval(() => {
  if (!fs.existsSync(LOG_FILE)) return;
  
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const match = content.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  
  if (match && !urlFound) {
    urlFound = true;
    const tunnelUrl = match[0];
    console.log(`\n=================================================`);
    console.log(`✅ Cloudflare Tunnel Created: ${tunnelUrl}`);
    console.log(`=================================================\n`);
    
    clearInterval(checkLogTimer);
    updateDatabase(tunnelUrl);
  }
}, 1000);

async function updateDatabase(url) {
  try {
    console.log('🔌 Connecting to cloud MongoDB Atlas cluster...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    // Define SystemSetting schema/model inline to avoid loading entire backend framework
    const systemSettingSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true },
      description: String,
      category: { type: String, default: 'general' },
      isActive: { type: Boolean, default: true }
    }, { collection: 'systemsettings', timestamps: true });

    const SystemSetting = mongoose.models.SystemSetting || mongoose.model('SystemSetting', systemSettingSchema);

    console.log(`💾 Updating setting 'go2rtc_public_url' to: ${url}`);
    await SystemSetting.findOneAndUpdate(
      { key: 'go2rtc_public_url' },
      {
        value: url,
        description: 'Dynamic public URL for go2rtc CCTV streams via Cloudflare Tunnel',
        category: 'general',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('✅ Setting saved successfully! Render backend will now dynamically use this URL.');
  } catch (error) {
    console.error('❌ Error updating database:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed. Tunnel remains ACTIVE.');
    console.log('\nKeep this window open to maintain stream relay and tunnel.');
  }
}

// Keep script alive and handle exit gracefully
process.on('SIGINT', () => {
  console.log('\nStopping tunnel and proxy...');
  cloudflared.kill();
  go2rtc.kill();
  proxyServer.close();
  process.exit();
});
