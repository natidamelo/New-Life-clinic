/**
 * CCTV Controller
 * Handles all camera management, stream relay (go2rtc), recording (FFmpeg), and event logging.
 *
 * Security:
 *  - RTSP URLs are AES-256-GCM encrypted before storage.
 *  - go2rtc streams are referenced by a safe UUID key, never exposing credentials to the browser.
 *  - All mutations are logged to AuditLog.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');

const Camera = require('../models/Camera');
const CameraEvent = require('../models/CameraEvent');
const Recording = require('../models/Recording');
const AuditLog = require('../models/AuditLog');

// ─── Encryption helpers ────────────────────────────────────────────────────────

const ENCRYPTION_KEY = (() => {
  const key = process.env.CCTV_ENCRYPTION_KEY || '';
  if (key.length < 32) {
    console.warn('[CCTV] ⚠️  CCTV_ENCRYPTION_KEY is missing or too short. Using insecure fallback.');
    // Pad to exactly 32 bytes for AES-256
    return 'insecure-default-key-replace-me!'.padEnd(32, '0').slice(0, 32);
  }
  return key.slice(0, 32); // ensure exactly 32 bytes for AES-256
})();

function encryptRtspUrl(plaintext) {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decryptRtspUrl(encryptedHex, ivHex, authTagHex) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

// ─── go2rtc helpers ────────────────────────────────────────────────────────────

const GO2RTC_API = process.env.GO2RTC_API_URL || 'http://localhost:1984';
const GO2RTC_API_KEY = process.env.GO2RTC_API_KEY || '';

const go2rtcHeaders = GO2RTC_API_KEY
  ? { Authorization: `Bearer ${GO2RTC_API_KEY}` }
  : {};

async function registerStreamInGo2rtc(streamKey, rtspUrl) {
  try {
    await axios.post(
      `${GO2RTC_API}/api/streams`,
      null,
      {
        params: { name: streamKey, src: rtspUrl },
        headers: go2rtcHeaders,
        timeout: 5000
      }
    );
    return true;
  } catch (err) {
    console.error(`[CCTV] go2rtc stream register failed for key "${streamKey}":`, err.message);
    return false;
  }
}

async function removeStreamFromGo2rtc(streamKey) {
  try {
    await axios.delete(
      `${GO2RTC_API}/api/streams`,
      {
        params: { name: streamKey },
        headers: go2rtcHeaders,
        timeout: 5000
      }
    );
    return true;
  } catch (err) {
    console.error(`[CCTV] go2rtc stream remove failed for key "${streamKey}":`, err.message);
    return false;
  }
}

async function go2rtcStreamInfo(streamKey) {
  try {
    const res = await axios.get(`${GO2RTC_API}/api/streams`, {
      headers: go2rtcHeaders,
      timeout: 5000
    });
    const streams = res.data || {};
    return streams[streamKey] || null;
  } catch {
    return null;
  }
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function writeAudit(req, action, resource, details = {}) {
  try {
    const user = req.user;
    await AuditLog.create({
      userId: user?._id,
      userRole: user?.role,
      action,
      resource,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      clinicId: user?.clinicId || 'default',
      timestamp: new Date()
    });
  } catch (e) {
    // Audit failures should never crash the main flow
    console.error('[CCTV] Audit log write failed:', e.message);
  }
}

// ─── Recording dir ────────────────────────────────────────────────────────────

const RECORDINGS_DIR = process.env.CCTV_RECORDINGS_DIR ||
  path.join(__dirname, '../recordings');

try {
  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    console.log(`[CCTV] Created recordings directory: ${RECORDINGS_DIR}`);
  }
} catch (dirErr) {
  // Render.com and other cloud platforms may have read-only filesystems.
  // Recording to disk won't work but camera management still functions.
  console.warn('[CCTV] ⚠️  Could not create recordings directory:', dirErr.message);
}

// Track active FFmpeg processes: { recordingId -> ChildProcess }
const activeRecordings = new Map();

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * GET /api/cctv/cameras
 */
exports.getCameras = async (req, res) => {
  try {
    const clinicId = req.user?.clinicId || 'default';
    const cameras = await Camera.find({ clinicId }).sort({ createdAt: -1 }).lean();

    // Strip encrypted fields from response
    const safe = cameras.map(c => ({
      _id: c._id,
      name: c.name,
      room: c.room,
      location: c.location,
      status: c.status,
      lastSeenAt: c.lastSeenAt,
      recordingEnabled: c.recordingEnabled,
      recordingActive: c.recordingActive,
      streamKey: c.streamKey,
      streamRegistered: c.streamRegistered,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    res.json({ success: true, data: safe });
  } catch (err) {
    console.error('[CCTV] getCameras error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/cctv/cameras
 */
exports.addCamera = async (req, res) => {
  try {
    const { name, rtspUrl, room, location, notes } = req.body;
    if (!name || !rtspUrl || !room) {
      return res.status(400).json({ success: false, message: 'name, rtspUrl, and room are required' });
    }

    const clinicId = req.user?.clinicId || 'default';
    const streamKey = crypto.randomUUID();

    const { encrypted, iv, authTag } = encryptRtspUrl(rtspUrl);

    const camera = new Camera({
      clinicId,
      name,
      rtspUrlEncrypted: encrypted,
      rtspUrlIv: iv,
      rtspUrlAuthTag: authTag,
      streamKey,
      room,
      location: location || 'Main',
      notes: notes || '',
      createdBy: req.user?._id,
      status: 'unknown'
    });

    await camera.save();

    // Register stream in go2rtc
    const registered = await registerStreamInGo2rtc(streamKey, rtspUrl);
    if (registered) {
      camera.streamRegistered = true;
      camera.status = 'online';
      await camera.save();
    }

    await writeAudit(req, 'CREATE', 'Camera', { cameraId: camera._id, name });

    res.status(201).json({
      success: true,
      message: 'Camera added successfully',
      data: {
        _id: camera._id,
        name: camera.name,
        room: camera.room,
        location: camera.location,
        status: camera.status,
        streamKey: camera.streamKey,
        streamRegistered: camera.streamRegistered,
        recordingEnabled: camera.recordingEnabled,
        createdAt: camera.createdAt
      }
    });
  } catch (err) {
    console.error('[CCTV] addCamera error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/cctv/cameras/:id
 */
exports.editCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    const { name, rtspUrl, room, location, notes, recordingEnabled } = req.body;

    if (name) camera.name = name;
    if (room) camera.room = room;
    if (location) camera.location = location;
    if (notes !== undefined) camera.notes = notes;
    if (recordingEnabled !== undefined) camera.recordingEnabled = recordingEnabled;

    // If RTSP URL changed, re-encrypt and re-register
    if (rtspUrl) {
      const { encrypted, iv, authTag } = encryptRtspUrl(rtspUrl);
      camera.rtspUrlEncrypted = encrypted;
      camera.rtspUrlIv = iv;
      camera.rtspUrlAuthTag = authTag;

      // Update go2rtc registration
      await removeStreamFromGo2rtc(camera.streamKey);
      const registered = await registerStreamInGo2rtc(camera.streamKey, rtspUrl);
      camera.streamRegistered = registered;
    }

    await camera.save();
    await writeAudit(req, 'UPDATE', 'Camera', { cameraId: camera._id, name: camera.name });

    res.json({ success: true, message: 'Camera updated' });
  } catch (err) {
    console.error('[CCTV] editCamera error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/cctv/cameras/:id
 */
exports.deleteCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    // Stop any active recording first
    if (camera.recordingActive) {
      const activeEntry = [...activeRecordings.entries()]
        .find(([, info]) => info.cameraId === camera._id.toString());
      if (activeEntry) {
        const [recId, info] = activeEntry;
        info.process.kill('SIGTERM');
        activeRecordings.delete(recId);
      }
    }

    // Remove from go2rtc
    await removeStreamFromGo2rtc(camera.streamKey);

    await camera.deleteOne();
    await writeAudit(req, 'DELETE', 'Camera', { cameraId: req.params.id, name: camera.name });

    res.json({ success: true, message: 'Camera deleted' });
  } catch (err) {
    console.error('[CCTV] deleteCamera error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/cctv/cameras/:id/stream
 * Returns the HLS stream URL for this camera (served by go2rtc).
 * RTSP credentials are never exposed to the browser.
 */
exports.getStreamUrl = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).lean();
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    const go2rtcHost = process.env.GO2RTC_PUBLIC_URL || 'http://localhost:1984';
    const hlsUrl = `${go2rtcHost}/stream.m3u8?src=${camera.streamKey}`;
    const webrtcUrl = `${go2rtcHost}/webrtc?src=${camera.streamKey}`;

    res.json({
      success: true,
      data: {
        cameraId: camera._id,
        name: camera.name,
        room: camera.room,
        status: camera.status,
        hlsUrl,
        webrtcUrl,
        streamKey: camera.streamKey
      }
    });
  } catch (err) {
    console.error('[CCTV] getStreamUrl error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/cctv/cameras/:id/status
 */
exports.getCameraStatus = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).lean();
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    res.json({
      success: true,
      data: {
        _id: camera._id,
        status: camera.status,
        lastSeenAt: camera.lastSeenAt,
        recordingActive: camera.recordingActive,
        streamRegistered: camera.streamRegistered
      }
    });
  } catch (err) {
    console.error('[CCTV] getCameraStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/cctv/cameras/:id/status/check
 * Actively probes go2rtc to update camera online/offline status.
 */
exports.checkCameraStatus = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    const info = await go2rtcStreamInfo(camera.streamKey);
    const isOnline = info && Object.keys(info).length > 0;

    camera.status = isOnline ? 'online' : 'offline';
    camera.lastSeenAt = isOnline ? new Date() : camera.lastSeenAt;
    await camera.save();

    // Log status change event
    await CameraEvent.create({
      cameraId: camera._id,
      clinicId: req.user?.clinicId || 'default',
      eventType: isOnline ? 'camera_online' : 'camera_offline',
      severity: isOnline ? 'info' : 'warning',
      metadata: { checkedAt: new Date() }
    });

    res.json({ success: true, data: { status: camera.status, lastSeenAt: camera.lastSeenAt } });
  } catch (err) {
    console.error('[CCTV] checkCameraStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/cctv/cameras/:id/recording/start
 */
exports.startRecording = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    if (camera.recordingActive) {
      return res.status(400).json({ success: false, message: 'Recording already active for this camera' });
    }

    // Decrypt RTSP URL for FFmpeg
    const rtspUrl = decryptRtspUrl(
      camera.rtspUrlEncrypted,
      camera.rtspUrlIv,
      camera.rtspUrlAuthTag
    );

    // Build output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${camera.name.replace(/\s+/g, '_')}_${timestamp}.mp4`;
    const outputPath = path.join(RECORDINGS_DIR, filename);

    // Create Recording document
    const recording = await Recording.create({
      cameraId: camera._id,
      clinicId: req.user?.clinicId || 'default',
      startTime: new Date(),
      filePath: outputPath,
      status: 'recording',
      triggeredBy: req.user?._id
    });

    // Launch FFmpeg
    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-c:v', 'copy',
      '-an', // no audio (clinic security)
      '-y',
      outputPath
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    recording.ffmpegPid = ffmpegProcess.pid;
    await recording.save();

    camera.recordingActive = true;
    camera.currentRecordingPath = outputPath;
    await camera.save();

    activeRecordings.set(recording._id.toString(), {
      process: ffmpegProcess,
      cameraId: camera._id.toString(),
      recordingId: recording._id.toString(),
      outputPath
    });

    ffmpegProcess.on('error', async (err) => {
      console.error(`[CCTV] FFmpeg error for camera ${camera.name}:`, err.message);
      await Recording.findByIdAndUpdate(recording._id, { status: 'failed', endTime: new Date() });
      camera.recordingActive = false;
      camera.currentRecordingPath = null;
      await camera.save();
      activeRecordings.delete(recording._id.toString());
    });

    ffmpegProcess.on('close', async (code) => {
      console.log(`[CCTV] FFmpeg closed with code ${code} for camera ${camera.name}`);
      try {
        const stats = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;
        const endTime = new Date();
        const rec = await Recording.findById(recording._id);
        if (rec && rec.status === 'recording') {
          rec.status = code === 0 ? 'completed' : 'failed';
          rec.endTime = endTime;
          rec.fileSize = stats ? stats.size : 0;
          rec.duration = Math.round((endTime - rec.startTime) / 1000);
          await rec.save();
        }
        const cam = await Camera.findById(camera._id);
        if (cam) {
          cam.recordingActive = false;
          cam.currentRecordingPath = null;
          await cam.save();
        }
      } catch (e) {
        console.error('[CCTV] Error updating recording on close:', e.message);
      }
      activeRecordings.delete(recording._id.toString());
    });

    await writeAudit(req, 'START_RECORDING', 'Recording', { cameraId: camera._id, recordingId: recording._id });

    await CameraEvent.create({
      cameraId: camera._id,
      clinicId: req.user?.clinicId || 'default',
      eventType: 'recording_started',
      severity: 'info',
      metadata: { recordingId: recording._id, triggeredBy: req.user?.email }
    });

    res.json({ success: true, message: 'Recording started', data: { recordingId: recording._id, filePath: filename } });
  } catch (err) {
    console.error('[CCTV] startRecording error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/cctv/cameras/:id/recording/stop
 */
exports.stopRecording = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    if (!camera.recordingActive) {
      return res.status(400).json({ success: false, message: 'No active recording for this camera' });
    }

    // Find active recording entry
    const entry = [...activeRecordings.values()]
      .find(e => e.cameraId === camera._id.toString());

    if (entry) {
      entry.process.kill('SIGTERM');
      // Process close handler will update DB
    }

    await writeAudit(req, 'STOP_RECORDING', 'Recording', { cameraId: camera._id });

    await CameraEvent.create({
      cameraId: camera._id,
      clinicId: req.user?.clinicId || 'default',
      eventType: 'recording_stopped',
      severity: 'info',
      metadata: { stoppedBy: req.user?.email }
    });

    res.json({ success: true, message: 'Recording stop signal sent' });
  } catch (err) {
    console.error('[CCTV] stopRecording error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/cctv/recordings
 */
exports.getRecordings = async (req, res) => {
  try {
    const clinicId = req.user?.clinicId || 'default';
    const { cameraId, limit = 50, page = 1 } = req.query;
    const filter = { clinicId };
    if (cameraId) filter.cameraId = cameraId;

    const recordings = await Recording.find(filter)
      .populate('cameraId', 'name room')
      .populate('triggeredBy', 'firstName lastName')
      .sort({ startTime: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Recording.countDocuments(filter);

    res.json({ success: true, data: recordings, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('[CCTV] getRecordings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/cctv/recordings/:recordingId
 */
exports.deleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.recordingId);
    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

    // Delete file from disk
    if (recording.filePath && fs.existsSync(recording.filePath)) {
      fs.unlinkSync(recording.filePath);
    }

    recording.status = 'deleted';
    await recording.deleteOne();

    await writeAudit(req, 'DELETE_RECORDING', 'Recording', { recordingId: req.params.recordingId });

    res.json({ success: true, message: 'Recording deleted' });
  } catch (err) {
    console.error('[CCTV] deleteRecording error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/cctv/events
 */
exports.getEvents = async (req, res) => {
  try {
    const clinicId = req.user?.clinicId || 'default';
    const { cameraId, eventType, limit = 100, page = 1 } = req.query;
    const filter = { clinicId };
    if (cameraId) filter.cameraId = cameraId;
    if (eventType) filter.eventType = eventType;

    const events = await CameraEvent.find(filter)
      .populate('cameraId', 'name room')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await CameraEvent.countDocuments(filter);

    res.json({ success: true, data: events, total });
  } catch (err) {
    console.error('[CCTV] getEvents error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/cctv/events/:eventId/acknowledge
 */
exports.acknowledgeEvent = async (req, res) => {
  try {
    const event = await CameraEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    event.acknowledged = true;
    event.acknowledgedBy = req.user?._id;
    event.acknowledgedAt = new Date();
    await event.save();

    res.json({ success: true, message: 'Event acknowledged' });
  } catch (err) {
    console.error('[CCTV] acknowledgeEvent error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/cctv/status
 * Returns overview of all cameras and go2rtc health.
 */
exports.getAllCamerasStatus = async (req, res) => {
  try {
    const clinicId = req.user?.clinicId || 'default';
    const cameras = await Camera.find({ clinicId }).lean();

    // Probe go2rtc for all streams
    let go2rtcStreams = {};
    try {
      const r = await axios.get(`${GO2RTC_API}/api/streams`, {
        headers: go2rtcHeaders,
        timeout: 3000
      });
      go2rtcStreams = r.data || {};
    } catch {
      // go2rtc may not be running yet
    }

    const statuses = cameras.map(c => ({
      _id: c._id,
      name: c.name,
      room: c.room,
      status: go2rtcStreams[c.streamKey] ? 'online' : (c.status || 'offline'),
      lastSeenAt: c.lastSeenAt,
      recordingActive: c.recordingActive,
      streamRegistered: !!go2rtcStreams[c.streamKey]
    }));

    // Update DB in background
    for (const cam of cameras) {
      const isOnline = !!go2rtcStreams[cam.streamKey];
      if ((cam.status === 'online') !== isOnline) {
        Camera.findByIdAndUpdate(cam._id, {
          status: isOnline ? 'online' : 'offline',
          lastSeenAt: isOnline ? new Date() : cam.lastSeenAt,
          streamRegistered: isOnline
        }).catch(() => {});
      }
    }

    const go2rtcOnline = Object.keys(go2rtcStreams).length > 0;

    res.json({
      success: true,
      data: {
        cameras: statuses,
        go2rtcOnline,
        totalCameras: cameras.length,
        onlineCameras: statuses.filter(s => s.status === 'online').length,
        offlineCameras: statuses.filter(s => s.status !== 'online').length,
        activeRecordings: statuses.filter(s => s.recordingActive).length
      }
    });
  } catch (err) {
    console.error('[CCTV] getAllCamerasStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
