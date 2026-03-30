
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const envPath = path.resolve(__dirname, 'backend', '.env');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) { console.error('NO MONGODB_URI'); process.exit(1); }

mongoose.connect(MONGODB_URI).then(async () => {
  const NurseTask = mongoose.model('NurseTask', new mongoose.Schema({ patientName: String, description: String, paymentAuthorization: Object }, { strict: false }));
  const omep = await NurseTask.find({ description: /Omeprazole/i }).lean();
  console.log('OMEP_COUNT:', omep.length);
  omep.forEach(x => console.log(`${x._id}: ${x.patientName} - ${x.description} [${x.paymentAuthorization?.paymentStatus}]`));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
