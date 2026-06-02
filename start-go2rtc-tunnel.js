const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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

// Clear old log file
if (fs.existsSync(LOG_FILE)) {
  try {
    fs.unlinkSync(LOG_FILE);
  } catch (e) {}
}

console.log('🚀 Starting go2rtc stream relay...');
// Clear old go2rtc log file
const GO2RTC_LOG_FILE = path.join(__dirname, 'go2rtc-app.log');
if (fs.existsSync(GO2RTC_LOG_FILE)) {
  try {
    fs.unlinkSync(GO2RTC_LOG_FILE);
  } catch (e) {}
}
const go2rtcLog = fs.openSync(GO2RTC_LOG_FILE, 'a');

// Start go2rtc.exe in background if it's not already running
const go2rtc = spawn('go2rtc.exe', ['-config', 'go2rtc.yaml'], {
  cwd: __dirname,
  stdio: ['ignore', go2rtcLog, go2rtcLog],
  detached: true
});
go2rtc.unref();

console.log('🚀 Starting Cloudflare Tunnel...');
const cloudflared = spawn('cloudflared.exe', [
  'tunnel',
  '--url', 'http://localhost:1984',
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
  console.log('\nStopping tunnel...');
  cloudflared.kill();
  process.exit();
});
