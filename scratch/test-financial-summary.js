const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const billingService = require('../backend/services/billingService');

async function test() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully.');
    
    const startDate = new Date('2025-05-28T14:15:29.666Z');
    const endDate = new Date('2026-05-28T14:15:29.666Z');
    
    console.log(`Calling getFinancialSummary with: \n  startDate: ${startDate.toISOString()}\n  endDate: ${endDate.toISOString()}`);
    
    const summary = await billingService.getFinancialSummary(startDate, endDate);
    console.log('Success! Summary result:', summary);
  } catch (error) {
    console.error('Captured Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

test();
