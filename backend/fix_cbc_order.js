const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const MedicalInvoice = require('./models/MedicalInvoice');
const Patient = require('./models/Patient');
const Service = require('./models/Service');

async function fixCbcOrder() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database');
    
    // Find Melody Natan
    const melodyPatient = await Patient.findOne({ 
      $or: [
        { firstName: 'Melody', lastName: 'Natan' },
        { patientId: 'P18929-8929' }
      ]
    });
    
    if (!melodyPatient) {
      console.log('❌ Melody Natan not found');
      return;
    }
    
    console.log(`✅ Found patient: ${melodyPatient.firstName} ${melodyPatient.lastName} (ID: ${melodyPatient._id})`);
    
    // Find the latest CBC invoice
    const cbcInvoice = await MedicalInvoice.findOne({
      patient: melodyPatient._id,
      invoiceNumber: 'INV-25-09-0004-092',
      'items.metadata.serviceId': '68769fa8e0394460d63e4601'
    });
    
    if (!cbcInvoice) {
      console.log('❌ CBC invoice not found');
      return;
    }
    
    console.log(`\n=== Processing CBC Invoice: ${cbcInvoice.invoiceNumber} ===`);
    console.log(`- Status: ${cbcInvoice.status}`);
    console.log(`- Total: ETB ${cbcInvoice.total}`);
    console.log(`- Amount Paid: ETB ${cbcInvoice.amountPaid}`);
    console.log(`- Created: ${cbcInvoice.createdAt}`);
    
    // Get the service details
    const service = await Service.findById('68769fa8e0394460d63e4601');
    if (!service) {
      console.log('❌ Service not found');
      return;
    }
    
    console.log(`\n=== Service Details ===`);
    console.log(`- Name: ${service.name}`);
    console.log(`- Category: ${service.category}`);
    console.log(`- Price: ETB ${service.price}`);
    
    // Check if lab order already exists for this specific invoice
    const existingLabOrder = await LabOrder.findOne({
      'metadata.invoiceId': cbcInvoice._id
    });
    
    if (existingLabOrder) {
      console.log(`\n✅ Lab order already exists for this invoice: ${existingLabOrder._id}`);
      console.log(`- Test Name: ${existingLabOrder.testName}`);
      console.log(`- Payment Status: ${existingLabOrder.paymentStatus}`);
      console.log(`- Order Status: ${existingLabOrder.status}`);
    } else {
      console.log(`\n❌ Lab order missing for this invoice - creating now...`);
      
      // Create the missing lab order for the CBC test
      const labOrderData = {
        patientId: melodyPatient._id,
        testName: service.name,
        panelName: service.name,
        specimenType: 'Blood', // Default for lab tests
        orderDateTime: cbcInvoice.createdAt,
        status: 'Ordered', // Since it's paid, it should be ready for lab processing
        paymentStatus: 'paid',
        priority: 'Routine',
        notes: 'CBC Test - Created from paid invoice',
        orderingDoctorId: new mongoose.Types.ObjectId('6800ad0a8c0537f199ca6308'), // Use a valid doctor ID
        totalPrice: service.price || 300,
        paidAt: cbcInvoice.paidDate || cbcInvoice.updatedAt,
        paymentMethod: cbcInvoice.paymentMethod || 'cash',
        transactionId: cbcInvoice.invoiceNumber,
        metadata: {
          invoiceId: cbcInvoice._id,
          invoiceItemId: cbcInvoice.items[0]._id,
          serviceId: service._id,
          createdAt: new Date()
        },
        createdAt: cbcInvoice.createdAt,
        updatedAt: new Date()
      };
      
      const newLabOrder = new LabOrder(labOrderData);
      const savedOrder = await newLabOrder.save();
      
      console.log(`✅ Created CBC lab order: ${savedOrder._id}`);
      console.log(`- Test Name: ${savedOrder.testName}`);
      console.log(`- Payment Status: ${savedOrder.paymentStatus}`);
      console.log(`- Order Status: ${savedOrder.status}`);
      console.log(`- Price: ETB ${savedOrder.totalPrice}`);
      
      // Update the invoice item metadata to include the lab order ID
      cbcInvoice.items[0].metadata.labOrderId = savedOrder._id;
      await cbcInvoice.save();
      
      console.log(`✅ Updated invoice metadata with lab order ID`);
    }
    
    // Verify all lab orders for Melody Natan
    console.log(`\n=== Verification - All Lab Orders for Melody Natan ===`);
    const allLabOrders = await LabOrder.find({ patientId: melodyPatient._id }).sort({ createdAt: -1 });
    
    allLabOrders.forEach((order, i) => {
      console.log(`\n${i+1}. ${order.testName}`);
      console.log(`   - Payment Status: ${order.paymentStatus}`);
      console.log(`   - Order Status: ${order.status}`);
      console.log(`   - Price: ETB ${order.totalPrice}`);
      console.log(`   - Created: ${order.createdAt}`);
      console.log(`   - Order ID: ${order._id}`);
      if (order.metadata && order.metadata.invoiceId) {
        console.log(`   - Invoice ID: ${order.metadata.invoiceId}`);
      }
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Fix completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCbcOrder();
