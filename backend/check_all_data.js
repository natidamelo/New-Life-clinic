require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

async function checkAllData() {
  let log = '';
  function logMsg(msg) {
    console.log(msg);
    log += msg + '\n';
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logMsg('Connected to MongoDB');

    const db = mongoose.connection.db;
    const clinicId = 'new-life';

    const collections = [
      'patients',
      'prescriptions',
      'medicalcertificates',
      'labrequests',
      'medicalrecords',
      'visits',
      'consultations',
      'medicalinvoices',
      'servicerequests'
    ];

    for (const col of collections) {
      const totalCount = await db.collection(col).countDocuments({});
      const countWithClinic = await db.collection(col).countDocuments({ clinicId: clinicId });
      
      logMsg(`--- ${col} ---`);
      logMsg(`Total: ${totalCount}`);
      logMsg(`With clinicId '${clinicId}': ${countWithClinic}`);
      
      if (totalCount > 0) {
        const latest = await db.collection(col).find({}).sort({ createdAt: -1 }).limit(1).toArray();
        logMsg(`Latest record createdAt: ${latest[0].createdAt || latest[0].dateIssued || latest[0].datePrescribed || 'N/A'}`);
        
        if (col === 'patients') {
          const statuses = await db.collection(col).aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ]).toArray();
          logMsg(`Patient statuses: ${JSON.stringify(statuses)}`);
        }
      }
    }

    logMsg('Done checking');
    fs.writeFileSync('db_report_latest.txt', log);
    process.exit(0);
  } catch (err) {
    logMsg('Error: ' + err.message);
    fs.writeFileSync('db_report_latest.txt', log);
    process.exit(1);
  }
}

checkAllData();
