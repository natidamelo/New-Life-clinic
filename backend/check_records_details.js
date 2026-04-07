const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);

    const db = mongoose.connection.db;
    const records = await db.collection('medicalrecords').find({}).limit(5).toArray();
    console.log('Sample Records:', JSON.stringify(records.map(r => ({
      id: r._id,
      clinicId: r.clinicId,
      doctorId: r.doctorId,
      doctorName: r.doctorName,
      status: r.status,
      createdAt: r.createdAt
    })), null, 2));

    const total = await db.collection('medicalrecords').countDocuments({});
    const recent = await db.collection('medicalrecords').countDocuments({
       createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    console.log(`Total: ${total}, Recent (7 days): ${recent}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
