#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PORT = process.env.PORT || 5002;
const PID_FILE = path.join(__dirname, 'server.pid');
const LOG_FILE = path.join(__dirname, 'server.log');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  const timestamp = new Date().toISOString();
  const coloredMessage = `${colors[color]}${message}${colors.reset}`;
  console.log(`[${timestamp}] ${coloredMessage}`);
  
  // Also write to log file
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
};

// Check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true))
          .close();
      })
      .listen(port, '0.0.0.0');
  });
};

// Check if server is already running
const isServerRunning = async () => {
  try {
    // Check PID file
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
      
      try {
        // Check if process exists
        process.kill(pid, 0);
        
        // Check if port is in use
        const portInUse = !(await isPortAvailable(PORT));
        
        if (portInUse) {
          log(`⚠️  Server already running with PID ${pid} on port ${PORT}`, 'yellow');
          return { running: true, pid, portInUse: true };
        } else {
          log(`⚠️  PID ${pid} exists but port ${PORT} is free. Cleaning up...`, 'yellow');
          fs.unlinkSync(PID_FILE);
          return { running: false, pid: null, portInUse: false };
        }
      } catch (error) {
        // Process doesn't exist, clean up PID file
        log(`🧹 Cleaning up stale PID file for non-existent process ${pid}`, 'yellow');
        fs.unlinkSync(PID_FILE);
        return { running: false, pid: null, portInUse: false };
      }
    }
    
    // Check if port is in use by another process
    const portInUse = !(await isPortAvailable(PORT));
    if (portInUse) {
      log(`❌ Port ${PORT} is already in use by another process`, 'red');
      return { running: false, pid: null, portInUse: true };
    }
    
    return { running: false, pid: null, portInUse: false };
  } catch (error) {
    log(`❌ Error checking server status: ${error.message}`, 'red');
    return { running: false, pid: null, portInUse: false };
  }
};

// Kill existing server process
const killServer = async (pid) => {
  try {
    log(`🛑 Stopping server with PID ${pid}...`, 'yellow');
    
    // Try graceful shutdown first
    process.kill(pid, 'SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Force kill if still running
    try {
      process.kill(pid, 'SIGKILL');
      log(`💀 Force killed process ${pid}`, 'red');
    } catch (error) {
      // Process already terminated
    }
    
    // Clean up PID file
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    
    log(`✅ Server stopped successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error stopping server: ${error.message}`, 'red');
    return false;
  }
};

// Start server
const startServer = async () => {
  try {
    log('🚀 Starting Clinic CMS Backend Server...', 'cyan');
    
    // Check current status
    const status = await isServerRunning();
    
    if (status.running) {
      log(`⚠️  Server is already running with PID ${status.pid}`, 'yellow');
      log('💡 Use "npm run stop" to stop the server', 'cyan');
      return;
    }
    
    if (status.portInUse) {
      log(`❌ Port ${PORT} is already in use`, 'red');
      log('💡 Please stop the process using port 5002 or use a different port', 'cyan');
      return;
    }
    
    // Start server process
    log('🔧 Spawning server process...', 'blue');
    const serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });
    
    // Write PID to file
    fs.writeFileSync(PID_FILE, serverProcess.pid.toString());
    log(`📝 Server PID ${serverProcess.pid} written to ${PID_FILE}`, 'green');
    
    // Handle server output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(`📤 ${output}`, 'green');
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(`❌ ${output}`, 'red');
      }
    });
    
    // Handle process exit
    serverProcess.on('exit', (code, signal) => {
      log(`🔄 Server process exited with code ${code} and signal ${signal}`, 'yellow');
      
      // Clean up PID file
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      
      if (code !== 0) {
        log('❌ Server crashed. Check logs for details.', 'red');
        process.exit(1);
      }
    });
    
    // Handle process errors
    serverProcess.on('error', (error) => {
      log(`❌ Failed to start server: ${error.message}`, 'red');
      
      // Clean up PID file
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      
      process.exit(1);
    });
    
    // Wait for server to start
    log('⏳ Waiting for server to start...', 'yellow');
    
    // Check if server started successfully
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    const checkServer = async () => {
      attempts++;
      
      try {
        const portAvailable = await isPortAvailable(PORT);
        if (!portAvailable) {
          log(`✅ Server is running on port ${PORT}`, 'green');
          log('🎉 Server started successfully!', 'green');
          log(`📱 API available at: http://localhost:${PORT}/api`, 'cyan');
          log(`📊 Monitor logs at: ${LOG_FILE}`, 'cyan');
          return;
        }
      } catch (error) {
        // Continue checking
      }
      
      if (attempts >= maxAttempts) {
        log('❌ Server failed to start within 30 seconds', 'red');
        serverProcess.kill('SIGKILL');
        process.exit(1);
      }
      
      setTimeout(checkServer, 1000);
    };
    
    setTimeout(checkServer, 2000);
    
  } catch (error) {
    log(`❌ Error starting server: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Stop server
const stopServer = async () => {
  try {
    log('🛑 Stopping Clinic CMS Backend Server...', 'yellow');
    
    const status = await isServerRunning();
    
    if (!status.running) {
      log('ℹ️  Server is not running', 'blue');
      return;
    }
    
    if (status.pid) {
      await killServer(status.pid);
    }
    
  } catch (error) {
    log(`❌ Error stopping server: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Show server status
const showStatus = async () => {
  try {
    const status = await isServerRunning();
    
    if (status.running) {
      log(`✅ Server is running with PID ${status.pid} on port ${PORT}`, 'green');
      log(`📱 API available at: http://localhost:${PORT}/api`, 'cyan');
    } else {
      log('❌ Server is not running', 'red');
    }
    
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      log(`📊 Log file: ${LOG_FILE} (${(stats.size / 1024).toFixed(2)} KB)`, 'blue');
    }
    
  } catch (error) {
    log(`❌ Error checking status: ${error.message}`, 'red');
  }
};

// Main execution
const command = process.argv[2];

switch (command) {
  case 'start':
    startServer();
    break;
  case 'stop':
    stopServer();
    break;
  case 'status':
    showStatus();
    break;
  case 'restart':
    stopServer().then(() => {
      setTimeout(startServer, 2000);
    });
    break;
  default:
    log('🚀 Clinic CMS Backend Server Manager', 'cyan');
    log('', 'reset');
    log('Usage:', 'bright');
    log('  node start-server.js start    - Start the server', 'reset');
    log('  node start-server.js stop     - Stop the server', 'reset');
    log('  node start-server.js status   - Show server status', 'reset');
    log('  node start-server.js restart  - Restart the server', 'reset');
    log('', 'reset');
    log('Examples:', 'bright');
    log('  node start-server.js start', 'reset');
    log('  node start-server.js status', 'reset');
    log('  node start-server.js stop', 'reset');
    break;
}
