require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function testPaymentNotificationDebug() {
  try {
    console.log('🧪 Testing Payment Notification Debug...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test the specific invoice that was paid
    const MedicalInvoice = mongoose.model('MedicalInvoice', new mongoose.Schema({
      invoiceNumber: String,
      patientId: mongoose.Schema.Types.ObjectId,
      status: String,
      balance: Number,
      items: Array
    }, { collection: 'medicalinvoices' }));

    console.log('🔍 Looking for invoice INV-25-10-0025-461...');
    const invoice = await MedicalInvoice.findOne({ invoiceNumber: 'INV-25-10-0025-461' });

    if (invoice) {
      console.log('✅ Found invoice:', {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        balance: invoice.balance,
        items: invoice.items.length
      });

      // Check if this invoice has any lab-related items
      const labItems = invoice.items.filter(item =>
        item.description && item.description.toLowerCase().includes('glucose')
      );

      if (labItems.length > 0) {
        console.log(`✅ Found ${labItems.length} lab items in invoice`);
        labItems.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.description} - ${item.total}`);
        });
      } else {
        console.log('❌ No lab items found in invoice');
      }

      // Check for lab orders linked to this invoice
      const LabOrder = mongoose.model('LabOrder', new mongoose.Schema({
        invoiceId: mongoose.Schema.Types.ObjectId,
        patientId: mongoose.Schema.Types.ObjectId,
        testName: String,
        paymentStatus: String
      }, { collection: 'laborders' }));

      console.log('\n🔍 Checking lab orders linked to this invoice...');
      const linkedLabOrders = await LabOrder.find({ invoiceId: invoice._id });

      if (linkedLabOrders.length > 0) {
        console.log(`✅ Found ${linkedLabOrders.length} lab orders linked to invoice`);
        linkedLabOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. ${order.testName} - ${order.paymentStatus}`);
        });
      } else {
        console.log('❌ No lab orders linked to this invoice');
      }

      // Check for lab orders with paymentStatus paid (regardless of invoice link)
      console.log('\n🔍 Checking all paid lab orders...');
      const paidLabOrders = await LabOrder.find({
        paymentStatus: 'paid'
      }).populate('patient', 'firstName lastName');

      if (paidLabOrders.length > 0) {
        console.log(`✅ Found ${paidLabOrders.length} paid lab orders`);
        paidLabOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. ${order.testName} - ${order.patient ? order.patient.firstName : 'Unknown'}`);
        });
      } else {
        console.log('❌ No paid lab orders found');
      }

    } else {
      console.log('❌ Invoice INV-25-10-0025-461 not found');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
  }
}

testPaymentNotificationDebug();
