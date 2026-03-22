const cron = require('node-cron');
const mongoose = require('mongoose');
const notificationService = require('./notificationService');

class DailyRevenueService {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('📊 Daily revenue service already running');
      return;
    }

    console.log('📊 Starting daily revenue service...');

    // Run daily at 5:00 PM (17:00) in Africa/Addis_Ababa timezone
    cron.schedule('0 17 * * *', async () => {
      console.log('📊 Running daily revenue summary at 5:00 PM...');
      await this.sendDailyRevenueSummary();
    }, {
      scheduled: true,
      timezone: "Africa/Addis_Ababa"
    });

    this.isRunning = true;
    console.log('✅ Daily revenue service started - will run daily at 5:00 PM');
  }

  async sendDailyRevenueSummary() {
    try {
      console.log('📊 Calculating daily revenue summary for today...');

      // Get today's date range
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayDateString = todayStart.toLocaleDateString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      console.log(`📊 Getting revenue data for today: ${todayDateString}`);

      // Get revenue data from both Invoice and MedicalInvoice models
      const Invoice = require('../models/Invoice');
      const MedicalInvoice = mongoose.model('MedicalInvoice');
      const Payment = require('../models/Payment');

      // Get revenue from Invoice model (using createdAt)
      const invoiceRevenueData = await Invoice.aggregate([
        {
          $match: {
            createdAt: {
              $gte: todayStart,
              $lte: todayEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            invoiceCount: { $sum: 1 }
          }
        }
      ]);

      // Get revenue from MedicalInvoice model (using issueDate)
      const medicalInvoiceRevenueData = await MedicalInvoice.aggregate([
        {
          $match: {
            issueDate: {
              $gte: todayStart,
              $lte: todayEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOutstanding: { $sum: { $subtract: ['$total', '$amountPaid'] } },
            invoiceCount: { $sum: 1 }
          }
        }
      ]);

      // Get payment data (using createdAt)
      const paymentData = await Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: todayStart,
              $lte: todayEnd
            },
            status: { $in: ['completed', 'paid', 'success'] }
          }
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
            paymentCount: { $sum: 1 }
          }
        }
      ]);

      const invoiceRevenue = invoiceRevenueData[0] || {};
      const medicalInvoiceRevenue = medicalInvoiceRevenueData[0] || {};
      const payments = paymentData[0] || {};

      // Combine revenue from both models
      const totalRevenue = (invoiceRevenue.totalRevenue || 0) + (medicalInvoiceRevenue.totalRevenue || 0);
      const totalPaid = payments.totalPaid || 0;
      const outstandingAmount = medicalInvoiceRevenue.totalOutstanding || 0;
      const invoiceCount = (invoiceRevenue.invoiceCount || 0) + (medicalInvoiceRevenue.invoiceCount || 0);
      const paymentCount = payments.paymentCount || 0;

      // Calculate collection rate
      const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

      console.log('📊 Daily Revenue Summary:', {
        date: todayDateString,
        totalRevenue,
        totalPaid,
        outstandingAmount,
        invoiceCount,
        paymentCount,
        collectionRate: collectionRate.toFixed(2) + '%'
      });

      // Always send notification (even if revenue is 0, to confirm the service is working)
      const result = await notificationService.sendNotification(
        'dailyRevenue',
        {
          totalRevenue,
          totalCollected: totalPaid,
          outstandingAmount,
          invoiceCount,
          paymentCount,
          collectionRate: collectionRate.toFixed(2)
        }
      );

      if (result.success) {
        console.log('✅ Daily revenue notification sent successfully to Telegram');
      } else {
        console.error('❌ Failed to send daily revenue notification:', result.message);
      }

    } catch (error) {
      console.error('❌ Error in daily revenue service:', error);
    }
  }

  async stop() {
    this.isRunning = false;
    console.log('🛑 Daily revenue service stopped');
  }
}

module.exports = new DailyRevenueService();
