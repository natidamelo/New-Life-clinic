const mongoose = require('mongoose');

/**
 * Database connection with transaction support
 * Connects to MongoDB replica set
 */

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_db';
    
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Recommended settings for replica sets
      retryWrites: true,
      w: 'majority',
      readPreference: 'primary',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Check if connected to a replica set
    const admin = conn.connection.db.admin();
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log(`✅ Replica Set: ${status.set} (${status.members.length} members)`);
      console.log(`✅ Transactions: ENABLED`);
      
      // Show member states
      const members = status.members.map(m => ({
        host: m.name,
        state: m.stateStr,
        health: m.health === 1 ? 'OK' : 'UNHEALTHY'
      }));
      console.log('📋 Members:', members);
      
    } catch (error) {
      if (error.codeName === 'CommandNotFound' || error.message.includes('not running with --replSet')) {
        console.warn('⚠️  WARNING: Not connected to a replica set');
        console.warn('⚠️  Transactions will NOT work');
        console.warn('⚠️  See MONGODB_REPLICA_SET_SETUP.md for setup instructions');
      }
    }

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check MONGODB_URI in your .env file');
    console.error('   2. Ensure MongoDB is running');
    console.error('   3. For replica set: See MONGODB_REPLICA_SET_SETUP.md');
    console.error('');
    process.exit(1);
  }
};

/**
 * Helper function to check if transactions are available
 */
const areTransactionsAvailable = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    await admin.command({ replSetGetStatus: 1 });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Execute a function within a transaction (if available)
 * Falls back to non-transactional execution if replica set not available
 */
const withTransaction = async (fn) => {
  const transactionsAvailable = await areTransactionsAvailable();
  
  if (transactionsAvailable) {
    // Use transactions
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await fn(session);
      await session.commitTransaction();
      session.endSession();
      return { success: true, result, usedTransaction: true };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } else {
    // Fallback: execute without transaction
    console.warn('⚠️  Executing without transaction (replica set not available)');
    const result = await fn(null);
    return { success: true, result, usedTransaction: false };
  }
};

module.exports = { connectDB, areTransactionsAvailable, withTransaction };

