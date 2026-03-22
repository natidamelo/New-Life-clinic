const mongoose = require('mongoose');
require('dotenv').config();

async function checkGenet() {
  try {
    console.log('🔍 Checking genet hailu...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check for genet hailu patient
    const Patient = mongoose.model('Patient', new mongoose.Schema({
      firstName: String,
      lastName: String,
      patientId: String,
      assignedDoctorId: mongoose.Schema.Types.ObjectId
    }, { collection: 'patients' }));

    console.log('🔍 Searching for genet hailu patient...');
    const genet = await Patient.findOne({
      $or: [
        { firstName: 'genet', lastName: 'hailu' },
        { firstName: 'Genet', lastName: 'Hailu' },
        { firstName: 'genet', lastName: 'Hailu' }
      ]
    });

    if (genet) {
      console.log('✅ Found genet hailu patient:', {
        id: genet._id,
        name: genet.firstName + ' ' + genet.lastName,
        patientId: genet.patientId,
        assignedDoctorId: genet.assignedDoctorId
      });

      // Check for lab orders
      const LabOrder = mongoose.model('LabOrder', new mongoose.Schema({
        patientId: mongoose.Schema.Types.ObjectId,
        testName: String,
        status: String,
        paymentStatus: String,
        createdAt: Date
      }, { collection: 'laborders' }));

      console.log('\n🔍 Checking lab orders for genet...');
      const labOrders = await LabOrder.find({ patientId: genet._id })
        .sort({ createdAt: -1 })
        .limit(3);

      if (labOrders.length > 0) {
        console.log(`✅ Found ${labOrders.length} lab orders for genet:`);
        labOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. Test: ${order.testName}`);
          console.log(`     Status: ${order.status}`);
          console.log(`     Payment Status: ${order.paymentStatus}`);
          console.log(`     Created: ${order.createdAt}`);
          console.log('');
        });
      } else {
        console.log('❌ No lab orders found for genet');
      }

      // Check for invoices
      const MedicalInvoice = mongoose.model('MedicalInvoice', new mongoose.Schema({
        patientId: mongoose.Schema.Types.ObjectId,
        invoiceNumber: String,
        status: String,
        createdAt: Date
      }, { collection: 'medicalinvoices' }));

      console.log('🔍 Checking invoices for genet...');
      const invoices = await MedicalInvoice.find({ patientId: genet._id })
        .sort({ createdAt: -1 })
        .limit(3);

      if (invoices.length > 0) {
        console.log(`✅ Found ${invoices.length} invoices for genet:`);
        invoices.forEach((invoice, index) => {
          console.log(`  ${index + 1}. Invoice: ${invoice.invoiceNumber}`);
          console.log(`     Status: ${invoice.status}`);
          console.log(`     Created: ${invoice.createdAt}`);
          console.log('');
        });
      } else {
        console.log('❌ No invoices found for genet');
      }

      // Check if genet has an assigned doctor
      if (genet.assignedDoctorId) {
        const User = mongoose.model('User', new mongoose.Schema({
          firstName: String,
          lastName: String,
          role: String,
          telegramChatId: String,
          telegramNotificationsEnabled: Boolean
        }, { collection: 'users' }));

        const assignedDoctor = await User.findById(genet.assignedDoctorId);
        if (assignedDoctor) {
          console.log('👨‍⚕️ Assigned Doctor:', {
            name: assignedDoctor.firstName + ' ' + assignedDoctor.lastName,
            role: assignedDoctor.role,
            telegramChatId: assignedDoctor.telegramChatId || 'NOT SET',
            telegramNotificationsEnabled: assignedDoctor.telegramNotificationsEnabled || false
          });
        }
      } else {
        console.log('❌ No doctor assigned to genet');
      }

    } else {
      console.log('❌ genet hailu patient not found');
      
      // List recent patients
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

checkGenet();
