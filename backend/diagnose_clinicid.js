require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');
    const db = mongoose.connection.db;

    const cols = ['users','patients','medicalrecords','prescriptions','laborders','nursetasks','invoices','medicalinvoices','notifications'];
    for (const name of cols) {
      try {
        const count = await db.collection(name).countDocuments();
        const ids = await db.collection(name).distinct('clinicId');
        console.log(`${name}: count=${count} | clinicIds=${JSON.stringify(ids)}`);
      } catch(e) {
        console.log(`${name}: ERROR - ${e.message}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

run();
