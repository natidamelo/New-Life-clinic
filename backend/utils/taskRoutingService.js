/**
 * Task Routing Service
 * 
 * This service properly routes tasks to the correct departments based on service type:
 * - Lab tests → Lab department
 * - Imaging/ultrasound → Imaging department  
 * - Injections/medications → Nurse department
 * - Procedures → Nurse department
 * - Consultations → Doctor department
 */

const NurseTask = require('../models/NurseTask');
const LabOrder = require('../models/LabOrder');
const ImagingOrder = require('../models/ImagingOrder');
const Notification = require('../models/Notification');

/**
 * Determine the correct task type and department for a service
 * @param {Object} service - The service object
 * @returns {Object} - Task routing information
 */
function determineTaskRouting(service) {
  const category = service.category?.toLowerCase() || '';
  const serviceName = service.name?.toLowerCase() || '';
  
  // Vital signs services (nurse-performed)
  if (category === 'vital_signs' || 
      serviceName.includes('blood pressure') || 
      serviceName.includes('vital signs') ||
      serviceName.includes('temperature') ||
      serviceName.includes('pulse') ||
      serviceName.includes('weight') ||
      serviceName.includes('height')) {
    return {
      department: 'nurse',
      taskType: 'VITAL_SIGNS',
      shouldCreateNurseTask: true,
      shouldCreateLabOrder: false,
      shouldCreateImagingOrder: false
    };
  }
  
  // Lab and blood test services
  if (category === 'lab' || category === 'blood_test' || 
      serviceName.includes('blood') || serviceName.includes('test') ||
      serviceName.includes('glucose') || serviceName.includes('hemoglobin') ||
      serviceName.includes('urinalysis') || serviceName.includes('pcr')) {
    return {
      department: 'lab',
      taskType: 'LAB_TEST',
      shouldCreateNurseTask: false,
      shouldCreateLabOrder: true,
      shouldCreateImagingOrder: false
    };
  }
  
  // Imaging and ultrasound services
  if (category === 'ultrasound' || category === 'imaging' || 
      serviceName.includes('ultrasound') || serviceName.includes('x-ray') ||
      serviceName.includes('scan') || serviceName.includes('imaging')) {
    return {
      department: 'imaging',
      taskType: 'IMAGING',
      shouldCreateNurseTask: false,
      shouldCreateLabOrder: false,
      shouldCreateImagingOrder: true
    };
  }
  
  // Injection and medication services
  if (category === 'injection' || 
      serviceName.includes('injection') || serviceName.includes('depo') ||
      serviceName.includes('vaccine') || serviceName.includes('medication')) {
    return {
      department: 'nurse',
      taskType: 'MEDICATION',
      shouldCreateNurseTask: true,
      shouldCreateLabOrder: false,
      shouldCreateImagingOrder: false
    };
  }
  
  // Medical procedures (non-lab, non-imaging)
  if (category === 'procedure' || 
      serviceName.includes('procedure') || serviceName.includes('treatment')) {
    return {
      department: 'nurse',
      taskType: 'PROCEDURE',
      shouldCreateNurseTask: true,
      shouldCreateLabOrder: false,
      shouldCreateImagingOrder: false
    };
  }
  
  // Consultation services
  if (category === 'consultation' || category === 'follow-up') {
    return {
      department: 'doctor',
      taskType: 'CONSULTATION',
      shouldCreateNurseTask: false,
      shouldCreateLabOrder: false,
      shouldCreateImagingOrder: false
    };
  }
  
  // Default fallback
  return {
    department: 'nurse',
    taskType: 'OTHER',
    shouldCreateNurseTask: true,
    shouldCreateLabOrder: false,
    shouldCreateImagingOrder: false
  };
}

/**
 * Create appropriate tasks based on service type
 * @param {Object} params - Task creation parameters
 * @returns {Object} - Created tasks
 */
async function createAppropriateTasks(params) {
  const {
    patient,
    service,
    invoice,
    serviceRequest,
    assignedNurseId,
    assignedNurseName,
    assignedBy,
    assignedByName
  } = params;
  
  const routing = determineTaskRouting(service);
  const createdTasks = {
    nurseTask: null,
    labOrder: null,
    imagingOrder: null
  };
  
  console.log(`🔍 [TASK ROUTING] Service: ${service.name}, Category: ${service.category}`);
  console.log(`🔍 [TASK ROUTING] Routing to: ${routing.department}, Task Type: ${routing.taskType}`);
  
  // Create nurse task if needed
  if (routing.shouldCreateNurseTask) {
    try {
      // Check for existing nurse task to prevent duplicates
      const existingTask = await NurseTask.findOne({
        patientId: patient._id,
        serviceId: service._id,
        taskType: routing.taskType,
        status: { $in: ['PENDING', 'IN_PROGRESS'] }
      });
      
      if (!existingTask) {
        const nurseTask = new NurseTask({
          patientId: patient._id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          taskType: routing.taskType,
          description: routing.taskType === 'MEDICATION' 
            ? `Administer ${service.name}`
            : `Prepare patient for ${service.name} - ${patient.firstName} ${patient.lastName}`,
          status: 'PENDING',
          priority: 'MEDIUM',
          assignedBy: assignedBy,
          assignedByName: assignedByName,
          assignedTo: assignedNurseId,
          assignedToName: assignedNurseName,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          notes: `Service payment completed. Patient ready for ${service.name}.`,
          relatedServiceRequest: serviceRequest._id,
          serviceId: service._id,
          serviceName: service.name,
          servicePrice: service.price,
          paymentAuthorization: {
            paidDays: 1,
            totalDays: 1,
            paymentStatus: 'paid',
            canAdminister: true,
            authorizedDoses: 1,
            unauthorizedDoses: 0,
            outstandingAmount: 0,
            totalCost: service.price,
            amountPaid: service.price,
            lastUpdated: new Date()
          }
        });
        
        await nurseTask.save();
        createdTasks.nurseTask = nurseTask;
        console.log(`✅ Created nurse task for ${service.name}`);
      } else {
        console.log(`⚠️ Nurse task already exists for ${service.name}, skipping creation`);
      }
    } catch (error) {
      console.error(`❌ Error creating nurse task for ${service.name}:`, error);
    }
  }
  
  // Create lab order if needed
  if (routing.shouldCreateLabOrder) {
    try {
      const labOrder = new LabOrder({
        patientId: patient._id,
        orderingDoctorId: assignedBy,
        testName: service.name,
        orderDateTime: new Date(),
        status: 'Ordered',
        paymentStatus: 'paid',
        serviceRequestId: serviceRequest._id,
        invoiceId: invoice._id,
        serviceId: service._id,
        servicePrice: service.price,
        totalPrice: service.price,
        notes: `Lab order for ${service.name} created after payment. Invoice: ${invoice.invoiceNumber}`
      });
      
      await labOrder.save();
      createdTasks.labOrder = labOrder;
      console.log(`✅ Created lab order for ${service.name}`);
    } catch (error) {
      console.error(`❌ Error creating lab order for ${service.name}:`, error);
    }
  }
  
  // Create imaging order if needed
  if (routing.shouldCreateImagingOrder) {
    try {
      const imagingOrder = new ImagingOrder({
        patientId: patient._id,
        orderingDoctorId: assignedBy,
        imagingType: service.name,
        orderDateTime: new Date(),
        status: 'Ordered',
        paymentStatus: 'paid',
        serviceRequestId: serviceRequest._id,
        invoiceId: invoice._id,
        serviceId: service._id,
        servicePrice: service.price,
        totalPrice: service.price,
        notes: `Imaging order for ${service.name} created after payment. Invoice: ${invoice.invoiceNumber}`
      });
      
      await imagingOrder.save();
      createdTasks.imagingOrder = imagingOrder;
      console.log(`✅ Created imaging order for ${service.name}`);
    } catch (error) {
      console.error(`❌ Error creating imaging order for ${service.name}:`, error);
    }
  }
  
  // Create notification for the appropriate department
  try {
    const notification = new Notification({
      title: 'Service Ready',
      message: `${service.name} for ${patient.firstName} ${patient.lastName} is ready. Payment completed.`,
      type: 'service_ready',
      senderId: assignedBy,
      senderRole: 'reception',
      recipientRole: routing.department === 'lab' ? 'lab' : 
                    routing.department === 'imaging' ? 'imaging' : 
                    routing.department === 'doctor' ? 'doctor' : 'nurse',
      priority: 'medium',
      data: {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        serviceRequestId: serviceRequest._id,
        serviceName: service.name,
        serviceCategory: service.category,
        department: routing.department,
        taskType: routing.taskType
      }
    });
    
    await notification.save();
    console.log(`✅ Created notification for ${routing.department} department`);
  } catch (error) {
    console.error(`❌ Error creating notification:`, error);
  }
  
  return createdTasks;
}

/**
 * Clean up existing misrouted tasks
 * @param {string} patientId - Patient ID
 * @param {string} serviceId - Service ID
 */
async function cleanupMisroutedTasks(patientId, serviceId) {
  try {
    // Find and remove nurse tasks that should be lab orders
    const labServices = await NurseTask.find({
      patientId: patientId,
      serviceId: serviceId,
      $or: [
        { description: { $regex: /blood/i } },
        { description: { $regex: /test/i } },
        { description: { $regex: /lab/i } },
        { description: { $regex: /glucose/i } },
        { description: { $regex: /hemoglobin/i } }
      ]
    });
    
    for (const task of labServices) {
      console.log(`🗑️ Removing misrouted lab task: ${task.description}`);
      await NurseTask.findByIdAndDelete(task._id);
    }
    
    // Find and remove nurse tasks that should be imaging orders
    const imagingServices = await NurseTask.find({
      patientId: patientId,
      serviceId: serviceId,
      $or: [
        { description: { $regex: /ultrasound/i } },
        { description: { $regex: /x-ray/i } },
        { description: { $regex: /scan/i } },
        { description: { $regex: /imaging/i } }
      ]
    });
    
    for (const task of imagingServices) {
      console.log(`🗑️ Removing misrouted imaging task: ${task.description}`);
      await NurseTask.findByIdAndDelete(task._id);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up misrouted tasks:', error);
  }
}

module.exports = {
  determineTaskRouting,
  createAppropriateTasks,
  cleanupMisroutedTasks
}; 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 