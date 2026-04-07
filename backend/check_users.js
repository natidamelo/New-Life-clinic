require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

async function checkUsers() {
  let log = '';
  function logMsg(msg) {
    console.log(msg);
    log += msg + '\n';
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logMsg('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    const users = await db.collection('users').find({}).toArray();
    logMsg(`Total users: ${users.length}`);
    
    users.forEach(u => {
      logMsg(`Username: ${u.username}, Role: ${u.role}, ClinicId: ${u.clinicId}`);
    });

    logMsg('Done');
    fs.writeFileSync('users_report.txt', log);
    process.exit(0);
  } catch (err) {
    logMsg('Error: ' + err.message);
    fs.writeFileSync('users_report.txt', log);
    process.exit(1);
  }
}

checkUsers();
