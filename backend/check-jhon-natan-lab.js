const mongoose = require('mongoose');
require('dotenv').config();

async function checkJhonNatanLab() {
  try {
    console.log('🔍 Checking Lab Orders for jhon natan...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check for jhon natan patient
    const Patient = mongoose.model('Patient', new mongoose.Schema({
      firstName: String,
      lastName: String,
      patientId: String
    }, { collection: 'patients' }));

    console.log('🔍 Searching for jhon natan patient...');
    const jhonNatan = await Patient.findOne({
      $or: [
        { firstName: 'jhon', lastName: 'natan' },
        { firstName: 'jhon', lastName: 'Natan' },
        { firstName: 'Jhon', lastName: 'natan' },
        { firstName: 'Jhon', lastName: 'Natan' }
      ]
    });

    if (jhonNatan) {
      console.log('✅ Found jhon natan patient:', {
        id: jhonNatan._id,
        name: jhonNatan.firstName + ' ' + jhonNatan.lastName,
        patientId: jhonNatan.patientId
      });

      // Check for lab orders for this patient
      const LabOrder = mongoose.model('LabOrder', new mongoose.Schema({
        patientId: mongoose.Schema.Types.ObjectId,
        testName: String,
        status: String,
        paymentStatus: String,
        createdAt: Date
      }, { collection: 'laborders' }));

      console.log('\n🔍 Checking lab orders for jhon natan...');
      const labOrders = await LabOrder.find({ patientId: jhonNatan._id })
        .sort({ createdAt: -1 })
        .limit(5);

      if (labOrders.length > 0) {
        console.log(`✅ Found ${labOrders.length} lab orders for jhon natan:`);
        labOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. Test: ${order.testName}`);
          console.log(`     Status: ${order.status}`);
          console.log(`     Payment Status: ${order.paymentStatus}`);
          console.log(`     Created: ${order.createdAt}`);
          console.log('');
        });
      } else {
        console.log('❌ No lab orders found for jhon natan');
      }

      // Check for recent invoices
      const MedicalInvoice = mongoose.model('MedicalInvoice', new mongoose.Schema({
        patientId: mongoose.Schema.Types.ObjectId,
        invoiceNumber: String,
        status: String,
        createdAt: Date
      }, { collection: 'medicalinvoices' }));

      console.log('🔍 Checking recent invoices for jhon natan...');
      const invoices = await MedicalInvoice.find({ patientId: jhonNatan._id })
        .sort({ createdAt: -1 })
        .limit(3);

      if (invoices.length > 0) {
        console.log(`✅ Found ${invoices.length} invoices for jhon natan:`);
        invoices.forEach((invoice, index) => {
          console.log(`  ${index + 1}. Invoice: ${invoice.invoiceNumber}`);
          console.log(`     Status: ${invoice.status}`);
          console.log(`     Created: ${invoice.createdAt}`);
          console.log('');
        });
      } else {
        console.log('❌ No invoices found for jhon natan');
      }

    } else {
      console.log('❌ jhon natan patient not found');
      
      // List recent patients to help find the correct name
      const recentPatients = await Patient.find({})
        .sort({ createdAt: -1 })
        .limit(10);
      
      console.log('\n📋 Recent patients:');
      recentPatients.forEach(p => {
        console.log(`  - ${p.firstName} ${p.lastName} (ID: ${p.patientId})`);
      });
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

checkJhonNatanLab();
