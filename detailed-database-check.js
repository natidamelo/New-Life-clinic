const mongoose = require('mongoose');

console.log('========================================');
console.log('  DETAILED DATABASE CHECK');
console.log('========================================\n');

async function detailedCheck() {
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
    
    console.log('📊 COMPLETE DATABASE LIST:');
    console.log('='.repeat(80) + '\n');
    
    // Check each database in detail
    for (const db of databases) {
      const sizeMB = (db.sizeOnDisk / (1024 * 1024)).toFixed(2);
      console.log(`\n📁 DATABASE: ${db.name.toUpperCase()}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Path: mongodb://localhost:27017/${db.name}`);
      
      // Skip system databases
      if (['admin', 'config', 'local'].includes(db.name)) {
        console.log(`   Type: ⚙️  System Database (MongoDB Internal)`);
        continue;
      }
      
      // Connect to this database
      const connection = mongoose.createConnection(`mongodb://localhost:27017/${db.name}`);
      await connection.asPromise();
      
      // Get all collections
      const collections = await connection.db.listCollections().toArray();
      console.log(`   Type: 📂 User Database`);
      console.log(`   Collections: ${collections.length}`);
      
      if (collections.length > 0) {
        console.log('\n   📋 COLLECTIONS IN THIS DATABASE:');
        console.log('   ' + '-'.repeat(76));
        
        // Get detailed info for each collection
        for (const col of collections) {
          try {
            const count = await connection.db.collection(col.name).countDocuments();
            const sampleDoc = await connection.db.collection(col.name).findOne();
            
            // Check if collection name suggests shop/inventory
            const isShopRelated = /shop|store|product|inventory|item|stock|warehouse/i.test(col.name);
            const marker = isShopRelated ? '🛒' : '  ';
            
            console.log(`   ${marker} ${col.name.padEnd(30)} - ${count} document(s)`);
            
            // Show sample for non-empty collections
            if (sampleDoc && count > 0) {
              const keys = Object.keys(sampleDoc).slice(0, 5);
              console.log(`      Fields: ${keys.join(', ')}${keys.length < Object.keys(sampleDoc).length ? '...' : ''}`);
            }
          } catch (err) {
            console.log(`      ${col.name} - Error reading: ${err.message}`);
          }
        }
      } else {
        console.log('   ⚠️  This database is empty (no collections)');
      }
      
      await connection.close();
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 SEARCH RESULTS:\n');
    
    // Summary
    let foundShopDb = false;
    let foundShopCollections = [];
    
    for (const db of databases) {
      if (/shop|store|ecommerce/i.test(db.name)) {
        foundShopDb = true;
        console.log(`✅ Found shop-related DATABASE: ${db.name}`);
      }
      
      // Check collections
      if (!['admin', 'config', 'local'].includes(db.name)) {
        const connection = mongoose.createConnection(`mongodb://localhost:27017/${db.name}`);
        await connection.asPromise();
        const collections = await connection.db.listCollections().toArray();
        
        for (const col of collections) {
          if (/shop|store|product|inventory|item|stock|warehouse/i.test(col.name)) {
            foundShopCollections.push({
              database: db.name,
              collection: col.name
            });
          }
        }
        await connection.close();
      }
    }
    
    if (!foundShopDb) {
      console.log('❌ No "shop" or "store" DATABASE found');
    }
    
    if (foundShopCollections.length > 0) {
      console.log('\n🛒 Found shop/inventory-related COLLECTIONS:');
      foundShopCollections.forEach(item => {
        console.log(`   - ${item.database} → ${item.collection}`);
      });
    } else {
      console.log('❌ No shop-related collections found');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 CONFIGURATION CHECK:\n');
    
    require('dotenv').config();
    const envUri = process.env.MONGO_URI;
    console.log(`Your .env file points to: ${envUri}`);
    
    // Extract database name
    const dbMatch = envUri ? envUri.match(/\/([^/?]+)(\?|$)/) : null;
    const configuredDb = dbMatch ? dbMatch[1] : 'Not found';
    
    console.log(`Your project uses database: ${configuredDb}`);
    
    const dbExists = databases.find(db => db.name === configuredDb);
    if (dbExists) {
      console.log(`✅ This database EXISTS`);
    } else {
      console.log(`❌ This database DOES NOT EXIST`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Detailed Check Complete!\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

detailedCheck();










