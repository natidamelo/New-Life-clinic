const mongoose = require('mongoose');

async function verifyDatabase() {
  try {
    // Connect to the clinic-cms database
    const mongoUri = 'mongodb://localhost:27017/clinic-cms';
    console.log('🔗 Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB database:', mongoose.connection.name);
    console.log('');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections in clinic-cms database:');
    console.log('═'.repeat(60));
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count} documents`);
    }
    
    console.log('═'.repeat(60));
    console.log('');
    
    // Quick summary
    const usersCount = await mongoose.connection.db.collection('users').countDocuments().catch(() => 0);
    const patientsCount = await mongoose.connection.db.collection('patients').countDocuments().catch(() => 0);
    const invoicesCount = await mongoose.connection.db.collection('invoices').countDocuments().catch(() => 0);
    const inventoryCount = await mongoose.connection.db.collection('inventoryitems').countDocuments().catch(() => 0);
    
    console.log('📊 Quick Summary:');
    console.log(`   Users: ${usersCount}`);
    console.log(`   Patients: ${patientsCount}`);
    console.log(`   Invoices: ${invoicesCount}`);
    console.log(`   Inventory Items: ${inventoryCount}`);
    console.log('');
    
    if (usersCount === 0 && patientsCount === 0 && invoicesCount === 0) {
      console.log('⚠️  WARNING: Database appears to be empty!');
      console.log('   You may need to:');
      console.log('   1. Import data from a backup');
      console.log('   2. Run setup scripts to create initial data');
      console.log('   3. Check if you were using a different database name');
    } else {
      console.log('✅ Database contains data and is ready to use!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Make sure MongoDB is running');
    console.error('   2. Check if the database name is correct');
    console.error('   3. Verify MongoDB connection settings');
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('🔌 Disconnected from MongoDB');
  }
}

verifyDatabase();











