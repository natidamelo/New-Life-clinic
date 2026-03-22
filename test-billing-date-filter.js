/**
 * Test script to verify billing date filter functionality
 * Run: node test-billing-date-filter.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const testDateFilter = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management');
    console.log('✅ Connected to MongoDB');

    const MedicalInvoice = require('./backend/models/MedicalInvoice');

    // Test 1: Get all invoices
    const allInvoices = await MedicalInvoice.find({}).select('invoiceNumber issueDate total status');
    console.log(`\n📊 Total invoices in database: ${allInvoices.length}`);

    if (allInvoices.length > 0) {
      // Get date range
      const dates = allInvoices.map(inv => inv.issueDate).sort((a, b) => a - b);
      const oldestDate = dates[0];
      const newestDate = dates[dates.length - 1];
      
      console.log(`📅 Date range: ${oldestDate.toLocaleDateString()} to ${newestDate.toLocaleDateString()}`);

      // Test 2: Filter by last month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const today = new Date();

      const lastMonthInvoices = await MedicalInvoice.find({
        issueDate: { $gte: oneMonthAgo, $lte: today }
      }).select('invoiceNumber issueDate total status');

      console.log(`\n📆 Invoices in last month: ${lastMonthInvoices.length}`);

      // Test 3: Calculate stats for last month
      const stats = await MedicalInvoice.aggregate([
        {
          $match: {
            issueDate: { $gte: oneMonthAgo, $lte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalPaid: { $sum: '$amountPaid' },
            count: { $sum: 1 }
          }
        }
      ]);

      if (stats.length > 0) {
        console.log('\n💰 Stats for last month:');
        console.log(`   Total Revenue: ETB ${stats[0].totalRevenue.toLocaleString()}`);
        console.log(`   Total Paid: ETB ${stats[0].totalPaid.toLocaleString()}`);
        console.log(`   Outstanding: ETB ${(stats[0].totalRevenue - stats[0].totalPaid).toLocaleString()}`);
        console.log(`   Invoice Count: ${stats[0].count}`);
      }

      // Test 4: Invoice counts by status
      const statusCounts = await MedicalInvoice.aggregate([
        {
          $match: {
            issueDate: { $gte: oneMonthAgo, $lte: today }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      console.log('\n📋 Invoice status breakdown:');
      statusCounts.forEach(item => {
        console.log(`   ${item._id}: ${item.count}`);
      });

      // Test 5: Recent invoices
      const recentInvoices = await MedicalInvoice.find({
        issueDate: { $gte: oneMonthAgo, $lte: today }
      })
        .sort({ issueDate: -1 })
        .limit(5)
        .populate('patient', 'firstName lastName')
        .select('invoiceNumber issueDate total status patient')
        .lean();

      console.log('\n📄 Recent invoices (top 5):');
      recentInvoices.forEach(inv => {
        const patientName = inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : 'Unknown';
        console.log(`   ${inv.invoiceNumber} - ${inv.issueDate.toLocaleDateString()} - ${patientName} - ETB ${inv.total} - ${inv.status}`);
      });

    } else {
      console.log('\n⚠️  No invoices found in database. Please create some test data first.');
    }

    console.log('\n✅ Date filter test completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Start your backend: npm run dev (in backend directory)');
    console.log('   2. Start your frontend: npm start (in frontend directory)');
    console.log('   3. Navigate to: http://localhost:5175/app/billing');
    console.log('   4. Select different date ranges and verify the stats update');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

testDateFilter();

