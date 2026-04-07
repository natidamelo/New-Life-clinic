const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Patient = require('./models/Patient');
    
    const withoutIsActive = await Patient.countDocuments({ status: 'completed', isActive: { $ne: true } });
    const withIsActive = await Patient.countDocuments({ status: 'completed', isActive: true });
    
    const countTotal = await Patient.countDocuments({ status: 'completed' });
    
    fs.writeFileSync('diag4.txt', `Total Completed: ${countTotal}\nWithout isActive=true: ${withoutIsActive}\nWith isActive=true: ${withIsActive}`);
    console.log('Written to diag4.txt');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
