const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix partial payment status for existing invoices
const fixPartialPaymentStatus = async () => {
  try {
    console.log('🔍 Finding invoices with payment issues...');
    
    // Find invoices that have payments but incorrect status
    const invoices = await MedicalInvoice.find({
      $or: [
        // Invoices with amountPaid > 0 but status is not 'partial' or 'paid'
        {
          amountPaid: { $gt: 0 },
          status: { $nin: ['partial', 'paid'] }
        },
        // Invoices with balance > 0 and amountPaid > 0 but status is not 'partial'
        {
          balance: { $gt: 0.01 },
          amountPaid: { $gt: 0 },
          status: { $ne: 'partial' }
        },
        // Invoices with balance <= 0.01 and amountPaid > 0 but status is not 'paid'
        {
          balance: { $lte: 0.01 },
          amountPaid: { $gt: 0 },
          status: { $ne: 'paid' }
        }
      ]
    });

    console.log(`📊 Found ${invoices.length} invoices that need status correction`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const invoice of invoices) {
      try {
        const oldStatus = invoice.status;
        const amountPaid = invoice.amountPaid || 0;
        const balance = invoice.balance || 0;
        const total = invoice.total || 0;

        console.log(`\n🔍 Processing invoice ${invoice.invoiceNumber}:`);
        console.log(`   Current status: ${oldStatus}`);
        console.log(`   Amount paid: ${amountPaid}`);
        console.log(`   Balance: ${balance}`);
        console.log(`   Total: ${total}`);

        // Determine correct status
        let newStatus;
        if (balance <= 0.01 && amountPaid > 0 && total > 0) {
          newStatus = 'paid';
        } else if (amountPaid > 0 && balance > 0.01) {
          newStatus = 'partial';
        } else if (amountPaid <= 0 && invoice.status !== 'draft') {
          newStatus = (invoice.dueDate && invoice.dueDate < new Date()) ? 'overdue' : 'pending';
        } else {
          newStatus = invoice.status; // Keep current status if no change needed
        }

        if (newStatus !== oldStatus) {
          // Mark as explicitly set to avoid pre-save hook override
          invoice._statusExplicitlySet = true;
          invoice.status = newStatus;
          
          // Update payment status if it exists
          if (invoice.paymentStatus) {
            invoice.paymentStatus.current = newStatus === 'paid' ? 'fully_paid' : 'partial';
            invoice.paymentStatus.percentage = newStatus === 'paid' ? 100 : Math.round((amountPaid / total) * 100);
            invoice.paymentStatus.lastUpdated = new Date();
          }
          
          await invoice.save();
          
          console.log(`   ✅ Status updated: ${oldStatus} → ${newStatus}`);
          fixedCount++;
        } else {
          console.log(`   ⏭️  Status already correct: ${oldStatus}`);
        }

      } catch (error) {
        console.error(`   ❌ Error fixing invoice ${invoice.invoiceNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} invoices`);
    console.log(`   ❌ Errors: ${errorCount} invoices`);
    console.log(`   📋 Total processed: ${invoices.length} invoices`);

  } catch (error) {
    console.error('❌ Error in fixPartialPaymentStatus:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixPartialPaymentStatus();
  
  console.log('\n🎉 Script completed!');
  process.exit(0);
};

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Script interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
