const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @route   GET /api/health-check
 * @desc    Check API and database health
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    
    // Get server status
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);
    
    // Format response
    const response = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      server: {
        uptime: uptimeFormatted,
        uptimeSeconds: uptime,
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: getConnectionStatusText(dbStatus),
        statusCode: dbStatus,
        connected: dbStatus === 1
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health-check/simple
 * @desc    Simple ping endpoint that always returns 200 OK
 * @access  Public
 */
router.get('/simple', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API is running'
  });
});

/**
 * @route   GET /api/health-check/ping
 * @desc    Ultra simple ping endpoint that requires no DB checks
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString()
  });
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

/**
 * Convert MongoDB connection status code to text
 */
function getConnectionStatusText(status) {
  switch (status) {
    case 0: return 'Disconnected';
    case 1: return 'Connected';
    case 2: return 'Connecting';
    case 3: return 'Disconnecting';
    default: return 'Unknown';
  }
}

module.exports = router; 
