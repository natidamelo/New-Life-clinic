const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MedicalInvoice = require('../backend/models/MedicalInvoice');

async function test() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Connecting to:', uri);
  
  try {
    await mongoose.connect(uri);
    console.log('Connected. Running find().limit(1) via Mongoose model...');
    const result = await MedicalInvoice.find().limit(1);
    console.log('Query result length:', result.length);
  } catch (error) {
    console.error('Error during Mongoose query:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

test();
