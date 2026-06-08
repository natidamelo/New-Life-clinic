const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('../backend/node_modules/mongoose');
const billingService = require('../backend/services/billingService');

async function testOptimizedFlow() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/cluster0';
  console.log('Connecting to:', uri);
  
  try {
    await mongoose.connect(uri);
    console.log('Connected successfully. Simulating optimized frontend mounting (3-Month Range, 4 Queries)...\n');
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const endDate = new Date();

    const start = Date.now();

    const runQuery = async (name, promiseFn) => {
      const qStart = Date.now();
      try {
        await promiseFn();
        console.log(`✅ [${name}] completed in ${Date.now() - qStart}ms`);
      } catch (err) {
        console.error(`❌ [${name}] failed:`, err.message);
      }
    };

    await Promise.all([
      runQuery('getFinancialSummary', () => billingService.getFinancialSummary(startDate, endDate)),
      runQuery('getMonthlyFinancialData', () => billingService.getMonthlyFinancialData(startDate, endDate)),
      runQuery('getRevenueByService', () => billingService.getRevenueByService(startDate, endDate)),
      runQuery('getPaymentMethodBreakdown', () => billingService.getPaymentMethodBreakdown(startDate, endDate))
    ]);

    console.log(`\n🎉 Total elapsed time: ${Date.now() - start}ms`);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

testOptimizedFlow();
