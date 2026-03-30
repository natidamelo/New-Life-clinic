
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  const NurseTask = mongoose.model('NurseTask', new mongoose.Schema({}, { strict: false }));
  const omep = await NurseTask.find({ description: /Omeprazole/i });
  console.log(`OMEP_TASKS: ${JSON.stringify(omep.map(x => ({ id: x._id, name: x.patientName, desc: x.description, paid: x.paymentAuthorization?.paymentStatus })), null, 2)}`);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
