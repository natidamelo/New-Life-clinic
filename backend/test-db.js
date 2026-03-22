const mongoose = require('mongoose');

async function testDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('🔗 Connecting to:', uri);

    await mongoose.connect(uri);
    console.log('✅ Connected successfully');

    const db = mongoose.connection.db;
    console.log('📂 Current database:', db.databaseName);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.length);

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }

    // Check if patients collection exists and has data
    if (collections.some(col => col.name === 'patients')) {
      const patients = await db.collection('patients').find({}).limit(3).toArray();
      console.log('👥 Sample patients:');
      patients.forEach(p => {
        console.log(`  - ${p.firstName} ${p.lastName} (ID: ${p._id})`);
      });
    }

    await mongoose.connection.close();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDB();
