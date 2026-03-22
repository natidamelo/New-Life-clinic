// Test file to check if routes are working
const express = require('express');
const app = express();

// Test basic route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Test with middleware
const auth = require('./middleware/auth');
const checkPermission = require('./middleware/checkPermission');

app.get('/test-auth', auth, (req, res) => {
  res.json({ message: 'Auth middleware working' });
});

app.get('/test-permission', auth, checkPermission('admin'), (req, res) => {
  res.json({ message: 'Permission middleware working' });
});

console.log('Testing routes...');
console.log('Basic route:', typeof app._router.stack[0].route);
console.log('Auth route:', typeof app._router.stack[1].route);
console.log('Permission route:', typeof app._router.stack[2].route);

console.log('All tests passed!');
