const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');

const MedicalInvoice = require('./backend/models/MedicalInvoice');
const Service = require('./backend/models/Service');
const Patient = require('./backend/models/Patient');
const { createAppropriateTasks } = require('./backend/utils/taskRoutingService');

async function triggerHanaTaskCreation() {
  try {
    console.log('🔍 Triggering task creation for Hana\'s paid invoice...\n');

    // Find Hana's invoice
    const invoice = await MedicalInvoice.findOne({
      invoiceNumber: 'INV-25-08-0009-998'
    }).populate('patient');

    if (!invoice) {
      console.log('❌ Invoice INV-25-08-0009-998 not found');
      return;
    }

    console.log(`✅ Found invoice: ${invoice.invoiceNumber}`);
    console.log(`   Patient: ${invoice.patient?.fullName || invoice.patient?.firstName} ${invoice.patient?.lastName}`);
    console.log(`   Status: ${invoice.paymentStatus}`);
    console.log(`   Balance: ${invoice.balance}`);

    // Check if invoice is fully paid
    if (invoice.balance > 0) {
      console.log('❌ Invoice is not fully paid, cannot create tasks');
      return;
    }

    // Hardcoded IDs from the billing controller
    const NURSE_ID = '6823859485e2a37d8cb420ed';
    const RECEPTION_USER_ID = '6823859485e2a37d8cb420ed';

    console.log('🔍 Processing invoice items for task creation...');

    // Process each item in the invoice
    for (const item of invoice.items) {
      console.log(`   Processing item: ${item.description}`);

      // Find the service
      const service = await Service.findOne({ 
        name: new RegExp(`^${item.description}$`, 'i') 
      });

      if (!service) {
        console.log(`   ⚠️ Service not found for: ${item.description}`);
        continue;
      }

      console.log(`   ✅ Found service: ${service.name} (Category: ${service.category})`);

      // Create tasks using the task routing service
      await createAppropriateTasks({
        patient: invoice.patient,
        service: service,
        invoice: invoice,
        serviceRequest: { _id: invoice._id },
        assignedNurseId: NURSE_ID,
        assignedNurseName: 'Sister Semhal',
        assignedBy: RECEPTION_USER_ID,
        assignedByName: 'Reception'
      });

      console.log(`   ✅ Tasks created for service: ${service.name}`);
    }

    console.log('\n🎉 Task creation completed for Hana\'s invoice!');
    console.log('   Check the nurse dashboard for the new Blood Pressure Check task.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
  }
}

triggerHanaTaskCreation(); 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 