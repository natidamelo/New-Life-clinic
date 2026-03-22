const mongoose = require('mongoose');

console.log('========================================');
console.log('  MongoDB Database Check');
console.log('========================================\n');

async function checkDatabases() {
  try {
    // Connect to MongoDB (without specifying a database)
    await mongoose.connect('mongodb://localhost:27017', {
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ Connected to MongoDB Server\n');

    // Get admin database
    const adminDb = mongoose.connection.db.admin();
    
    // List all databases
    const { databases } = await adminDb.listDatabases();
    
    console.log('📊 ALL DATABASES ON SERVER:');
    console.log('─'.repeat(60));
    
    let clinicDatabases = [];
    
    databases.forEach((db, index) => {
      const sizeMB = (db.sizeOnDisk / (1024 * 1024)).toFixed(2);
      console.log(`\n${index + 1}. Database: ${db.name}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Empty: ${db.empty ? 'Yes' : 'No'}`);
      
      // Check if it's a clinic-related database
      if (db.name.toLowerCase().includes('clinic') || 
          db.name.toLowerCase().includes('management') ||
          db.name.toLowerCase().includes('cms')) {
        clinicDatabases.push(db.name);
      }
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log(`\n📋 Total Databases: ${databases.length}`);
    
    if (clinicDatabases.length > 0) {
      console.log('\n🏥 CLINIC-RELATED DATABASES FOUND:');
      clinicDatabases.forEach(name => console.log(`   ✓ ${name}`));
    }
    
    // Now check what database the project is configured to use
    console.log('\n' + '='.repeat(60));
    console.log('🔍 PROJECT CONFIGURATION CHECK');
    console.log('='.repeat(60) + '\n');
    
    // Read .env file
    require('dotenv').config();
    const configuredUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    
    console.log('Connection String from .env:');
    console.log(`   ${configuredUri}\n`);
    
    // Extract database name from URI
    const dbMatch = configuredUri.match(/\/([^/?]+)(\?|$)/);
    const configuredDb = dbMatch ? dbMatch[1] : 'Not specified';
    
    console.log(`Database your project uses: ${configuredDb}`);
    
    // Check if this database exists
    const dbExists = databases.find(db => db.name === configuredDb);
    
    if (dbExists) {
      console.log(`✅ Database "${configuredDb}" EXISTS on server\n`);
      
      // Connect to that specific database and show collections
      await mongoose.connection.close();
      await mongoose.connect(configuredUri);
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      console.log(`📁 Collections in "${configuredDb}":`);
      console.log('─'.repeat(60));
      collections.forEach((col, idx) => {
        console.log(`   ${idx + 1}. ${col.name}`);
      });
      console.log(`\n   Total: ${collections.length} collections`);
      
      // Get some statistics
      const stats = await mongoose.connection.db.stats();
      console.log('\n📊 Database Statistics:');
      console.log(`   Storage Size: ${(stats.storageSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`   Data Size: ${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`   Collections: ${stats.collections}`);
      console.log(`   Documents: ${stats.objects}`);
      
    } else {
      console.log(`❌ Database "${configuredDb}" DOES NOT EXIST on server`);
      console.log('   Your project may create it when it first runs.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Check Complete!');
    console.log('='.repeat(60) + '\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

checkDatabases();










