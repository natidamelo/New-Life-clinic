const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoConnection() {
  try {
    // Try multiple connection strings
    const connectionStrings = [
      process.env.MONGODB_URI,
      'mongodb://localhost:27017/clinic-cms',
      'mongodb://localhost:27017/newlifeclinic'
    ].filter(Boolean);

    for (const uri of connectionStrings) {
      console.log(`🔍 Attempting to connect to: ${uri}`);
      
      try {
        await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        
        console.log(`✅ Successfully connected to: ${uri}`);
        
        // List databases
        const admin = mongoose.connection.db.admin();
        const databaseList = await admin.listDatabases();
        console.log('📊 Available Databases:');
        databaseList.databases.forEach(db => {
          console.log(`   - ${db.name}`);
        });

        // List collections in the current database
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 Collections:');
        collections.forEach(collection => {
          console.log(`   - ${collection.name}`);
        });

        // Disconnect
        await mongoose.disconnect();
        console.log('🔌 Disconnected successfully');
        
        return;
      } catch (connectionError) {
        console.error(`❌ Connection failed to ${uri}:`, connectionError.message);
      }
    }

    console.error('❌ Could not connect to any database');
  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

testMongoConnection();
