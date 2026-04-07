const net = require('net');

const host = 'ac-arihtqu-shard-00-01.je5wyyt.mongodb.net';
const port = 27017;
const socket = new net.Socket();

console.log(`Connecting to ${host}:${port}...`);

socket.setTimeout(5000);

socket.on('connect', () => {
    console.log('✅ TCP Connection successful!');
    socket.destroy();
    process.exit(0);
});

socket.on('timeout', () => {
    console.log('❌ TCP Connection timed out!');
    socket.destroy();
    process.exit(1);
});

socket.on('error', (err) => {
    console.log('❌ TCP Connection error:', err.message);
    process.exit(1);
});

socket.connect(port, host);
