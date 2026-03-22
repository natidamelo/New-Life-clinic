#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('==========================================');
console.log('Starting Clinic CMS Development Environment');
console.log('==========================================\n');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data', 'db');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[!] Created data/db directory');
}

// Function to check if port is in use
function isPortInUse(port) {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => {
                resolve(false);
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(true);
        });
    });
}

// Function to start a service
function startService(name, command, args, cwd = __dirname) {
    console.log(`[!] Starting ${name}...`);
    
    const child = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        shell: true,
        detached: false
    });
    
    child.on('error', (error) => {
        console.error(`[×] Failed to start ${name}:`, error.message);
    });
    
    return child;
}

async function main() {
    try {
        // Check ports
        const mongoPort = await isPortInUse(27017);
        const backendPort = await isPortInUse(5002);
        const frontendPort = await isPortInUse(5173);
        
        console.log(`MongoDB Port 27017: ${mongoPort ? 'In Use' : 'Available'}`);
        console.log(`Backend Port 5002: ${backendPort ? 'In Use' : 'Available'}`);
        console.log(`Frontend Port 5173: ${frontendPort ? 'In Use' : 'Available'}\n`);
        
        const services = [];
        
        // Start MongoDB if not running
        if (!mongoPort) {
            services.push(startService('MongoDB', 'mongod', ['--dbpath', './data/db', '--port', '27017']));
            // Wait a bit for MongoDB to start
            await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
            console.log('[✓] MongoDB is already running');
        }
        
        // Start Backend
        if (!backendPort) {
            services.push(startService('Backend Server', 'npm', ['start'], path.join(__dirname, 'backend')));
            // Wait for backend to initialize
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            console.log('[!] Backend port is already in use');
        }
        
        // Start Frontend
        if (!frontendPort) {
            services.push(startService('Frontend Server', 'npm', ['run', 'dev'], path.join(__dirname, 'frontend')));
        } else {
            console.log('[!] Frontend port is already in use');
        }
        
        // Get network IP dynamically
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        let networkIP = 'localhost';
        
        for (const name of Object.keys(networkInterfaces)) {
            for (const iface of networkInterfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
                    networkIP = iface.address;
                    break;
                }
            }
            if (networkIP !== 'localhost') break;
        }
        
        console.log('\n==========================================');
        console.log('All services are starting up!');
        console.log('==========================================\n');
        console.log('Access the application at:');
        console.log(`Frontend: http://localhost:5175 or http://${networkIP}:5175`);
        console.log(`Backend API: http://localhost:5002 or http://${networkIP}:5002`);
        console.log('MongoDB: mongodb://localhost:27017\n');
        console.log('💡 Use the network IP to access from other devices on your network\n');
        console.log('Press Ctrl+C to stop all services\n');
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n[!] Shutting down all services...');
            services.forEach(service => {
                if (service && !service.killed) {
                    service.kill('SIGTERM');
                }
            });
            process.exit(0);
        });
        
        // Keep the process alive
        process.stdin.resume();
        
    } catch (error) {
        console.error('[×] Error starting services:', error.message);
        process.exit(1);
    }
}

main(); 