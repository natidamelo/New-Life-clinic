const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoiceLabOrders() {
  try {
    console.log('🔍 Checking invoice 68e0f39ffa5492648cce670a for lab orders...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check the specific invoice
    const MedicalInvoice = mongoose.model('MedicalInvoice', new mongoose.Schema({
      invoiceNumber: String,
      patientId: mongoose.Schema.Types.ObjectId,
      status: String,
      balance: Number,
      totalAmount: Number,
      paidAmount: Number,
      items: [{
        serviceId: mongoose.Schema.Types.ObjectId,
        serviceName: String,
        quantity: Number,
        price: Number,
        total: Number
      }]
    }, { collection: 'medicalinvoices' }));

    const invoice = await MedicalInvoice.findById('68e0f39ffa5492648cce670a')
      .populate('patientId', 'firstName lastName patientId');

    if (invoice) {
      console.log('✅ Found invoice:', {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        patient: invoice.patientId ? `${invoice.patientId.firstName} ${invoice.patientId.lastName}` : 'Unknown',
        patientId: invoice.patientId ? invoice.patientId.patientId : 'Unknown',
        status: invoice.status,
        balance: invoice.balance,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        items: invoice.items
      });

      // Check for lab orders linked to this invoice
      const LabOrder = mongoose.model('LabOrder', new mongoose.Schema({
        invoiceId: mongoose.Schema.Types.ObjectId,
        patientId: mongoose.Schema.Types.ObjectId,
        testName: String,
        status: String,
        paymentStatus: String,
        createdAt: Date
      }, { collection: 'laborders' }));

      console.log('\n🔍 Checking lab orders for this invoice...');
      const labOrders = await LabOrder.find({
        invoiceId: invoice._id,
        paymentStatus: 'paid'
      }).populate('patient', 'firstName lastName patientId');

      if (labOrders.length > 0) {
        console.log(`✅ Found ${labOrders.length} paid lab orders for this invoice:`);
        labOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. Test: ${order.testName}`);
          console.log(`     Patient: ${order.patient ? `${order.patient.firstName} ${order.patient.lastName}` : 'Unknown'}`);
          console.log(`     Status: ${order.status}`);
          console.log(`     Payment Status: ${order.paymentStatus}`);
          console.log(`     Created: ${order.createdAt}`);
          console.log('');
        });
      } else {
        console.log('❌ No paid lab orders found for this invoice');

        // Check if there are any lab orders for this patient
        const patientLabOrders = await LabOrder.find({
          patientId: invoice.patientId
        }).populate('patient', 'firstName lastName patientId');

        if (patientLabOrders.length > 0) {
          console.log(`📋 Found ${patientLabOrders.length} lab orders for this patient:`);
          patientLabOrders.forEach((order, index) => {
            console.log(`  ${index + 1}. Test: ${order.testName}`);
            console.log(`     Invoice ID: ${order.invoiceId}`);
            console.log(`     Payment Status: ${order.paymentStatus}`);
            console.log(`     Created: ${order.createdAt}`);
            console.log('');
          });
        } else {
          console.log('❌ No lab orders found for this patient at all');
        }
      }

    } else {
      console.log('❌ Invoice 68e0f39ffa5492648cce670a not found');

      // List recent invoices to help identify the correct one
      const recentInvoices = await MedicalInvoice.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('patientId', 'firstName lastName');

      console.log('\n📋 Recent invoices:');
      recentInvoices.forEach(inv => {
        console.log(`  - ${inv.invoiceNumber} (${inv.patientId ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : 'Unknown'})`);
      });
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

checkInvoiceLabOrders();
