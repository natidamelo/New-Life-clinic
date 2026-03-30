
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
    const NurseTask = mongoose.model('NurseTask', new mongoose.Schema({ patientName: String, description: String, paymentAuthorization: Object }, { strict: false }));
    const hTasks = await NurseTask.find({ patientName: /Habtamu/i, description: /Omeprazole/i }).lean();
    console.log('HABTAMU_OMEP:', JSON.stringify(hTasks.map(x => ({ id: x._id, desc: x.description, paid: x.paymentAuthorization?.paymentStatus })), null, 2));
    process.exit(0);
});
