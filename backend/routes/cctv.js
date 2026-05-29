const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/cctvMiddleware');
const cctvController = require('../controllers/cctvController');

// ─────────────────────────────────────────────
// All CCTV routes require: valid JWT + admin role
// ─────────────────────────────────────────────

// Camera CRUD
router.get('/cameras', auth, adminOnly, cctvController.getCameras);
router.post('/cameras', auth, adminOnly, cctvController.addCamera);
router.put('/cameras/:id', auth, adminOnly, cctvController.editCamera);
router.delete('/cameras/:id', auth, adminOnly, cctvController.deleteCamera);

// Stream
router.get('/cameras/:id/stream', auth, adminOnly, cctvController.getStreamUrl);
router.get('/cameras/:id/status', auth, adminOnly, cctvController.getCameraStatus);
router.post('/cameras/:id/status/check', auth, adminOnly, cctvController.checkCameraStatus);

// Recording
router.post('/cameras/:id/recording/start', auth, adminOnly, cctvController.startRecording);
router.post('/cameras/:id/recording/stop', auth, adminOnly, cctvController.stopRecording);
router.get('/recordings', auth, adminOnly, cctvController.getRecordings);
router.delete('/recordings/:recordingId', auth, adminOnly, cctvController.deleteRecording);

// Events / motion log
router.get('/events', auth, adminOnly, cctvController.getEvents);
router.post('/events/:eventId/acknowledge', auth, adminOnly, cctvController.acknowledgeEvent);

// Overall status (all cameras)
router.get('/status', auth, adminOnly, cctvController.getAllCamerasStatus);

module.exports = router;
