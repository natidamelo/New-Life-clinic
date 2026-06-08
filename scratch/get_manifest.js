const net = require('net');

const client = new net.Socket();
console.log('Connecting to 192.168.1.2 on port 554...');

client.setTimeout(5000);

client.connect(554, '192.168.1.2', () => {
  console.log('✅ Connection SUCCESSFUL! Port 554 is OPEN.');
  client.destroy();
});

client.on('error', (err) => {
  console.error('❌ Connection FAILED:', err.message);
});

client.on('timeout', () => {
  console.error('❌ Connection TIMED OUT.');
  client.destroy();
});
