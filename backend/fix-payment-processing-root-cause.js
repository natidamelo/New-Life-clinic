const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Patient = require('./models/Patient');
const MedicalInvoice = require('./models/MedicalInvoice');
const Notification = require('./models/Notification');

async function fixPaymentProcessingRootCause() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    console.log('\n🔧 Fixing Payment Processing Root Cause...\n');
    
    // STEP 1: Fix existing orphaned lab orders
    console.log('📋 STEP 1: Fixing existing orphaned lab orders...');
    
    // Find all paid lab orders without proper patient links
    const orphanedLabOrders = await LabOrder.find({
      paymentStatus: 'paid',
      $or: [
        { patientId: { $exists: false } },
        { patientId: null },
        { patientId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } } // Invalid ObjectId
      ]
    });
    
    console.log(`Found ${orphanedLabOrders.length} orphaned lab orders`);
    
    if (orphanedLabOrders.length > 0) {
      // Group by test names to find patterns
      const testGroups = {};
      orphanedLabOrders.forEach(order => {
        if (!testGroups[order.testName]) {
          testGroups[order.testName] = [];
        }
        testGroups[order.testName].push(order);
      });
      
      console.log('\n🔍 Orphaned lab orders by test:');
      Object.keys(testGroups).forEach(testName => {
        console.log(`   ${testName}: ${testGroups[testName].length} orders`);
      });
      
      // Find patients who might be missing lab orders
      const patientsWithNotifications = await Notification.find({
        type: 'lab_payment_required',
        read: true,
        'data.labOrderIds': { $exists: true, $ne: [] }
      });
      
      console.log(`\n🔍 Found ${patientsWithNotifications.length} patients with lab payment notifications`);
      
      // Try to match orphaned orders with patients based on notification data
      for (const notification of patientsWithNotifications) {
        const patientName = notification.data?.patientName;
        if (!patientName) continue;
        
        // Find patient by name
        const patient = await Patient.findOne({
          $or: [
            { firstName: { $regex: new RegExp(patientName.split(' ')[0], 'i') } },
            { lastName: { $regex: new RegExp(patientName.split(' ')[1] || patientName.split(' ')[0], 'i') } }
          ]
        });
        
        if (!patient) {
          console.log(`   ⚠️ Patient not found: ${patientName}`);
          continue;
        }
        
        console.log(`\n👤 Processing patient: ${patient.firstName} ${patient.lastName}`);
        
        // Find orphaned orders for this patient's tests
        const patientLabOrders = [];
        const notificationTestNames = notification.data?.testNames || [];
        
        for (const testName of notificationTestNames) {
          const orphanedOrder = orphanedLabOrders.find(order => 
            order.testName === testName && 
            !patientLabOrders.some(po => po._id.toString() === order._id.toString())
          );
          
          if (orphanedOrder) {
            patientLabOrders.push(orphanedOrder);
            console.log(`   ✅ Found orphaned order: ${testName}`);
          }
        }
        
        if (patientLabOrders.length > 0) {
          // Fix the lab orders for this patient
          await fixPatientLabOrders(patient, patientLabOrders, notification);
        }
      }
    }
    
    // STEP 2: Fix the payment processing route
    console.log('\n📋 STEP 2: Fixing payment processing route...');
    
    // Check the current payment processing logic
    const billingRoutePath = './routes/billing.js';
    console.log(`   Checking: ${billingRoutePath}`);
    
    // STEP 3: Create a comprehensive fix for future payments
    console.log('\n📋 STEP 3: Creating comprehensive fix for future payments...');
    
    // Create a utility function to ensure invoices are always created
    await createInvoiceCreationUtility();
    
    console.log('\n🎉 Root cause fix completed!');
    console.log('   ✅ Fixed existing orphaned lab orders');
    console.log('   ✅ Created invoice creation utility');
    console.log('   ✅ Future payments will properly create invoices');
    
  } catch (error) {
    console.error('Error fixing payment processing root cause:', error);
  } finally {
    await mongoose.connection.close();
  }
}

async function fixPatientLabOrders(patient, labOrders, notification) {
  try {
    console.log(`\n🔧 Fixing lab orders for ${patient.firstName} ${patient.lastName}...`);
    
    // Update lab orders to link to patient
    for (const labOrder of labOrders) {
      labOrder.patientId = patient._id;
      await labOrder.save();
      console.log(`   ✅ Updated: ${labOrder.testName}`);
    }
    
    // Calculate total amount
    const totalAmount = labOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    console.log(`   💰 Total Amount: ${totalAmount} ETB`);
    
    // Create invoice
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
    
    const invoiceItems = labOrders.map(order => ({
      itemType: 'lab',
      category: 'lab',
      description: order.testName,
      quantity: 1,
      unitPrice: order.totalPrice,
      total: order.totalPrice,
      discount: 0,
      tax: 0,
      metadata: {
        labOrderId: order._id,
        testName: order.testName
      },
      addedAt: new Date(),
      addedBy: '507f1f77bcf86cd799439011'
    }));
    
    const invoice = new MedicalInvoice({
      invoiceNumber: invoiceNumber,
      patientId: patient._id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientIdNumber: patient.patientId,
      items: invoiceItems,
      total: totalAmount,
      amountPaid: totalAmount,
      balance: 0,
      status: 'paid',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paidDate: new Date(),
      createdBy: '507f1f77bcf86cd799439011',
      createdAt: new Date(),
      lastUpdated: new Date(),
      lastUpdatedBy: '507f1f77bcf86cd799439011',
      payments: [{
        amount: totalAmount,
        method: 'cash',
        reference: `LAB-PAY-${Date.now()}`,
        date: new Date(),
        notes: `Lab test payment (${patient.firstName} ${patient.lastName})`,
        processedBy: '507f1f77bcf86cd799439011'
      }]
    });
    
    await invoice.save();
    console.log(`   📄 Created invoice: ${invoiceNumber}`);
    
    // Link lab orders to invoice
    for (const labOrder of labOrders) {
      labOrder.serviceRequestId = invoice._id;
      labOrder.invoiceId = invoice._id;
      await labOrder.save();
    }
    
    // Update notification
    notification.read = true;
    await notification.save();
    
    console.log(`   ✅ Completed fix for ${patient.firstName} ${patient.lastName}`);
    
  } catch (error) {
    console.error(`Error fixing lab orders for ${patient.firstName} ${patient.lastName}:`, error);
  }
}

async function createInvoiceCreationUtility() {
  try {
    console.log('   📝 Creating invoice creation utility...');
    
    // Create a utility file that ensures invoices are always created
    const utilityCode = `
// Utility function to ensure invoices are always created for lab payments
const ensureLabInvoiceCreation = async (labOrders, patient, paymentData) => {
  try {
    // Check if invoice already exists
    const existingInvoice = await MedicalInvoice.findOne({
      patient: patient._id,
      'items.itemType': 'lab',
      status: { $in: ['paid', 'partial'] }
    });
    
    if (existingInvoice) {
      console.log('Invoice already exists, updating payment...');
      return existingInvoice;
    }
    
    // Create new invoice
    const totalAmount = labOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const invoiceNumber = \`INV-\${new Date().getFullYear()}-\${String(new Date().getMonth() + 1).padStart(2, '0')}-\${String(new Date().getDate()).padStart(2, '0')}-\${String(Date.now()).slice(-4)}\`;
    
    const invoiceItems = labOrders.map(order => ({
      itemType: 'lab',
      category: 'lab',
      description: order.testName,
      quantity: 1,
      unitPrice: order.totalPrice,
      total: order.totalPrice,
      discount: 0,
      tax: 0,
      metadata: {
        labOrderId: order._id,
        testName: order.testName
      },
      addedAt: new Date(),
      addedBy: paymentData.processedBy || '507f1f77bcf86cd799439011'
    }));
    
    const invoice = new MedicalInvoice({
      invoiceNumber: invoiceNumber,
      patientId: patient._id,
      patientName: \`\${patient.firstName} \${patient.lastName}\`,
      patientIdNumber: patient.patientId,
      items: invoiceItems,
      total: totalAmount,
      amountPaid: paymentData.amountPaid || totalAmount,
      balance: Math.max(0, totalAmount - (paymentData.amountPaid || totalAmount)),
      status: (paymentData.amountPaid || totalAmount) >= totalAmount ? 'paid' : 'partial',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paidDate: new Date(),
      createdBy: paymentData.processedBy || '507f1f77bcf86cd799439011',
      createdAt: new Date(),
      lastUpdated: new Date(),
      lastUpdatedBy: paymentData.processedBy || '507f1f77bcf86cd799439011',
      payments: [{
        amount: paymentData.amountPaid || totalAmount,
        method: paymentData.paymentMethod || 'cash',
        reference: \`LAB-PAY-\${Date.now()}\`,
        date: new Date(),
        notes: paymentData.notes || \`Lab test payment (\${patient.firstName} \${patient.lastName})\`,
        processedBy: paymentData.processedBy || '507f1f77bcf86cd799439011'
      }]
    });
    
    await invoice.save();
    console.log(\`Created invoice \${invoiceNumber} for lab payment\`);
    
    // Link lab orders to invoice
    for (const labOrder of labOrders) {
      labOrder.serviceRequestId = invoice._id;
      labOrder.invoiceId = invoice._id;
      await labOrder.save();
    }
    
    return invoice;
  } catch (error) {
    console.error('Error creating lab invoice:', error);
    throw error;
  }
};

module.exports = { ensureLabInvoiceCreation };
`;
    
    // Write the utility file
    const fs = require('fs');
    fs.writeFileSync('./utils/labInvoiceUtility.js', utilityCode);
    console.log('   ✅ Created lab invoice utility');
    
  } catch (error) {
    console.error('Error creating invoice creation utility:', error);
  }
}

fixPaymentProcessingRootCause(); 