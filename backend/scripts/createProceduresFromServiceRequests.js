const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Procedure = require('../models/Procedure');
const ServiceRequest = require('../models/ServiceRequest');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Notification = require('../models/Notification');

async function createProceduresFromServiceRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Looking for paid wound care service requests...');
    
    // Find all paid service requests that are wound care procedures
    const paidServiceRequests = await ServiceRequest.find({
      status: 'completed',
      'service.category': 'procedure',
      'service.name': { $regex: /wound/i }
    })
    .populate('service')
    .populate('patient')
    .populate('invoice');

    console.log(`🔍 Found ${paidServiceRequests.length} paid wound care service requests`);

    if (paidServiceRequests.length === 0) {
      console.log('❌ No paid wound care service requests found');
      return;
    }

    // Find an available nurse
    const availableNurse = await User.findOne({ role: 'nurse' });
    if (!availableNurse) {
      console.log('❌ No nurses found in the system');
      return;
    }

    console.log(`✅ Found nurse: ${availableNurse.firstName} ${availableNurse.lastName}`);

    const createdProcedures = [];

    for (const serviceRequest of paidServiceRequests) {
      try {
        console.log(`\n🔍 Processing service request for ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`);
        console.log(`   Service: ${serviceRequest.service.name}`);
        console.log(`   Price: ${serviceRequest.service.price} ETB`);
        console.log(`   Status: ${serviceRequest.status}`);

        // Check if procedure already exists
        const existingProcedure = await Procedure.findOne({
          serviceRequestId: serviceRequest._id
        });

        if (existingProcedure) {
          console.log(`   ⏭️ Procedure already exists, skipping`);
          continue;
        }

        // Create the procedure
        const procedure = new Procedure({
          patientId: serviceRequest.patient._id,
          patientName: `${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`,
          procedureType: 'wound_care',
          procedureName: serviceRequest.service.name,
          description: `Wound care procedure - ${serviceRequest.service.name}`,
          status: 'scheduled',
          priority: 'normal',
          scheduledTime: serviceRequest.createdAt,
          duration: 30,
          assignedNurse: availableNurse._id,
          assignedNurseName: `${availableNurse.firstName} ${availableNurse.lastName}`,
          location: 'Ward',
          instructions: 'Wound care procedure as requested',
          preProcedureNotes: `Service request: ${serviceRequest._id}`,
          visitId: serviceRequest._id,
          createdBy: serviceRequest.createdBy || availableNurse._id,
          serviceRequestId: serviceRequest._id,
          invoiceId: serviceRequest.invoice?._id,
          amount: serviceRequest.service.price,
          currency: 'ETB',
          billingStatus: 'paid'
        });

        const savedProcedure = await procedure.save();
        createdProcedures.push(savedProcedure);
        
        console.log(`   ✅ Created procedure: ${savedProcedure._id}`);

        // Create notification for the nurse
        const nurseNotification = new Notification({
          title: 'New Wound Care Procedure',
          message: `New wound care procedure assigned for ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`,
          type: 'procedure_assigned',
          senderId: serviceRequest.createdBy || availableNurse._id,
          senderRole: 'system',
          recipientId: availableNurse._id,
          recipientRole: 'nurse',
          priority: 'medium',
          data: {
            procedureId: savedProcedure._id,
            patientId: serviceRequest.patient._id,
            patientName: `${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`,
            procedureName: serviceRequest.service.name,
            serviceRequestId: serviceRequest._id
          }
        });

        await nurseNotification.save();
        console.log(`   ✅ Created nurse notification`);

      } catch (error) {
        console.error(`   ❌ Error creating procedure for ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully created ${createdProcedures.length} procedures from service requests!`);
    
    if (createdProcedures.length > 0) {
      console.log('\n📋 Created procedures:');
      createdProcedures.forEach((proc, index) => {
        console.log(`   ${index + 1}. ${proc.patientName} - ${proc.procedureName} (${proc._id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createProceduresFromServiceRequests();
