const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get the URI from your .env or the manual link
// We will use the URI directly from your .env file
const MONGODB_URI = process.env.MONGODB_URI;

async function restore() {
  const client = new MongoClient(MONGODB_URI);
  console.log('Connecting to Atlas...');
  
  try {
    await client.connect();
    const db = client.db('clinic-cms');
    console.log('✅ Connected! Target database: clinic-cms');

    const backupDir = path.join(process.cwd(), 'database_backup');
    if (!fs.existsSync(backupDir)) {
      console.error('❌ Backup directory not found at: ' + backupDir);
      process.exit(1);
    }

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} collections to restore.`);

    for (const file of files) {
      const colName = file.replace('.json', '');
      const rawData = fs.readFileSync(path.join(backupDir, file), 'utf8');
      let data;
      try {
        data = JSON.parse(rawData);
      } catch (err) {
        console.error(`❌ Failed to parse ${file}: ${err.message}`);
        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        // Clear target collection first
        console.log(`Clearing and restoring ${colName}...`);
        await db.collection(colName).deleteMany({});
        
        // Prepare documents (fix ObjectIds)
        const formattedData = data.map(doc => {
          // Handle various MongoDB JSON export formats for _id
          if (doc._id && doc._id.$oid) {
             doc._id = new ObjectId(doc._id.$oid);
          } else if (typeof doc._id === 'string' && ObjectId.isValid(doc._id)) {
             try { doc._id = new ObjectId(doc._id); } catch(e) {}
          }
          return doc;
        });

        // Insert in chunks
        const chunkSize = 100;
        for (let i = 0; i < formattedData.length; i += chunkSize) {
          await db.collection(colName).insertMany(formattedData.slice(i, i + chunkSize));
        }
        console.log(`   ✅ Restored: ${colName} (${data.length} docs)`);
      } else {
        console.log(`ℹ️  Skipped empty: ${colName}`);
      }
    }
    console.log('\n--- 🔥 ALL DATA RESTORED TO NEW CLUSTER SUCCESSFULLY ---');
  } catch (err) {
    console.error('❌ RESTORE FAILED:', err.message);
  } finally {
    await client.close();
  }
}

restore();
