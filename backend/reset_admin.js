const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

async function resetAdminPassword() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // We can't use the model if the plugin is not applied yet, but for updating it's fine
    // Actually, it's better to use MongoClient to avoid any Mongoose hooks/plugins for this
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const result = await db.collection('users').updateOne(
      { username: 'admin', clinicId: 'new-life' },
      { $set: { password: hashedPassword, role: 'admin', isActive: true } }
    );
    
    if (result.matchedCount > 0) {
      console.log('Success: Password for "admin" user in "new-life" clinic set to "admin123"');
    } else {
      console.log('User "admin" not found in "new-life" clinic. Creating one...');
      await db.collection('users').insertOne({
        username: 'admin',
        email: 'admin@newlife.com',
        password: hashedPassword,
        role: 'admin',
        clinicId: 'new-life',
        firstName: 'System',
        lastName: 'Admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('User "admin" created successfully.');
    }
    
    await client.close();
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

resetAdminPassword();
