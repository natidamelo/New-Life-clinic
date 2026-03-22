const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Procedure = require('../models/Procedure');
const ServiceRequest = require('../models/ServiceRequest');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Notification = require('../models/Notification');
const MedicalInvoice = require('../models/MedicalInvoice');
const Service = require('../models/Service');

async function createProceduresDirectly() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Creating procedures directly for known wound care service requests...');
    
    // Based on the previous output, we know these service request IDs exist
    const knownServiceRequestIds = [
      '68bc69eeaa79afd0de666c9a', // MR x
      '68bc6a15aa79afd0de666d30', // melody Natan
      '68bc8f9257e3ed4f1552a186'  // melody Natan
    ];

    // Find an available nurse
    const availableNurse = await User.findOne({ role: 'nurse' });
    if (!availableNurse) {
      console.log('❌ No nurses found in the system');
      return;
    }

    console.log(`✅ Found nurse: ${availableNurse.firstName} ${availableNurse.lastName}`);

    const createdProcedures = [];

    for (const serviceRequestId of knownServiceRequestIds) {
      try {
        console.log(`\n🔍 Processing service request: ${serviceRequestId}`);
        
        // Find the service request
        const serviceRequest = await ServiceRequest.findById(serviceRequestId)
          .populate('service')
          .populate('patient');

        if (!serviceRequest) {
          console.log(`   ❌ Service request not found`);
          continue;
        }

        console.log(`   Patient: ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`);
        console.log(`   Service: ${serviceRequest.service.name}`);
        console.log(`   Price: ${serviceRequest.service.price} ETB`);

        // Check if procedure already exists
        const existingProcedure = await Procedure.findOne({
          serviceRequestId: serviceRequest._id
        });

        if (existingProcedure) {
          console.log(`   ⏭️ Procedure already exists, skipping`);
          continue;
        }

        // Update service request status to completed
        if (serviceRequest.status !== 'completed') {
          serviceRequest.status = 'completed';
          await serviceRequest.save();
          console.log(`   ✅ Updated service request status to 'completed'`);
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
        console.error(`   ❌ Error processing service request ${serviceRequestId}:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully created ${createdProcedures.length} procedures!`);
    
    if (createdProcedures.length > 0) {
      console.log('\n📋 Created procedures:');
      createdProcedures.forEach((proc, index) => {
        console.log(`   ${index + 1}. ${proc.patientName} - ${proc.procedureName} (${proc._id})`);
      });
    }

    // Verify procedures were created
    const totalProcedures = await Procedure.countDocuments();
    console.log(`\n📊 Total procedures in database: ${totalProcedures}`);

    // Show all procedures
    const allProcedures = await Procedure.find({}).populate('patientId', 'firstName lastName');
    console.log('\n📋 All procedures in database:');
    allProcedures.forEach((proc, index) => {
      console.log(`   ${index + 1}. ${proc.patientName} - ${proc.procedureName} (${proc._id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createProceduresDirectly();
