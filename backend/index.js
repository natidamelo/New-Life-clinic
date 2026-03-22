const createApp = require('./app');
const { connectDB } = require('./config/db');
const config = require('./config');
const { logger } = require('./middleware/errorHandler');
const { cache } = require('./middleware/cacheMiddleware');
const mongoose = require('mongoose');

/**
 * Pre-warm the dashboard cache so the first user after server start
 * doesn't wait for cold database queries.
 */
async function prewarmDashboardCache() {
  try {
    const Patient = require('./models/Patient');
    const User = require('./models/User');
    const NurseTask = require('./models/NurseTask');
    const LabOrder = require('./models/LabOrder');
    const MedicalInvoice = require('./models/MedicalInvoice');
    const Notification = require('./models/Notification');
    const Appointment = require('./models/Appointment');

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const [
      totalPatients, totalStaff, pendingTasks, pendingLabTests,
      completedLabTests, activeNotifications, totalAppointments,
      todayRevenueResult, totalRevenueResult
    ] = await Promise.all([
      Patient.countDocuments(),
      User.countDocuments({ role: { $ne: 'patient' } }),
      NurseTask.countDocuments({ status: 'pending' }),
      LabOrder.countDocuments({ status: 'pending' }),
      LabOrder.countDocuments({ status: 'completed' }),
      Notification.countDocuments({ status: 'active', read: false }),
      Appointment.countDocuments(),
      MedicalInvoice.aggregate([
        { $match: { issueDate: { $gte: startOfToday, $lte: endOfToday }, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      MedicalInvoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    const statsBody = JSON.stringify({
      success: true,
      data: {
        totalPatients, totalStaff, pendingTasks, pendingLabTests,
        completedLabTests,
        todayRevenue: todayRevenueResult[0]?.total || 0,
        totalRevenue: totalRevenueResult[0]?.total || 0,
        activeNotifications, totalAppointments, criticalAlerts: 0
      }
    });

    const TTL_SECONDS = 5 * 60; // 5 minutes
    const cachedEntry = { status: 200, headers: { 'content-type': 'application/json' }, body: statsBody };
    cache.set('/api/dashboard/universal-stats', cachedEntry, TTL_SECONDS);
    cache.set('/api/universal-stats', cachedEntry, TTL_SECONDS);

    logger.info('✅ Dashboard cache pre-warmed successfully');
  } catch (err) {
    logger.warn(`Dashboard cache pre-warm failed (non-critical): ${err.message}`);
  }
}

const PORT = 5002;

// Connect to database (non-blocking)
const startServer = async () => {
  try {
    // Start database connection (non-blocking - will retry automatically)
    connectDB().then(() => {
      // Pre-warm dashboard cache after DB connects
      prewarmDashboardCache();
    }).catch((err) => {
      logger.warn(`Initial MongoDB connection failed: ${err.message}`);
      logger.info('Server will start anyway. MongoDB connection will retry in background.');
      logger.info('Please ensure MongoDB is running for full functionality.');
    });
    
    // Create Express app
    const app = createApp();
    
    // Start server (even if DB connection hasn't completed yet)
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
      console.log(`Server running on http://localhost:${PORT}`);
      
      // Check database connection status
      const dbStatus = mongoose.connection.readyState;
      const dbStatusNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      logger.info(`Database status: ${dbStatusNames[dbStatus]}`);
      
      if (dbStatus !== 1) {
        logger.warn('⚠️  MongoDB is not connected yet. Some features may not work.');
        logger.warn('⚠️  The server will automatically connect when MongoDB becomes available.');
      }
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      console.error('UNHANDLED REJECTION! Shutting down...');
      console.error(err);
      
      // Close server & exit process
      server.close(() => process.exit(1));
    });
    
    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
      });
    });
    
    return server;
  } catch (error) {
    logger.error(`Server failed to start: ${error.message}`);
    console.error('Server failed to start:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { startServer }; 
