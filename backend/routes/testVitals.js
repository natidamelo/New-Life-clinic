const express = require('express');
const router = express.Router();

console.log('[TEST VITALS ROUTES] Loading test vitals routes...');

// Simple test route
router.get('/test', (req, res) => {
  console.log('[TEST VITALS ROUTES] Test endpoint hit successfully!');
  res.json({ 
    success: true, 
    message: 'Test vitals router is working!',
    timestamp: new Date().toISOString(),
    path: req.path,
    originalUrl: req.originalUrl
  });
});

router.get('/hello', (req, res) => {
  console.log('[TEST VITALS ROUTES] Hello endpoint hit');
  res.json({ 
    success: true, 
    message: 'Hello from test vitals!',
    timestamp: new Date().toISOString()
  });
});

console.log('[TEST VITALS ROUTES] Test vitals routes loaded successfully');

module.exports = router; 
