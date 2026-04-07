const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

async function checkUsers() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({ clinicId: 'new-life' }).limit(5).toArray();
    
    users.forEach(u => {
      console.log(`ID: ${u._id}, User: ${u.username || u.email || u.identifier}, Role: ${u.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
