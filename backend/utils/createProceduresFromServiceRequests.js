const Procedure = require('../models/Procedure');
const ServiceRequest = require('../models/ServiceRequest');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Create procedures from paid service requests that don't have procedures yet
 */
async function createProceduresFromPaidServiceRequests() {
  try {
    console.log('🔍 [CREATE PROCEDURES] Starting to create procedures from paid service requests...');
    
    // Find all paid service requests that are procedures but don't have linked procedures
    const paidServiceRequests = await ServiceRequest.find({
      status: 'completed',
      'service.category': 'procedure',
      'service.name': { $regex: /wound/i } // Match wound care services
    })
    .populate('service')
    .populate('patient')
    .populate('invoice');

    console.log(`🔍 [CREATE PROCEDURES] Found ${paidServiceRequests.length} paid wound care service requests`);

    const createdProcedures = [];
    const errors = [];

    for (const serviceRequest of paidServiceRequests) {
      try {
        // Check if a procedure already exists for this service request
        const existingProcedure = await Procedure.findOne({
          serviceRequestId: serviceRequest._id
        });

        if (existingProcedure) {
          console.log(`⏭️ [CREATE PROCEDURES] Procedure already exists for service request ${serviceRequest._id}`);
          continue;
        }

        // Find an available nurse to assign
        let assignedNurse = null;
        let assignedNurseName = 'Unassigned';
        
        if (serviceRequest.assignedNurseId) {
          const nurse = await User.findById(serviceRequest.assignedNurseId);
          if (nurse && nurse.role === 'nurse') {
            assignedNurse = nurse._id;
            assignedNurseName = `${nurse.firstName} ${nurse.lastName}`;
          }
        }

        // If no assigned nurse, find any available nurse
        if (!assignedNurse) {
          const availableNurse = await User.findOne({ role: 'nurse' });
          if (availableNurse) {
            assignedNurse = availableNurse._id;
            assignedNurseName = `${availableNurse.firstName} ${availableNurse.lastName}`;
          }
        }

        // Calculate duration based on service type and complexity
        let procedureDuration = 30; // Default fallback
        const serviceName = serviceRequest.service.name.toLowerCase();
        
        if (serviceName.includes('simple') || serviceName.includes('basic')) {
          procedureDuration = 15;
        } else if (serviceName.includes('complex') || serviceName.includes('advanced')) {
          procedureDuration = 60;
        } else if (serviceName.includes('dressing') && serviceName.includes('change')) {
          procedureDuration = 20;
        } else if (serviceName.includes('assessment') || serviceName.includes('evaluation')) {
          procedureDuration = 45;
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
          scheduledTime: serviceRequest.createdAt, // Use service request creation time
          duration: procedureDuration, // Intelligent duration based on service type
          assignedNurse: assignedNurse,
          assignedNurseName: assignedNurseName,
          location: 'Ward',
          instructions: 'Wound care procedure as requested',
          preProcedureNotes: `Service request: ${serviceRequest._id}`,
          visitId: serviceRequest._id,
          createdBy: serviceRequest.createdBy || serviceRequest.assignedNurseId,
          // Link to the service request and invoice
          serviceRequestId: serviceRequest._id,
          invoiceId: serviceRequest.invoice?._id,
          amount: serviceRequest.service.price,
          currency: 'ETB',
          billingStatus: 'paid' // Already paid
        });

        const savedProcedure = await procedure.save();
        createdProcedures.push(savedProcedure);
        
        console.log(`✅ [CREATE PROCEDURES] Created procedure ${savedProcedure._id} for patient ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`);

        // Create notification for the assigned nurse
        if (assignedNurse) {
          const nurseNotification = new Notification({
            title: 'New Wound Care Procedure',
            message: `New wound care procedure assigned for ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`,
            type: 'procedure_assigned',
            senderId: serviceRequest.createdBy || serviceRequest.assignedNurseId,
            senderRole: 'system',
            recipientId: assignedNurse,
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
          console.log(`✅ [CREATE PROCEDURES] Created nurse notification for procedure ${savedProcedure._id}`);
        }

      } catch (error) {
        console.error(`❌ [CREATE PROCEDURES] Error creating procedure for service request ${serviceRequest._id}:`, error);
        errors.push({
          serviceRequestId: serviceRequest._id,
          patientName: `${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Created ${createdProcedures.length} procedures from paid service requests`,
      createdProcedures: createdProcedures.length,
      errors: errors.length,
      details: {
        created: createdProcedures.map(p => ({
          id: p._id,
          patientName: p.patientName,
          procedureName: p.procedureName
        })),
        errors: errors
      }
    };

  } catch (error) {
    console.error('❌ [CREATE PROCEDURES] Error in createProceduresFromPaidServiceRequests:', error);
    return {
      success: false,
      message: 'Failed to create procedures from service requests',
      error: error.message
    };
  }
}

/**
 * Create procedure for a specific patient (like Melody)
 */
async function createProcedureForPatient(patientName) {
  try {
    console.log(`🔍 [CREATE PROCEDURES] Looking for paid wound care services for patient: ${patientName}`);
    
    // Find the patient
    const patient = await Patient.findOne({
      $or: [
        { firstName: { $regex: new RegExp(patientName, 'i') } },
        { lastName: { $regex: new RegExp(patientName, 'i') } },
        { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: patientName, options: 'i' } } }
      ]
    });

    if (!patient) {
      return {
        success: false,
        message: `Patient not found: ${patientName}`
      };
    }

    console.log(`✅ [CREATE PROCEDURES] Found patient: ${patient.firstName} ${patient.lastName}`);

    // Find paid wound care service requests for this patient
    const serviceRequests = await ServiceRequest.find({
      patient: patient._id,
      status: 'completed',
      'service.category': 'procedure',
      'service.name': { $regex: /wound/i }
    })
    .populate('service')
    .populate('invoice');

    console.log(`🔍 [CREATE PROCEDURES] Found ${serviceRequests.length} paid wound care service requests for ${patient.firstName} ${patient.lastName}`);

    if (serviceRequests.length === 0) {
      return {
        success: false,
        message: `No paid wound care service requests found for patient: ${patient.firstName} ${patient.lastName}`
      };
    }

    const createdProcedures = [];

    for (const serviceRequest of serviceRequests) {
      // Check if procedure already exists
      const existingProcedure = await Procedure.findOne({
        serviceRequestId: serviceRequest._id
      });

      if (existingProcedure) {
        console.log(`⏭️ [CREATE PROCEDURES] Procedure already exists for service request ${serviceRequest._id}`);
        continue;
      }

      // Find an available nurse
      let assignedNurse = null;
      let assignedNurseName = 'Unassigned';
      
      const availableNurse = await User.findOne({ role: 'nurse' });
      if (availableNurse) {
        assignedNurse = availableNurse._id;
        assignedNurseName = `${availableNurse.firstName} ${availableNurse.lastName}`;
      }

      // Calculate duration based on service type and complexity
      let procedureDuration = 30; // Default fallback
      const serviceName = serviceRequest.service.name.toLowerCase();
      
      if (serviceName.includes('simple') || serviceName.includes('basic')) {
        procedureDuration = 15;
      } else if (serviceName.includes('complex') || serviceName.includes('advanced')) {
        procedureDuration = 60;
      } else if (serviceName.includes('dressing') && serviceName.includes('change')) {
        procedureDuration = 20;
      } else if (serviceName.includes('assessment') || serviceName.includes('evaluation')) {
        procedureDuration = 45;
      }

      // Create the procedure
      const procedure = new Procedure({
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        procedureType: 'wound_care',
        procedureName: serviceRequest.service.name,
        description: `Wound care procedure - ${serviceRequest.service.name}`,
        status: 'scheduled',
        priority: 'normal',
        scheduledTime: serviceRequest.createdAt,
        duration: procedureDuration, // Intelligent duration based on service type
        assignedNurse: assignedNurse,
        assignedNurseName: assignedNurseName,
        location: 'Ward',
        instructions: 'Wound care procedure as requested',
        preProcedureNotes: `Service request: ${serviceRequest._id}`,
        visitId: serviceRequest._id,
        createdBy: serviceRequest.createdBy || serviceRequest.assignedNurseId,
        serviceRequestId: serviceRequest._id,
        invoiceId: serviceRequest.invoice?._id,
        amount: serviceRequest.service.price,
        currency: 'ETB',
        billingStatus: 'paid'
      });

      const savedProcedure = await procedure.save();
      createdProcedures.push(savedProcedure);
      
      console.log(`✅ [CREATE PROCEDURES] Created procedure ${savedProcedure._id} for ${patient.firstName} ${patient.lastName}`);
    }

    return {
      success: true,
      message: `Created ${createdProcedures.length} procedures for ${patient.firstName} ${patient.lastName}`,
      patientName: `${patient.firstName} ${patient.lastName}`,
      createdProcedures: createdProcedures.length,
      procedures: createdProcedures.map(p => ({
        id: p._id,
        procedureName: p.procedureName,
        status: p.status,
        assignedNurse: p.assignedNurseName
      }))
    };

  } catch (error) {
    console.error(`❌ [CREATE PROCEDURES] Error creating procedure for patient ${patientName}:`, error);
    return {
      success: false,
      message: `Failed to create procedure for patient: ${patientName}`,
      error: error.message
    };
  }
}

module.exports = {
  createProceduresFromPaidServiceRequests,
  createProcedureForPatient
};
