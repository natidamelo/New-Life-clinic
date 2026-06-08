const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Explicitly require mongoose from the backend's node_modules
const mongoose = require('../backend/node_modules/mongoose');
const billingService = require('../backend/services/billingService');

async function test() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Connecting to:', uri);
  
  try {
    await mongoose.connect(uri);
    console.log('Connected. Running getFinancialSummary...');
    
    const startDate = new Date('2025-05-28T14:15:29.666Z');
    const endDate = new Date('2026-05-28T14:15:29.666Z');
    
    const summary = await billingService.getFinancialSummary(startDate, endDate);
    console.log('Success! Financial Summary result:', summary);
  } catch (error) {
    console.error('Error during getFinancialSummary:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

test();
