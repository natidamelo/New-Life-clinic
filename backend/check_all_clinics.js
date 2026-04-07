const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

async function checkClinicIds() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db();
    
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      if (coll.name === 'system.indexes') continue;
      const stats = await db.collection(coll.name).aggregate([
        { $group: { _id: '$clinicId', count: { $sum: 1 } } }
      ]).toArray();
      
      if (stats.length > 0) {
        console.log(`Collection: ${coll.name}`);
        stats.forEach(s => {
          console.log(`  - clinicId: ${JSON.stringify(s._id)}, count: ${s.count}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkClinicIds();
