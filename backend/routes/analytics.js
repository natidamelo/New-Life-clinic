const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const RouteUsage = require('../models/RouteUsage');

// Simple health check to verify router is mounted
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'analytics router active' });
});

// Ingest route usage events
router.post('/route-usage', auth, async (req, res) => {
  try {
    const { path, label, role, userId, action, durationMs, timestamp } = req.body || {};
    if (!path || !action) {
      return res.status(400).json({ success: false, message: 'path and action are required' });
    }

    const record = await RouteUsage.create({
      path,
      label,
      role: role || (req.user && req.user.role),
      userId: userId || (req.user && req.user.id),
      action,
      durationMs,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      userAgent: req.headers['user-agent'],
    });

    return res.json({ success: true, data: { id: record._id } });
  } catch (error) {
    console.error('Failed to save route usage event', error);
    return res.status(500).json({ success: false, message: 'Failed to save event' });
  }
});

// Basic workload summary per dashboard path
router.get('/route-usage/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate, role } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }
    if (role) {
      match.role = role;
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { path: '$path', role: '$role' },
          clicks: { $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] } },
          visits: { $sum: { $cond: [{ $eq: ['$action', 'enter'] }, 1, 0] } },
          totalDurationMs: { $sum: { $ifNull: ['$durationMs', 0] } },
          lastSeen: { $max: '$timestamp' },
        },
      },
      {
        $project: {
          _id: 0,
          path: '$_id.path',
          role: '$_id.role',
          clicks: 1,
          visits: 1,
          totalDurationMs: 1,
          avgDurationMs: {
            $cond: [{ $gt: ['$visits', 0] }, { $divide: ['$totalDurationMs', '$visits'] }, 0],
          },
          lastSeen: 1,
        },
      },
      { $sort: { visits: -1 } },
    ];

    const summary = await RouteUsage.aggregate(pipeline);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Failed to build workload summary', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

// Chart-friendly: time-series usage by interval (day/week/month), optionally filtered by path/role
router.get('/route-usage/timeseries', auth, async (req, res) => {
  try {
    const { startDate, endDate, role, path, interval = 'day', limit } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }
    if (role) match.role = role;
    if (path) match.path = path;

    // Determine date truncation unit
    const unit = interval === 'month' ? 'month' : interval === 'week' ? 'week' : 'day';

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            bucket: { $dateTrunc: { date: '$timestamp', unit } },
          },
          clicks: { $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] } },
          visits: { $sum: { $cond: [{ $eq: ['$action', 'enter'] }, 1, 0] } },
          totalDurationMs: { $sum: { $ifNull: ['$durationMs', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          bucket: '$_id.bucket',
          clicks: 1,
          visits: 1,
          totalDurationMs: 1,
          avgDurationMs: {
            $cond: [{ $gt: ['$visits', 0] }, { $divide: ['$totalDurationMs', '$visits'] }, 0],
          },
        },
      },
      { $sort: { bucket: 1 } },
    ];

    if (limit) {
      pipeline.push({ $limit: Number(limit) });
    }

    const data = await RouteUsage.aggregate(pipeline);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to build workload timeseries', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch timeseries' });
  }
});

// Chart-friendly: top breakdowns by path or user for admin dashboards
router.get('/route-usage/top', auth, async (req, res) => {
  try {
    const { startDate, endDate, role, by = 'path', limit = 10 } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }
    if (role) match.role = role;

    const groupId = by === 'user' ? '$userId' : '$path';
    const labelField = by === 'user' ? 'userId' : 'path';

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: groupId,
          clicks: { $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] } },
          visits: { $sum: { $cond: [{ $eq: ['$action', 'enter'] }, 1, 0] } },
          totalDurationMs: { $sum: { $ifNull: ['$durationMs', 0] } },
          lastSeen: { $max: '$timestamp' },
        },
      },
      {
        $project: {
          _id: 0,
          [labelField]: '$_id',
          clicks: 1,
          visits: 1,
          totalDurationMs: 1,
          avgDurationMs: {
            $cond: [{ $gt: ['$visits', 0] }, { $divide: ['$totalDurationMs', '$visits'] }, 0],
          },
          lastSeen: 1,
        },
      },
      { $sort: { visits: -1 } },
      { $limit: Number(limit) },
    ];

    const data = await RouteUsage.aggregate(pipeline);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to build top workload breakdown', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch top breakdown' });
  }
});

module.exports = router;


