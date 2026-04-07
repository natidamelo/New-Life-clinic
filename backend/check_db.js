require('dotenv').config();
const mongoose = require('mongoose');

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    const patientsCount = await db.collection('patients').countDocuments();
    console.log(`Total patients in DB: ${patientsCount}`);
    
    if (patientsCount > 0) {
      const samplePatients = await db.collection('patients').find({}).limit(3).toArray();
      console.log('Sample patients clinicIds:', samplePatients.map(p => ({ id: p._id, name: p.firstName, clinicId: p.clinicId })));
    }

    const usersCount = await db.collection('users').countDocuments();
    console.log(`Total users in DB: ${usersCount}`);
    if (usersCount > 0) {
      const sampleUsers = await db.collection('users').find({}).limit(5).toArray();
      console.log('Sample users roles and clinicIds:', sampleUsers.map(u => ({ username: u.username, role: u.role, clinicId: u.clinicId })));
    }
    
    const usersWithNewLife = await db.collection('users').countDocuments({ clinicId: 'new-life' });
    const patientsWithNewLife = await db.collection('patients').countDocuments({ clinicId: 'new-life' });
    console.log(`Users with clinicId 'new-life': ${usersWithNewLife}`);
    console.log(`Patients with clinicId 'new-life': ${patientsWithNewLife}`);

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDb();
