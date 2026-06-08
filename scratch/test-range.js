const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('../backend/node_modules/mongoose');
const billingService = require('../backend/services/billingService');
const MedicalInvoice = require('../backend/models/MedicalInvoice');

async function testAllInParallel() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Connecting to:', uri);
  
  try {
    await mongoose.connect(uri);
    console.log('Connected successfully. Simulating frontend mounting parallel requests (1 Year Range)...\n');
    
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const endDate = new Date();

    const start = Date.now();

    const runQuery = async (name, promiseFn) => {
      const qStart = Date.now();
      try {
        await promiseFn();
        console.log(`✅ [${name}] completed in ${Date.now() - qStart}ms`);
      } catch (err) {
        console.error(`❌ [${name}] failed in ${Date.now() - qStart}ms:`, err.message);
      }
    };

    // Simulate getBillingStats aggregate queries
    const getBillingStatsSim = async () => {
      await Promise.all([
        MedicalInvoice.aggregate([
          { $match: { issueDate: { $gte: startDate, $lte: endDate } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              totalOutstanding: { $sum: '$balance' },
              totalPaid: { $sum: '$amountPaid' },
              averageInvoiceValue: { $avg: '$total' },
              invoiceCount: { $sum: 1 }
            }
          }
        ]),
        MedicalInvoice.aggregate([
          { $match: { issueDate: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        MedicalInvoice.aggregate([
          { $match: { issueDate: { $gte: startDate, $lte: endDate } } },
          { $sort: { issueDate: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'patients',
              localField: 'patient',
              foreignField: '_id',
              as: 'patientData'
            }
          },
          { $unwind: { path: '$patientData', preserveNullAndEmptyArrays: true } }
        ]),
        MedicalInvoice.aggregate([
          {
            $match: {
              issueDate: {
                $gte: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1),
                $lte: new Date()
              }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$issueDate' },
                month: { $month: '$issueDate' }
              },
              revenue: { $sum: '$total' }
            }
          }
        ])
      ]);
    };

    await Promise.all([
      runQuery('getFinancialSummary', () => billingService.getFinancialSummary(startDate, endDate)),
      runQuery('getAccountsReceivableAging', () => billingService.getAccountsReceivableAging()),
      runQuery('getMonthlyFinancialData', () => billingService.getMonthlyFinancialData(startDate, endDate)),
      runQuery('getRevenueByService', () => billingService.getRevenueByService(startDate, endDate)),
      runQuery('getPaymentMethodBreakdown', () => billingService.getPaymentMethodBreakdown(startDate, endDate)),
      runQuery('getBillingStats (Simulated)', getBillingStatsSim)
    ]);

    console.log(`\n🎉 Total elapsed time for all queries in parallel: ${Date.now() - start}ms`);
    
  } catch (error) {
    console.error('Error during parallel test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

testAllInParallel();
