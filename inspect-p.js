
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  const Prescription = mongoose.model('Prescription', new mongoose.Schema({}, { strict: false }));
  const Patient = mongoose.model('Patient', new mongoose.Schema({ firstName: String, lastName: String }));
  const p = await Patient.findOne({ firstName: /Habtamu/i });
  if (p) {
    const pres = await Prescription.find({ patient: p._id }).lean();
    console.log(`HABTAMU_PRES: ${JSON.stringify(pres.map(x => ({ id: x._id, med: x.medicationName, medications: x.medications?.length, status: x.paymentStatus })), null, 2)}`);
  }
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
