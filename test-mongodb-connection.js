const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...\n');

const mongoURI = 'mongodb://localhost:27017/clinic-cms';

async function testConnection() {
  try {
    console.log(`📡 Connecting to: ${mongoURI}`);
    console.log('⏳ Please wait...\n');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ SUCCESS! MongoDB is connected!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔢 Port: ${mongoose.connection.port}`);
    console.log(`📊 Connection state: ${['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]}\n`);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Collections in database (${collections.length}):`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    console.log('\n🎉 MongoDB is ready for your application!');
    
  } catch (error) {
    console.error('\n❌ FAILED to connect to MongoDB');
    console.error(`❌ Error: ${error.message}\n`);
    console.error('📋 Troubleshooting steps:');
    console.error('   1. Make sure MongoDB service is running');
    console.error('   2. Run "start-mongodb.bat" as Administrator');
    console.error('   3. Or manually start from services.msc');
    console.error('   4. Verify MongoDB is installed at the default port 27017\n');
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testConnection();









