require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Camera = require('./models/Camera');

const RTSP_MAP = {
  // Map stream keys to RTSP URLs by matching room names
  // We know these from earlier testing
};

// Known RTSP URLs (confirmed working with ffprobe)
const KNOWN_CAMERAS = [
  { rtspUrl: 'rtsp://admin:CWIQMH@192.168.1.2:554/Streaming/Channels/101', label: '192.168.1.2' },
  { rtspUrl: 'rtsp://admin:PKUSCK@192.168.1.4:554/Streaming/Channels/101', label: '192.168.1.4' },
];

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const cameras = await Camera.find({}).lean();
  console.log(`\nFound ${cameras.length} camera(s) in database:\n`);

  cameras.forEach((c, i) => {
    console.log(`[${i+1}] ${c.name}`);
    console.log(`     Room: ${c.room}`);
    console.log(`     StreamKey: ${c.streamKey}`);
    console.log(`     Status: ${c.status}`);
    console.log(`     StreamRegistered: ${c.streamRegistered}`);
    console.log('');
  });

  // Register each camera in go2rtc using the streamKey + known RTSP URL
  console.log('Registering streams in go2rtc at http://localhost:1984...\n');

  for (let i = 0; i < cameras.length; i++) {
    const cam = cameras[i];
    // Pick RTSP URL based on index (or room name)
    const rtsp = KNOWN_CAMERAS[i % KNOWN_CAMERAS.length];
    if (!rtsp) continue;

    try {
      await axios.post('http://localhost:1984/api/streams', null, {
        params: { name: cam.streamKey, src: rtsp.rtspUrl },
        timeout: 5000
      });
      console.log(`✅ Registered: ${cam.name} (${cam.streamKey.substring(0,8)}...) → ${rtsp.label}`);

      // Update status in DB
      await Camera.findByIdAndUpdate(cam._id, {
        streamRegistered: true,
        status: 'online'
      });
    } catch (err) {
      console.log(`❌ Failed to register ${cam.name}: ${err.message}`);
    }
  }

  console.log('\nDone. Disconnecting...');
  await mongoose.disconnect();
  console.log('Complete!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
