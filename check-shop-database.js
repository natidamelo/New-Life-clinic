const mongoose = require('mongoose');

console.log('========================================');
console.log('  Checking ALL Local Databases');
console.log('========================================\n');

async function checkAllDatabases() {
  try {
    // Connect to MongoDB server
    await mongoose.connect('mongodb://localhost:27017', {
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ Connected to MongoDB Server\n');

    // Get admin database
    const adminDb = mongoose.connection.db.admin();
    
    // List all databases
    const { databases } = await adminDb.listDatabases();
    
    console.log('📊 ALL DATABASES FOUND:');
    console.log('='.repeat(80) + '\n');
    
    // Process each database
    for (const db of databases) {
      const sizeMB = (db.sizeOnDisk / (1024 * 1024)).toFixed(2);
      console.log(`\n📁 Database: ${db.name}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Empty: ${db.empty ? 'Yes' : 'No'}`);
      
      // Skip system databases for detailed check
      if (!['admin', 'config', 'local'].includes(db.name)) {
        try {
          // Connect to this database
          const connection = mongoose.createConnection(`mongodb://localhost:27017/${db.name}`);
          await connection.asPromise();
          
          // Get collections
          const collections = await connection.db.listCollections().toArray();
          
          if (collections.length > 0) {
            console.log(`   Collections (${collections.length}):`);
            
            // Show first 10 collections
            const displayCollections = collections.slice(0, 10);
            for (const col of displayCollections) {
              // Get count for this collection
              try {
                const count = await connection.db.collection(col.name).countDocuments();
                console.log(`      - ${col.name} (${count} documents)`);
              } catch (err) {
                console.log(`      - ${col.name}`);
              }
            }
            
            if (collections.length > 10) {
              console.log(`      ... and ${collections.length - 10} more collections`);
            }
          } else {
            console.log(`   Collections: None`);
          }
          
          await connection.close();
        } catch (err) {
          console.log(`   Error reading collections: ${err.message}`);
        }
      } else {
        console.log(`   Type: System Database`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 SEARCHING FOR SPECIFIC DATABASE NAMES...\n');
    
    // Check for specific database names
    const searchTerms = ['shop', 'clinic', 'management', 'cms', 'store', 'inventory'];
    const foundDatabases = databases.filter(db => 
      searchTerms.some(term => db.name.toLowerCase().includes(term))
    );
    
    if (foundDatabases.length > 0) {
      console.log('✅ Found databases matching search terms:');
      foundDatabases.forEach(db => {
        const sizeMB = (db.sizeOnDisk / (1024 * 1024)).toFixed(2);
        console.log(`   - ${db.name} (${sizeMB} MB)`);
      });
    } else {
      console.log('❌ No databases found matching: shop, clinic, management, cms, store, inventory');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 SUMMARY:');
    console.log(`   Total Databases: ${databases.length}`);
    console.log(`   System Databases: 3 (admin, config, local)`);
    console.log(`   User Databases: ${databases.length - 3}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Check Complete!\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

checkAllDatabases();










