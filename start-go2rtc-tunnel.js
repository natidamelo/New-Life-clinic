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

// Start local CORS Proxy with HLS Session Manager
// go2rtc HLS sessions expire in ~3s of inactivity. Through a Cloudflare tunnel the
// added latency causes sessions to die between browser polling intervals (→ 404s).
// This proxy keeps sessions alive, auto-renews them, and rewrites manifest URLs so
// the browser always gets a valid playlist.
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

// ── HLS Session Manager ─────────────────────────────────────────────────────
// Keeps go2rtc sessions alive and transparently recreates them when they expire.
const hlsSessions = new Map(); // streamKey → { sessionId, codecs, keepaliveTimer, lastBrowserAccess }
const SESSION_KEEPALIVE_MS = 2000;   // poll every 2 s to keep session alive
const SESSION_IDLE_TIMEOUT = 60000;  // stop keepalive after 60 s with no browser requests

async function createGo2rtcSession(streamKey) {
  const res = await fetch(`http://localhost:${GO2RTC_PORT}/api/stream.m3u8?src=${encodeURIComponent(streamKey)}`);
  if (res.status !== 200) return null;
  const text = await res.text();
  const idMatch = text.match(/hls\/playlist\.m3u8\?id=(\S+)/);
  if (!idMatch) return null;
  const codecMatch = text.match(/CODECS="([^"]+)"/);
  return { sessionId: idMatch[1], codecs: codecMatch ? codecMatch[1] : 'avc1.640029' };
}

async function getOrCreateSession(streamKey) {
  const existing = hlsSessions.get(streamKey);

  // If we already have a session, verify it's still alive
  if (existing) {
    try {
      const r = await fetch(`http://localhost:${GO2RTC_PORT}/api/hls/playlist.m3u8?id=${existing.sessionId}`);
      if (r.status === 200) return existing;
    } catch {}
    // Dead – clean up
    if (existing.keepaliveTimer) clearInterval(existing.keepaliveTimer);
    hlsSessions.delete(streamKey);
  }

  // Create a fresh session
  const result = await createGo2rtcSession(streamKey);
  if (!result) return null;

  // Keepalive: periodically fetch playlist so go2rtc doesn't garbage-collect the session
  const keepaliveTimer = setInterval(async () => {
    const sess = hlsSessions.get(streamKey);
    if (!sess) return;

    // Auto-cleanup when nobody is watching
    if (Date.now() - sess.lastBrowserAccess > SESSION_IDLE_TIMEOUT) {
      clearInterval(sess.keepaliveTimer);
      hlsSessions.delete(streamKey);
      console.log(`[HLS] Cleaned up idle session for ${streamKey.substring(0, 8)}…`);
      return;
    }

    try {
      const r = await fetch(`http://localhost:${GO2RTC_PORT}/api/hls/playlist.m3u8?id=${sess.sessionId}`);
      if (r.status === 404) {
        // Session died despite keepalive → recreate immediately
        console.log(`[HLS] Session expired for ${streamKey.substring(0, 8)}…, recreating…`);
        const fresh = await createGo2rtcSession(streamKey);
        if (fresh) {
          sess.sessionId = fresh.sessionId;
          sess.codecs = fresh.codecs;
        }
      }
    } catch {}
  }, SESSION_KEEPALIVE_MS);

  const session = {
    sessionId: result.sessionId,
    codecs: result.codecs,
    keepaliveTimer,
    lastBrowserAccess: Date.now()
  };
  hlsSessions.set(streamKey, session);
  console.log(`[HLS] Created session ${result.sessionId} for stream ${streamKey.substring(0, 8)}…`);
  return session;
}

// ── HTTP Proxy Server ────────────────────────────────────────────────────────
const proxyServer = http.createServer(async (req, res) => {
  // CORS for every response
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, 'http://localhost');

    // ── 1. HLS Master Manifest (/api/stream.m3u8?src=STREAM_KEY) ─────────
    //    Intercept, create/reuse session, return manifest with proxy-managed URLs.
    if (req.url.startsWith('/api/stream.m3u8')) {
      const streamKey = url.searchParams.get('src');
      if (streamKey) {
        const session = await getOrCreateSession(streamKey);
        if (session) {
          const manifest = [
            '#EXTM3U',
            `#EXT-X-STREAM-INF:BANDWIDTH=192000,CODECS="${session.codecs}"`,
            `/api/proxy-hls/playlist.m3u8?stream=${encodeURIComponent(streamKey)}`
          ].join('\n') + '\n';
          res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl', ...NO_CACHE_HEADERS, ...CORS_HEADERS });
          res.end(manifest);
          return;
        }
        // Session creation failed — camera is likely offline / unreachable
        console.warn(`[HLS] Stream unavailable for ${streamKey.substring(0, 8)}… (camera offline?)`);
        res.writeHead(503, { 'Content-Type': 'application/json', ...NO_CACHE_HEADERS, ...CORS_HEADERS });
        res.end(JSON.stringify({ error: 'camera_offline', message: 'Camera stream unavailable — camera may be offline or unreachable' }));
        return;
      }
    }

    // ── 2. HLS Proxy Playlist (/proxy-hls/playlist.m3u8?stream=KEY) ──────
    if (req.url.includes('proxy-hls/playlist.m3u8')) {
      const streamKey = url.searchParams.get('stream');
      if (streamKey) {
        const session = await getOrCreateSession(streamKey);
        if (session) {
          session.lastBrowserAccess = Date.now();
          const pr = await fetch(`http://localhost:${GO2RTC_PORT}/api/hls/playlist.m3u8?id=${session.sessionId}`);
          if (pr.status === 200) {
            let text = await pr.text();
            // Rewrite segment URLs → proxy endpoint (strip go2rtc session ID)
            text = text.replace(
              /segment\.ts\?id=[^&\s]+&n=(\d+)/g,
              (_, n) => `/api/proxy-hls/segment.ts?stream=${encodeURIComponent(streamKey)}&n=${n}`
            );
            res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl', ...NO_CACHE_HEADERS, ...CORS_HEADERS });
            res.end(text);
            return;
          }
        }
        res.writeHead(404, CORS_HEADERS);
        res.end('HLS session unavailable');
        return;
      }
    }

    // ── 3. HLS Proxy Segment (/proxy-hls/segment.ts?stream=KEY&n=N) ──────
    if (req.url.includes('proxy-hls/segment.ts')) {
      const streamKey = url.searchParams.get('stream');
      const n = url.searchParams.get('n');
      if (streamKey && n !== null) {
        const session = hlsSessions.get(streamKey);
        if (session) {
          session.lastBrowserAccess = Date.now();
          const sr = await fetch(`http://localhost:${GO2RTC_PORT}/api/hls/segment.ts?id=${session.sessionId}&n=${n}`);
          if (sr.status === 200) {
            const buf = Buffer.from(await sr.arrayBuffer());
            res.writeHead(200, { 'Content-Type': 'video/MP2T', ...CORS_HEADERS });
            res.end(buf);
            return;
          }
        }
        res.writeHead(404, CORS_HEADERS);
        res.end('Segment not found');
        return;
      }
    }
  } catch (err) {
    console.error(`[HLS Proxy] Error handling ${req.url}: ${err.message}`);
    // Fall through to general proxy
  }

  // ── 4. General CORS Proxy (all other requests) ────────────────────────
  const options = {
    hostname: 'localhost',
    port: GO2RTC_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers }
  };
  delete options.headers['host'];

  const proxyReq = http.request(options, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers, ...CORS_HEADERS };
    if (req.url.includes('.m3u8')) Object.assign(responseHeaders, NO_CACHE_HEADERS);
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res, { end: true });
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
