
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
   const NurseTask = mongoose.model('NurseTask', new mongoose.Schema({ status: String, patientName: String, description: String, assignedTo: String, paymentAuthorization: Object }, { strict: false }));
   const t = await NurseTask.findById('69c6c124a6af268d0e937e69').lean();
   console.log('TASK_DETAILS:', JSON.stringify(t, null, 2));
   process.exit(0);
});
