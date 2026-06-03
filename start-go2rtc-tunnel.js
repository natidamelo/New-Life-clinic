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

// Start local CORS Proxy to resolve browser preflight Access-Control-Allow-Headers errors (such as 'expires')
const PROXY_PORT = 1985;
const GO2RTC_PORT = 1984;

const proxyServer = http.createServer((req, res) => {
  // Set permissive CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  // Handle preflight OPTIONS requests directly
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Forward standard HTTP request to go2rtc
  const options = {
    hostname: 'localhost',
    port: GO2RTC_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers }
  };

  // Delete host header to prevent host mismatch errors on target
  delete options.headers['host'];

  const proxyReq = http.request(options, (proxyRes) => {
    // Merge target response headers with our CORS headers
    const responseHeaders = {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*'
    };

    // Prevent caching of playlists (.m3u8) to ensure dynamic session IDs are never cached
    if (req.url.includes('.m3u8')) {
      responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate, private';
      responseHeaders['Pragma'] = 'no-cache';
      responseHeaders['Expires'] = '0';
    }

    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[CORS Proxy Error] Failed to reach go2rtc: ${err.message}`);
    res.writeHead(502);
    res.end('Bad Gateway: go2rtc may not be fully initialized or running.');
  });

  req.pipe(proxyReq, { end: true });
});

// Handle WebSocket proxying (needed for real-time controls/feeds)
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

  socket.on('error', () => {
    targetSocket.destroy();
  });
});

proxyServer.listen(PROXY_PORT, () => {
  console.log(`🚀 CORS Proxy listening on port ${PROXY_PORT} -> forwarding to ${GO2RTC_PORT}`);
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
