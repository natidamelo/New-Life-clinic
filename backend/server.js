const createApp = require('./app');
const mongoose = require('mongoose');
const { initializeDefaultCardTypes } = require('./controllers/cardTypeController');
const attendanceMonitor = require('./services/attendanceMonitor');
const AbsenceDetectionService = require('./services/absenceDetectionService');
const scheduledOvertimeJob = require('./services/scheduledOvertimeJob');
const telegramService = require('./services/telegramService');
const dailyRevenueService = require('./services/dailyRevenueService');
const autoInventoryDeductionMonitor = require('./services/autoInventoryDeductionMonitor');
const patientStatusSyncService = require('./services/patientStatusSyncService');
const { bootstrapSuperAdmin } = require('./services/superAdminBootstrapService');
const net = require('net');
require('dotenv').config();

const PORT = process.env.PORT || 5002;
let server = null;
let isShuttingDown = false;

// Function to check if port is available
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

// Function to find an available port
const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
    port++;
    if (port > startPort + 100) {
      throw new Error('No available ports found');
    }
  }
  return port;
};

// Function to get current network IP
const getNetworkIP = () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  
  // Try to find a private network IPv4 address (not localhost)
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal, non-IPv4, and link-local addresses
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Function to kill process using a port (Windows)
const killProcessOnPort = (port) => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(false);
      return;
    }
    
    const { exec } = require('child_process');
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve(false);
        return;
      }
      
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
      }
      
      if (pids.size === 0) {
        resolve(false);
        return;
      }
      
      console.log(`🔍 Found ${pids.size} process(es) using port ${port}`);
      let killed = 0;
      
      for (const pid of pids) {
        exec(`taskkill /PID ${pid} /F`, (killError) => {
          if (!killError) {
            killed++;
            console.log(`✅ Killed process ${pid} using port ${port}`);
          }
          if (killed === pids.size) {
            // Wait a bit for port to be released
            setTimeout(() => resolve(killed > 0), 1000);
          }
        });
      }
    });
  });
};

// Function to start server
const startServer = async (dbConnected) => {
  try {
    let availablePort = PORT;
    
    // Check if port is available, if not try to kill existing process or find alternative
    if (!(await isPortAvailable(availablePort))) {
      console.log(`⚠️  Port ${availablePort} is already in use`);
      console.log('🔄 Attempting to free the port...');
      
      const killed = await killProcessOnPort(availablePort);
      
      if (killed) {
        console.log('✅ Port freed, waiting for it to be released...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Check again after attempting to kill
      if (!(await isPortAvailable(availablePort))) {
        console.log('⚠️  Port still in use, finding alternative port...');
        availablePort = await findAvailablePort(availablePort);
        console.log(`✅ Using alternative port: ${availablePort}`);
        console.log(`⚠️  WARNING: Frontend may need to be updated to use port ${availablePort}`);
      }
    }
    
    // Create and start server
    const app = createApp();
    server = app.listen(availablePort, '0.0.0.0', () => {
      const networkIP = getNetworkIP();
      console.log(`🚀 Server is running on port ${availablePort}`);
      console.log(`🌐 Server accessible at: http://localhost:${availablePort}`);
      console.log(`🌐 Network accessible at: http://${networkIP}:${availablePort}`);
      console.log(`📱 API endpoints available at: http://localhost:${availablePort}/api`);
      console.log(`📱 Network API endpoints: http://${networkIP}:${availablePort}/api`);
      console.log(`\n💡 Frontend should be accessed at: http://${networkIP}:5175`);
      
      // Start services after server is ready
      startServices(dbConnected);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${availablePort} is still in use after cleanup attempt`);
        console.error('❌ Please manually kill the process using this port or restart your computer');
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Function to start all services
const startServices = async (dbConnected) => {
  try {
    if (!dbConnected) {
      console.log(
        '⚠️  MongoDB not connected — skipping background jobs (attendance, revenue, sync, overtime, inventory). Add MONGODB_URI on Render.'
      );
      return;
    }

    // Initialize Telegram service
    console.log('📱 Initializing Telegram notification service...');
    const telegramInitialized = await telegramService.initialize();
    if (telegramInitialized) {
      console.log('✅ Telegram service initialized successfully');
    } else {
      console.log('⚠️ Telegram service not configured or initialization failed');
    }

    // Start daily revenue service
    console.log('💰 Starting daily revenue tracking...');
    await dailyRevenueService.start();
    console.log('✅ Daily revenue service started successfully');

    // Start attendance monitoring
    console.log('🔄 Starting attendance monitoring...');
    attendanceMonitor.startMonitoring();
    console.log('✅ Attendance monitoring started successfully');

    // Start absence detection monitoring
    console.log('🔍 Starting absence detection monitoring...');
    setInterval(async () => {
      try {
        const result = await AbsenceDetectionService.checkAndMarkAbsentUsers();
        if (result.absentCount > 0) {
          console.log(`✅ Absence detection: Marked ${result.absentCount} users as absent`);
        }
      } catch (error) {
        console.error('❌ Error in absence detection monitoring:', error);
      }
    }, 30 * 60 * 1000); // Check every 30 minutes
    console.log('✅ Absence detection monitoring started successfully');
    
    // Start scheduled overtime job
    console.log('🕐 Starting scheduled overtime transition job...');
    scheduledOvertimeJob.start();
    console.log('✅ Scheduled overtime job started successfully');
    
    // Start medication pricing monitor
    console.log('💰 Starting medication pricing monitor...');
    console.log('✅ Medication pricing monitor started successfully');
    
    // Start automatic inventory deduction monitor (ROOT CAUSE FIX)
    console.log('🔧 Starting automatic inventory deduction monitor...');
    await autoInventoryDeductionMonitor.start();
    console.log('✅ Automatic inventory deduction monitor started successfully');
    
    // Start patient status sync service (ENSURES FINALIZED PATIENTS ARE MARKED COMPLETED)
    console.log('🔄 Starting patient status sync service...');
    patientStatusSyncService.start();
    console.log('✅ Patient status sync service started successfully');
    
    console.log('🎉 All startup services completed successfully');
    
  } catch (error) {
    console.error('❌ Error starting services:', error);
    console.log('🔄 Continuing with basic server functionality...');
  }
};

// Function to gracefully shutdown server
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('🔄 Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}, shutting down server gracefully...`);
  
  try {
    // Stop all services
    console.log('🛑 Stopping attendance monitoring...');
    attendanceMonitor.stopMonitoring();

    console.log('🛑 Stopping scheduled overtime job...');
    scheduledOvertimeJob.stop();
    
    console.log('🛑 Stopping automatic inventory deduction monitor...');
    autoInventoryDeductionMonitor.stop();
    
    console.log('🛑 Stopping patient status sync service...');
    patientStatusSyncService.stop();

    console.log('🛑 Telegram service cleanup completed');
    
    // Close server
    if (server) {
      console.log('🛑 Closing server...');
      server.close(() => {
        console.log('✅ Server closed successfully');
      });
    }
    
    // Close database connection
    console.log('🛑 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    console.log('✅ Server shutdown complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

/** Log which env var supplied the URI; never log passwords. */
const mongoUriSource = () => {
  if (process.env.MONGODB_URI) return 'MONGODB_URI';
  if (process.env.MONGO_URI) return 'MONGO_URI';
  return 'default localhost fallback';
};

const maskMongoUri = (uri) =>
  typeof uri === 'string' ? uri.replace(/:([^:@/]+)@/, ':***@') : '';

// Connect to MongoDB and start server
const connectDB = async () => {
  // Atlas / Render typically use MONGODB_URI; local .env often uses MONGO_URI
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

  mongoose.set('bufferCommands', false);

  const opts = {
    // Atlas + Render cold start often needs >5s to pick a server
    serverSelectionTimeoutMS: 60000,   // 60s to find a server
    connectTimeoutMS: 30000,           // 30s to establish TCP
    socketTimeoutMS: 60000,            // 60s idle socket timeout
    heartbeatFrequencyMS: 10000,       // Ping Atlas every 10s (keeps connection alive)
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,                    // Keep at least 2 connections alive
    retryWrites: true,
    retryReads: true,
  };

  const attempts = 5;   // Increased from 3
  const delayMs = 5000; // 5s between retries

  console.log(`📦 MongoDB config: using ${mongoUriSource()} → ${maskMongoUri(mongoURI)}`);

  // Auto-reconnect if the connection drops after initial connect
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect in 5s...');
    setTimeout(async () => {
      try {
        await mongoose.connect(mongoURI, opts);
        console.log('✅ MongoDB reconnected successfully');
      } catch (err) {
        console.error('❌ MongoDB reconnection failed:', err.message);
      }
    }, 5000);
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  for (let i = 1; i <= attempts; i++) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(mongoURI, opts);
      console.log('✅ Connected to MongoDB');

      try {
        await initializeDefaultCardTypes();
        console.log('✅ Default card types initialization completed');
      } catch (err) {
        console.error('❌ Default card types initialization failed:', err.message);
      }

      try {
        await bootstrapSuperAdmin();
      } catch (err) {
        console.error('❌ Super admin bootstrap failed:', err.message);
      }

      return true;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${i}/${attempts}:`, error.message);
      if (i < attempts) {
        console.error(`   Retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  console.error('⚠️  Server will start but database features will not work');
  console.error('   Fix: set MONGODB_URI on Render (Atlas connection string). Special chars in the password must be URL-encoded.');
  console.error('   Verify: Atlas user has read/write to the DB; Network Access allows 0.0.0.0/0 or Render egress.');
  mongoose.set('bufferCommands', false);
  return false;
};

// Start server regardless of DB connection status
(async () => {
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.log('⚠️  Starting server without database connection...');
  }
  startServer(dbConnected);
})();

// Enhanced error handling to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('❌ Stack trace:', error.stack);
  
  // Don't exit immediately for non-critical errors
  if (error.code === 'EADDRINUSE' || error.code === 'ECONNRESET') {
    console.log('🔄 Attempting to recover from connection error...');
  } else {
    console.log('🔄 Attempting to continue server operation...');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Attempting to continue server operation...');
});

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

// Handle Windows specific signals
if (process.platform === 'win32') {
  process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));
}

// Keep process alive
process.stdin.resume();

console.log('🚀 Starting Clinic CMS Backend Server...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Node version:', process.version);
console.log('💾 Memory usage:', process.memoryUsage());
