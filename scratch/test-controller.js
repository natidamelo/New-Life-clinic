const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('../backend/node_modules/mongoose');
const billingController = require('../backend/controllers/billingController');

async function test() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Connecting to:', uri);
  
  try {
    await mongoose.connect(uri);
    console.log('Connected. Invoking billingController.getFinancialSummary...');
    
    const req = {
      query: {
        startDate: '2025-05-28T14:15:29.666Z',
        endDate: '2026-05-28T14:15:29.666Z'
      }
    };
    
    const res = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log(`Response sent (status ${this.statusCode}):`);
        console.log(JSON.stringify(data, null, 2));
      }
    };
    
    await billingController.getFinancialSummary(req, res);
  } catch (error) {
    console.error('Unhandled exception during controller invocation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

test();
