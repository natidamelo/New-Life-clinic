const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

async function checkUsers() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db();
    const users = await db.collection('users').find({ clinicId: 'new-life' }).toArray();
    
    console.log(`Found ${users.length} users with clinicId: 'new-life'`);
    users.forEach(u => {
      console.log(`- ${u.username || u.email || u.identifier}: role=${u.role}, clinicId=${u.clinicId}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
