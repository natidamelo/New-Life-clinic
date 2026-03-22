// Debug middleware to see what's happening
const checkPermission = require('./middleware/checkPermission');

console.log('Testing checkPermission middleware...');
console.log('checkPermission function:', typeof checkPermission);
console.log('checkPermission result:', checkPermission('admin', 'reception'));
console.log('checkPermission result type:', typeof checkPermission('admin', 'reception'));

// Test if it returns a function
const middleware = checkPermission('admin', 'reception');
console.log('Middleware type:', typeof middleware);
console.log('Is function:', typeof middleware === 'function');
