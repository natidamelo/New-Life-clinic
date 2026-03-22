const mongoose = require('mongoose');

console.log('========================================');
console.log('  DATABASE DATA INTEGRITY CHECK');
console.log('========================================\n');

async function checkDataIntegrity() {
  try {
    // Connect to clinic-cms database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms', {
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ Connected to clinic-cms database\n');
    
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    console.log('📊 CHECKING ALL COLLECTIONS FOR DATA:\n');
    console.log('='.repeat(80));
    
    let totalDocuments = 0;
    let collectionsWithData = [];
    let emptyCollections = [];
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      try {
        // Get document count
        const count = await collection.countDocuments();
        
        // Get collection stats
        const stats = await collection.stats();
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(4);
        const storageSizeMB = (stats.storageSize / (1024 * 1024)).toFixed(4);
        
        console.log(`\n📁 ${collectionName}`);
        console.log(`   Documents: ${count}`);
        console.log(`   Data Size: ${sizeMB} MB`);
        console.log(`   Storage Size: ${storageSizeMB} MB`);
        console.log(`   Indexes: ${stats.nindexes}`);
        
        totalDocuments += count;
        
        if (count > 0) {
          collectionsWithData.push(collectionName);
          
          // Get a sample document
          const sample = await collection.findOne();
          if (sample) {
            const fields = Object.keys(sample).slice(0, 5);
            console.log(`   Sample fields: ${fields.join(', ')}`);
          }
        } else {
          emptyCollections.push(collectionName);
        }
        
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Total Collections: ${collections.length}`);
    console.log(`Collections with data: ${collectionsWithData.length}`);
    console.log(`Empty collections: ${emptyCollections.length}`);
    console.log(`Total documents: ${totalDocuments}`);
    
    if (collectionsWithData.length > 0) {
      console.log('\n✅ Collections containing data:');
      collectionsWithData.forEach(name => console.log(`   - ${name}`));
    }
    
    if (emptyCollections.length > 0) {
      console.log('\n⚠️  Empty collections:');
      emptyCollections.forEach(name => console.log(`   - ${name}`));
    }
    
    // Check database stats
    console.log('\n' + '='.repeat(80));
    console.log('\n💾 DATABASE STORAGE INFO:\n');
    
    const dbStats = await db.stats();
    console.log(`Database: ${dbStats.db}`);
    console.log(`Collections: ${dbStats.collections}`);
    console.log(`Total Documents: ${dbStats.objects}`);
    console.log(`Data Size: ${(dbStats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Storage Size: ${(dbStats.storageSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Indexes: ${dbStats.indexes}`);
    console.log(`Index Size: ${(dbStats.indexSize / (1024 * 1024)).toFixed(2)} MB`);
    
    console.log('\n' + '='.repeat(80));
    
    // Check if data might be in a different database
    console.log('\n🔍 CHECKING FOR DATA IN OTHER DATABASES:\n');
    
    const adminDb = db.admin();
    const { databases } = await adminDb.listDatabases();
    
    for (const dbInfo of databases) {
      if (!['admin', 'config', 'local'].includes(dbInfo.name)) {
        const tempConn = mongoose.createConnection(`mongodb://localhost:27017/${dbInfo.name}`);
        await tempConn.asPromise();
        
        const tempDb = tempConn.db;
        const tempStats = await tempDb.stats();
        
        if (tempStats.objects > 0) {
          console.log(`✅ Database "${dbInfo.name}" has ${tempStats.objects} documents`);
          
          const tempCollections = await tempDb.listCollections().toArray();
          for (const col of tempCollections) {
            const count = await tempDb.collection(col.name).countDocuments();
            if (count > 0) {
              console.log(`   - ${col.name}: ${count} documents`);
            }
          }
        }
        
        await tempConn.close();
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Data Integrity Check Complete!\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDataIntegrity();










