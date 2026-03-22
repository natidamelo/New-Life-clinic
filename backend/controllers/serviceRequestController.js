// ServiceRequestController - Basic controller implementation

// @desc    Get all service requests
// @route   GET /api/service-requests
// @access  Private
const getServiceRequests = async (req, res) => {
  try {
    const ServiceRequest = require('../models/ServiceRequest');
    
    // Build query based on parameters
    const query = {};
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.patient) {
      query.patient = req.query.patient;
    }
    
    if (req.query.assignedNurse) {
      query.assignedNurse = req.query.assignedNurse;
    }
    
    if (req.query.assignedDoctor) {
      query.assignedDoctor = req.query.assignedDoctor;
    }
    
    // Get populated data if requested
    const populated = req.query.populated === 'true';
    
    let serviceRequests;
    if (populated) {
      serviceRequests = await ServiceRequest.find(query)
        .populate('patient', 'firstName lastName patientId')
        .populate('service', 'name price category')
        .populate('assignedNurse', 'firstName lastName')
        .populate('assignedDoctor', 'firstName lastName')
        .populate('orderedBy', 'firstName lastName')
        .populate('invoice', 'invoiceNumber total status')
        .sort({ createdAt: -1 });
    } else {
      serviceRequests = await ServiceRequest.find(query)
        .sort({ createdAt: -1 });
    }
    
    res.json({
      success: true,
      message: 'Service requests retrieved successfully',
      data: serviceRequests
    });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get service request by ID
// @route   GET /api/service-requests/:id
// @access  Private
const getServiceRequest = async (req, res) => {
  try {
    const ServiceRequest = require('../models/ServiceRequest');
    
    const serviceRequest = await ServiceRequest.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId')
      .populate('service', 'name price category')
      .populate('assignedNurse', 'firstName lastName')
      .populate('assignedDoctor', 'firstName lastName')
      .populate('orderedBy', 'firstName lastName')
      .populate('invoice', 'invoiceNumber total status');
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Service request retrieved successfully',
      data: serviceRequest
    });
  } catch (error) {
    console.error('Error fetching service request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new service request
// @route   POST /api/service-requests
// @access  Private
const createServiceRequest = async (req, res) => {
  try {
    console.log('🔍 [Service Request] Starting service request creation...');
    
    // Normalize incoming payload to support both old and new field names
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing user context'
      });
    }

    const body = req.body || {};
    const serviceId = body.serviceId || body.service;
    const assignedNurseId = body.assignedNurseId || body.assignedNurse;
    const patientId = body.patientId || body.patient;
    const patientInfo = body.patientInfo;
    const quantity = Math.max(1, Number(body.quantity || 1));
    const requestedSource = typeof body.source === 'string' ? body.source : undefined;
    const userRole = typeof req.user.role === 'string' ? req.user.role.toLowerCase() : '';
    const source =
      requestedSource && ['doctor', 'reception', 'nurse', 'admin'].includes(requestedSource)
        ? requestedSource
        : (['doctor', 'reception', 'nurse', 'admin'].includes(userRole) ? userRole : 'reception');
    const notes = typeof body.notes === 'string' ? body.notes : undefined;
    
    console.log('🔍 [Service Request] Creating service request:', {
      serviceId,
      assignedNurseId,
      patientId,
      patientInfo,
      quantity,
      source
    });

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service is required (serviceId)'
      });
    }

    console.log('🔍 [Service Request] Request user:', req.user);

    // Import required models
    console.log('🔍 [Service Request] Importing models...');
    const ServiceRequest = require('../models/ServiceRequest');
    const Service = require('../models/Service');
    const Patient = require('../models/Patient');
    const MedicalInvoice = require('../models/MedicalInvoice');
    const billingService = require('../services/billingService');
    const Notification = require('../models/Notification');
    console.log('✅ [Service Request] Models imported successfully');

    // Function to check if patient has valid card payment
    const checkCardPaymentStatus = async (patientId) => {
      try {
        const PatientCard = require('../models/PatientCard');
        const card = await PatientCard.findOne({ patient: patientId });

        if (!card) {
          console.log('❌ [Service Request] Patient has no card record');
          return { hasValidCard: false, card };
        }

        // Check if card is active and has been paid for
        const isValid = card.status === 'Active' && card.amountPaid > 0 && card.lastPaymentDate;

        console.log(`🔍 [Service Request] Card check - Status: ${card.status}, Amount Paid: ${card.amountPaid}, Valid: ${isValid}`);

        return { hasValidCard: isValid, card };
      } catch (error) {
        console.error('❌ [Service Request] Error checking card payment status:', error);
        return { hasValidCard: false, card: null };
      }
    };

    // Get service details
    console.log('🔍 [Service Request] Looking up service with ID:', serviceId);
    const service = await Service.findById(serviceId);
    if (!service) {
      console.log('❌ [Service Request] Service not found for ID:', serviceId);
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    // Validate service price to avoid invoice validation failure
    if (!service.price || service.price <= 0) {
      console.log('❌ [Service Request] Service has no valid price (> 0):', {
        serviceId: service._id,
        name: service.name,
        price: service.price
      });
      return res.status(400).json({
        success: false,
        message: 'Service price not configured. Please set a price for this service before creating a request.'
      });
    }
    console.log('✅ [Service Request] Found service:', service.name, 'Price:', service.price);

    let patient;
    
    // Handle patient - either existing or new
    if (patientId) {
      patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
    } else if (patientInfo) {
      // Create new patient
      const patientCount = await Patient.countDocuments();
      const patientIdNumber = `P${String(patientCount + 1).padStart(6, '0')}`;
      
      patient = new Patient({
        ...patientInfo,
        patientId: patientIdNumber,
        registrationDate: new Date(),
        status: 'scheduled' // Set to scheduled so they don't appear in patient queue, only registered for card
      });
      
      await patient.save();
      console.log('✅ [Service Request] Created new patient:', patient.patientId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Patient information is required'
      });
    }

    // Create service request
    const serviceRequest = new ServiceRequest({
      patient: patient._id,
      service: service._id,
      quantity,
      assignedNurse: assignedNurseId,
      assignedDoctor: userRole === 'doctor' ? req.user._id : undefined,
      status: 'pending',
      requestDate: new Date(),
      notes: notes || `Service request for ${service.name}`,
      source,
      orderedBy: req.user._id
    });

    // ✅ FIX: Add service to daily consolidated invoice (NOT a separate invoice)
    // This ensures all services for the patient on the same day are in ONE invoice
    let invoice = null;
    try {
      invoice = await billingService.addServiceToDailyInvoice(
        patient._id,
        'service',
        {
          description: service.name,
          serviceName: service.name,
          totalPrice: service.price * quantity,
          unitPrice: service.price,
          quantity,
          metadata: {
            serviceId: service._id, // ✅ CRITICAL: Pass serviceId for inventory deduction
            category: service.category,
            serviceRequestId: serviceRequest._id
          }
        },
        req.user._id
      );
      
      // Link the daily consolidated invoice to service request
      if (invoice && invoice._id) {
        serviceRequest.invoice = invoice._id;
        console.log('✅ [Service Request] Added service to daily consolidated invoice:', invoice.invoiceNumber);
      } else {
        console.warn('⚠️ [Service Request] Invoice created but no ID returned');
      }
    } catch (invoiceError) {
      console.error('⚠️ [Service Request] Error adding to daily invoice:', invoiceError);
      // Don't fail the service request if invoice creation fails
      // The service request will still be created, but without an invoice link
    }

    // Create payment notification for reception (only if invoice was created)
    if (invoice && invoice._id) {
      try {
        await new Notification({
          title: 'Service Payment Required',
          message: `Payment required for ${service.name}${quantity > 1 ? ` (x${quantity})` : ''} service for patient ${patient.firstName} ${patient.lastName}`,
          type: 'payment_required',
          priority: 'high',
          recipient: 'reception',
          senderId: req.user._id.toString(),
          senderRole: req.user.role,
          recipientRole: 'reception',
          data: {
            patientId: patient._id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            serviceId: service._id,
            serviceName: service.name,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: service.price * quantity,
            quantity,
            serviceRequestId: serviceRequest._id
          },
          createdBy: req.user._id
        }).save();

        console.log('✅ [Service Request] Created payment notification');
      } catch (notificationError) {
        console.error('⚠️ [Service Request] Error creating notification:', notificationError);
        // Don't fail the service request if notification creation fails
      }
    }

    // 🧪 CREATE LAB ORDER for lab services (only if invoice was created)
    if (service.category === 'lab' && invoice && invoice._id) {
      try {
        console.log('🧪 [Service Request] Creating lab order for lab service...');
        
        const LabOrder = require('../models/LabOrder');
        
        const labOrderData = {
          patientId: patient._id,
          testName: service.name,
          panelName: service.name,
          specimenType: 'Blood', // Default for lab tests
          orderDateTime: new Date(),
          status: 'Pending Payment', // Initial status
          paymentStatus: 'pending', // Initial payment status
          priority: 'Routine',
          notes: `Lab test ordered via service request - ${service.name}`,
          orderingDoctorId: req.user._id,
          source: 'reception', // Set source as reception for service requests
          createdBy: req.user._id, // Track who created the order
          totalPrice: service.price,
          metadata: {
            serviceRequestId: serviceRequest._id,
            serviceId: service._id,
            invoiceId: invoice._id,
            invoiceItemId: invoice.items && invoice.items[0] ? invoice.items[0]._id : null,
            createdAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const labOrder = new LabOrder(labOrderData);
        const savedLabOrder = await labOrder.save();

        console.log('✅ [Service Request] Created lab order:', savedLabOrder._id);

        // 📱 Send Telegram notification for lab order
        try {
          const notificationService = require('../services/notificationService');
          const telegramService = require('../services/telegramService');

          // Initialize telegram service
          await telegramService.initialize();

          if (telegramService.isInitialized) {
            console.log('📱 Sending lab order notification from service request...');

            const labNotification = await notificationService.sendNotification(
              'labOrder',
              {
                patientId: patient.patientId || patient._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                age: patient.age,
                gender: patient.gender,
                labTests: [{
                  name: savedLabOrder.testName,
                  type: savedLabOrder.specimenType || 'Lab Test'
                }]
              }
            );

            if (labNotification.success) {
              console.log('📱 Lab order notification sent from service request');
            } else {
              console.log('❌ Lab order notification failed from service request:', labNotification.message);
            }
          } else {
            console.log('📱 Telegram bot not initialized, skipping lab order notification');
          }
        } catch (telegramError) {
          console.error('❌ Error sending lab order notification from service request:', telegramError);
          // Don't fail service request creation if notification fails
        }

        // Update invoice item metadata to include the lab order ID
        if (invoice.items && invoice.items[0]) {
          if (!invoice.items[0].metadata) {
            invoice.items[0].metadata = {};
          }
          invoice.items[0].metadata.labOrderId = savedLabOrder._id;
          await invoice.save();
          console.log('✅ [Service Request] Updated invoice metadata with lab order ID');
        }
        
      } catch (labOrderError) {
        console.error('❌ [Service Request] Error creating lab order:', labOrderError);
        // Don't fail the service request if lab order creation fails
      }
    }

    // 💉 CREATE NURSE TASK for injection services (only if invoice was created)
    if (service.category === 'injection' && invoice && invoice._id) {
      try {
        console.log('💉 [Service Request] Creating nurse task for injection service...');
        
        const NurseTask = require('../models/NurseTask');
        
        const nurseTaskData = {
          patientId: patient._id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          taskType: 'PROCEDURE', // Use valid enum value
          description: `Administer ${service.name} injection`,
          priority: 'MEDIUM',
          status: 'PENDING',
          assignedBy: req.user._id, // Required field
          assignedByName: `${req.user.firstName} ${req.user.lastName}`,
          assignedTo: assignedNurseId || null,
          assignedToName: assignedNurseId ? 'Assigned Nurse' : null,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
          notes: `Injection service ordered via service request - ${service.name}`,
          serviceId: service._id,
          serviceName: service.name,
          metadata: {
            serviceRequestId: serviceRequest._id,
            serviceId: service._id,
            invoiceId: invoice._id,
            invoiceItemId: invoice.items && invoice.items[0] ? invoice.items[0]._id : null,
            serviceCategory: service.category,
            createdAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const nurseTask = new NurseTask(nurseTaskData);
        const savedNurseTask = await nurseTask.save();
        
        console.log('✅ [Service Request] Created nurse task:', savedNurseTask._id);
        
        // Update invoice item metadata to include the nurse task ID
        if (invoice.items && invoice.items[0]) {
          if (!invoice.items[0].metadata) {
            invoice.items[0].metadata = {};
          }
          invoice.items[0].metadata.nurseTaskId = savedNurseTask._id;
          await invoice.save();
          console.log('✅ [Service Request] Updated invoice metadata with nurse task ID');
        }

        // Check if patient has valid card payment before sending to nurse
        const cardCheck = await checkCardPaymentStatus(patient._id);

        if (cardCheck.hasValidCard) {
          // Update patient status to move them from reception queue to nurse interface
          patient.status = 'scheduled';
          patient.lastUpdated = new Date();
          await patient.save();

          console.log('✅ [Service Request] Updated patient status to scheduled - patient will now appear in nurse interface');
        } else {
          // Keep patient in waiting status - they need to pay for card first
          console.log('⏳ [Service Request] Patient has no valid card payment - keeping in waiting status for card payment');

          // Create card payment notification
          await new Notification({
            title: 'Card Payment Required',
            message: `Patient ${patient.firstName} ${patient.lastName} needs to pay for card before proceeding with ${service.name}`,
            type: 'card_payment_required',
            priority: 'high',
            recipient: 'reception',
            senderId: req.user._id.toString(),
            senderRole: req.user.role,
            recipientRole: 'reception',
            data: {
              patientId: patient._id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              serviceId: service._id,
              serviceName: service.name,
              requiredAction: 'card_payment'
            },
            createdBy: req.user._id
          }).save();
        }
        
      } catch (nurseTaskError) {
        console.error('❌ [Service Request] Error creating nurse task:', nurseTaskError);
        // Don't fail the service request if nurse task creation fails
      }
    }

    // 🩺 HANDLE VITAL SIGNS SERVICES - Create nurse task for blood pressure, etc.
    if ((service.category === 'vital_signs' || service.name.toLowerCase().includes('blood pressure') || service.name.toLowerCase().includes('vital signs')) && invoice && invoice._id) {
      try {
        console.log('🩺 [Service Request] Handling vital signs service - creating nurse task...');
        
        const NurseTask = require('../models/NurseTask');
        const User = require('../models/User');
        
        // Find an available nurse (for now, just get the first nurse)
        const nurse = await User.findOne({ role: 'nurse' }).select('_id firstName lastName');
        
        if (nurse) {
          // Create the nurse task for vital signs
          const nurseTaskData = {
            patientId: patient._id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            serviceName: service.name,
            serviceId: service._id,
            description: `Blood Pressure Check for ${patient.firstName} ${patient.lastName}`,
            taskType: 'VITAL_SIGNS',
            priority: 'MEDIUM',
            status: 'PENDING',
            assignedBy: req.user._id,
            assignedByName: `${req.user.firstName} ${req.user.lastName}`,
            assignedTo: nurse._id,
            assignedToName: `${nurse.firstName} ${nurse.lastName}`,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
            notes: `Blood Pressure Check requested for ${patient.firstName} ${patient.lastName}`,
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
            },
            vitalSignsOptions: {
              measurementType: 'blood_pressure',
              requiredFields: ['systolic', 'diastolic', 'position', 'arm'],
              fileType: 'single'
            },
            metadata: {
              serviceRequestId: serviceRequest._id,
              serviceId: service._id,
              invoiceId: invoice._id,
              invoiceItemId: invoice.items && invoice.items[0] ? invoice.items[0]._id : null,
              serviceCategory: service.category,
              createdAt: new Date()
            }
          };
          
          const nurseTask = new NurseTask(nurseTaskData);
          const savedNurseTask = await nurseTask.save();
          
          console.log('✅ [Service Request] Created vital signs nurse task:', savedNurseTask._id);
          
          // Update invoice item metadata to include the nurse task ID
          if (invoice.items && invoice.items[0]) {
            if (!invoice.items[0].metadata) {
              invoice.items[0].metadata = {};
            }
            invoice.items[0].metadata.nurseTaskId = savedNurseTask._id;
            await invoice.save();
            console.log('✅ [Service Request] Updated invoice metadata with nurse task ID');
          }

          // Check if patient has valid card payment before sending to nurse
          const cardCheck = await checkCardPaymentStatus(patient._id);

          if (cardCheck.hasValidCard) {
            // Update patient status to move them from reception queue to nurse interface
            patient.status = 'scheduled'; // Move from 'waiting' to 'scheduled' so they appear in nurse interface
            patient.lastUpdated = new Date();
            await patient.save();

            console.log('✅ [Service Request] Updated patient status to scheduled - patient will now appear in nurse interface');
          } else {
            // Keep patient in waiting status - they need to pay for card first
            console.log('⏳ [Service Request] Patient has no valid card payment - keeping in waiting status for card payment');

            // Create card payment notification
            await new Notification({
              title: 'Card Payment Required',
              message: `Patient ${patient.firstName} ${patient.lastName} needs to pay for card before proceeding with ${service.name}`,
              type: 'card_payment_required',
              priority: 'high',
              recipient: 'reception',
              senderId: req.user._id.toString(),
              senderRole: req.user.role,
              recipientRole: 'reception',
              data: {
                patientId: patient._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                serviceId: service._id,
                serviceName: service.name,
                requiredAction: 'card_payment'
              },
              createdBy: req.user._id
            }).save();
          }
          
          // Create a notification for the assigned nurse
          await new Notification({
            title: 'New Vital Signs Task',
            message: `New vital signs task assigned: ${service.name} for ${patient.firstName} ${patient.lastName}`,
            type: 'vital_signs_task',
            priority: 'high',
            recipient: nurse._id.toString(),
            senderId: req.user._id.toString(),
            senderRole: req.user.role,
            recipientRole: 'nurse',
            data: {
              patientId: patient._id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              serviceId: service._id,
              serviceName: service.name,
              serviceRequestId: serviceRequest._id,
              nurseTaskId: savedNurseTask._id,
              invoiceId: invoice._id
            },
            createdBy: req.user._id
          }).save();
          
          console.log('✅ [Service Request] Created vital signs notification for nurse');
          
        } else {
          console.log('⚠️ [Service Request] No nurse found to assign vital signs task to');

          // Check if patient has valid card payment before sending to nurse
          const cardCheck = await checkCardPaymentStatus(patient._id);

          if (cardCheck.hasValidCard) {
            // Still update patient status to scheduled even without nurse assignment
            patient.status = 'scheduled';
            patient.lastUpdated = new Date();
            await patient.save();

            console.log('✅ [Service Request] Updated patient status to scheduled - patient will now appear in nurse interface');
          } else {
            // Keep patient in waiting status - they need to pay for card first
            console.log('⏳ [Service Request] Patient has no valid card payment - keeping in waiting status for card payment');

            // Create card payment notification
            await new Notification({
              title: 'Card Payment Required',
              message: `Patient ${patient.firstName} ${patient.lastName} needs to pay for card before proceeding with ${service.name}`,
              type: 'card_payment_required',
              priority: 'high',
              recipient: 'reception',
              senderId: req.user._id.toString(),
              senderRole: req.user.role,
              recipientRole: 'reception',
              data: {
                patientId: patient._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                serviceId: service._id,
                serviceName: service.name,
                requiredAction: 'card_payment'
              },
              createdBy: req.user._id
            }).save();
          }
        }
          
      } catch (vitalSignsError) {
        console.error('❌ [Service Request] Error handling vital signs service:', vitalSignsError);
        // Don't fail the service request if vital signs task creation fails
      }
    }

    // 🩺 HANDLE CONSULTATION SERVICES - Assign to doctor
    if ((service.category === 'consultation' || service.category === 'follow-up') && invoice && invoice._id) {
      try {
        console.log('🩺 [Service Request] Handling consultation service - assigning to doctor...');
        
        const User = require('../models/User');
          
          // Check if a specific doctor is requested in the service request
          let doctor = null;
          
          // First, check if there's a preferred doctor specified in the request
          if (req.body.preferredDoctorId) {
            doctor = await User.findOne({ 
              _id: req.body.preferredDoctorId, 
              role: 'doctor' 
            }).select('_id firstName lastName');
            console.log(`🎯 [Service Request] Using preferred doctor: ${doctor ? doctor.firstName + ' ' + doctor.lastName : 'Not found'}`);
          }
          
          // If no preferred doctor or preferred doctor not found, try to find Dr. Girum specifically
          if (!doctor) {
            doctor = await User.findOne({ 
              $or: [
                { firstName: /girum/i },
                { lastName: /girum/i },
                { username: /girum/i }
              ],
              role: 'doctor' 
            }).select('_id firstName lastName');
            console.log(`🎯 [Service Request] Looking for Dr. Girum: ${doctor ? doctor.firstName + ' ' + doctor.lastName : 'Not found'}`);
          }
          
          // If Dr. Girum not found, fall back to any available doctor
          if (!doctor) {
            doctor = await User.findOne({ role: 'doctor' }).select('_id firstName lastName');
            console.log(`🎯 [Service Request] Using fallback doctor: ${doctor ? doctor.firstName + ' ' + doctor.lastName : 'No doctors available'}`);
          }
          
          if (doctor) {
            // Check if patient has valid card payment before sending to doctor
            const cardCheck = await checkCardPaymentStatus(patient._id);

            if (cardCheck.hasValidCard) {
              // Assign the patient to the doctor
              patient.assignedDoctorId = doctor._id;
              patient.status = 'scheduled'; // Set status to scheduled so it appears in doctor dashboard
              patient.lastUpdated = new Date();
              await patient.save();

              // Update the service request to include doctor assignment
              serviceRequest.assignedDoctor = doctor._id;
              await serviceRequest.save();

              console.log(`✅ [Service Request] Assigned consultation patient ${patient.firstName} ${patient.lastName} to doctor ${doctor.firstName} ${doctor.lastName}`);

              console.log('✅ [Service Request] Updated patient status to scheduled - patient will now appear in doctor interface');
            } else {
              // Keep patient in waiting status - they need to pay for card first
              console.log('⏳ [Service Request] Patient has no valid card payment - keeping in waiting status for card payment');

              // Create card payment notification
              await new Notification({
                title: 'Card Payment Required',
                message: `Patient ${patient.firstName} ${patient.lastName} needs to pay for card before proceeding with ${service.name}`,
                type: 'card_payment_required',
                priority: 'high',
                recipient: 'reception',
                senderId: req.user._id.toString(),
                senderRole: req.user.role,
                recipientRole: 'reception',
                data: {
                  patientId: patient._id,
                  patientName: `${patient.firstName} ${patient.lastName}`,
                  serviceId: service._id,
                  serviceName: service.name,
                  requiredAction: 'card_payment'
                },
                createdBy: req.user._id
              }).save();
            }
            
            // Create a notification for the doctor
            await new Notification({
              title: 'New Consultation Request',
              message: `New consultation request for ${patient.firstName} ${patient.lastName} - ${service.name}`,
              type: 'consultation_request',
              priority: 'high',
              recipient: doctor._id.toString(),
              senderId: req.user._id.toString(),
              senderRole: req.user.role,
              recipientRole: 'doctor',
              data: {
                patientId: patient._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                serviceId: service._id,
                serviceName: service.name,
                serviceRequestId: serviceRequest._id,
                invoiceId: invoice._id
              },
              createdBy: req.user._id
            }).save();
            
            console.log('✅ [Service Request] Created consultation notification for doctor');
            
          } else {
            console.log('⚠️ [Service Request] No doctor found to assign consultation to');

            // Check if patient has valid card payment before sending to doctor
            const cardCheck = await checkCardPaymentStatus(patient._id);

            if (cardCheck.hasValidCard) {
              // Still update patient status to scheduled even without doctor assignment
              patient.status = 'scheduled';
              patient.lastUpdated = new Date();
              await patient.save();

              console.log('✅ [Service Request] Updated patient status to scheduled - patient will now appear in doctor interface');
            } else {
              // Keep patient in waiting status - they need to pay for card first
              console.log('⏳ [Service Request] Patient has no valid card payment - keeping in waiting status for card payment');

              // Create card payment notification
              await new Notification({
                title: 'Card Payment Required',
                message: `Patient ${patient.firstName} ${patient.lastName} needs to pay for card before proceeding with ${service.name}`,
                type: 'card_payment_required',
                priority: 'high',
                recipient: 'reception',
                senderId: req.user._id.toString(),
                senderRole: req.user.role,
                recipientRole: 'reception',
                data: {
                  patientId: patient._id,
                  patientName: `${patient.firstName} ${patient.lastName}`,
                  serviceId: service._id,
                  serviceName: service.name,
                  requiredAction: 'card_payment'
                },
                createdBy: req.user._id
              }).save();
            }
          }
          
        } catch (consultationError) {
          console.error('❌ [Service Request] Error handling consultation service:', consultationError);
          // Don't fail the service request if consultation assignment fails
        }
    }

    // 🏥 HANDLE PROCEDURE SERVICES - Create procedure and assign to nurse
    if ((service.category === 'procedure' || service.name.toLowerCase().includes('wound') || service.name.toLowerCase().includes('dressing')) && invoice && invoice._id) {
      try {
        console.log('🏥 [Service Request] Handling procedure service - creating procedure...');
        
        const Procedure = require('../models/Procedure');
        const User = require('../models/User');
        
        // Find an available nurse (for now, just get the first nurse)
        // In a real system, you might want to implement load balancing or nurse availability
        const nurse = await User.findOne({ role: 'nurse' }).select('_id firstName lastName');
          
          if (nurse) {
            // Determine procedure type based on service name
            let procedureType = 'other';
            if (service.name.toLowerCase().includes('wound')) {
              procedureType = 'wound_care';
            } else if (service.name.toLowerCase().includes('dressing')) {
              procedureType = 'dressing_change';
            } else if (service.name.toLowerCase().includes('injection')) {
              procedureType = 'injection';
            } else if (service.name.toLowerCase().includes('catheter')) {
              procedureType = 'catheter_care';
            } else if (service.name.toLowerCase().includes('iv')) {
              procedureType = 'iv_care';
            }
            
            // Determine procedure duration based on service type
            let procedureDuration = 30; // Default 30 minutes
            if (procedureType === 'wound_care') {
              procedureDuration = 45; // Wound care typically takes longer
            } else if (procedureType === 'dressing_change') {
              procedureDuration = 20; // Dressing changes are usually quicker
            } else if (procedureType === 'injection') {
              procedureDuration = 10; // Injections are quick
            }
            
            // Create the procedure
            const procedure = new Procedure({
              patientId: patient._id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              procedureType: procedureType,
              procedureName: service.name,
              description: `Procedure - ${service.name}`,
              status: 'scheduled',
              priority: 'normal',
              scheduledTime: new Date(), // Schedule for now
              duration: procedureDuration,
              assignedNurse: nurse._id,
              assignedNurseName: `${nurse.firstName} ${nurse.lastName}`,
              location: 'Ward',
              instructions: `Procedure as requested - ${service.name}`,
              preProcedureNotes: `Service request: ${serviceRequest._id}`,
              visitId: serviceRequest._id,
              createdBy: req.user._id,
              // Link to the service request and invoice
              serviceRequestId: serviceRequest._id,
              invoiceId: invoice._id,
              amount: service.price,
              currency: 'ETB',
              billingStatus: 'pending'
            });

            const savedProcedure = await procedure.save();
            console.log(`✅ [Service Request] Created procedure ${savedProcedure._id} for patient ${patient.firstName} ${patient.lastName}`);

            // Check if patient has valid card payment before sending to nurse
            const cardCheck = await checkCardPaymentStatus(patient._id);

            if (cardCheck.hasValidCard) {
              // Update patient status to scheduled
              patient.status = 'scheduled';
              patient.lastUpdated = new Date();
              await patient.save();

              console.log('✅ [Service Request] Updated patient status to scheduled - patient will now appear in nurse interface');
            } else {
              // Keep patient in waiting status - they need to pay for card first
              console.log('⏳ [Service Request] Patient has no valid card payment - keeping in waiting status for card payment');

              // Create card payment notification
              await new Notification({
                title: 'Card Payment Required',
                message: `Patient ${patient.firstName} ${patient.lastName} needs to pay for card before proceeding with ${service.name}`,
                type: 'card_payment_required',
                priority: 'high',
                recipient: 'reception',
                senderId: req.user._id.toString(),
                senderRole: req.user.role,
                recipientRole: 'reception',
                data: {
                  patientId: patient._id,
                  patientName: `${patient.firstName} ${patient.lastName}`,
                  serviceId: service._id,
                  serviceName: service.name,
                  requiredAction: 'card_payment'
                },
                createdBy: req.user._id
              }).save();
            }
            
            // Create a notification for the assigned nurse
            await new Notification({
              title: 'New Procedure Assignment',
              message: `New procedure assigned: ${service.name} for ${patient.firstName} ${patient.lastName}`,
              type: 'procedure_assignment',
              priority: 'high',
              recipient: nurse._id.toString(),
              senderId: req.user._id.toString(),
              senderRole: req.user.role,
              recipientRole: 'nurse',
              data: {
                patientId: patient._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                serviceId: service._id,
                serviceName: service.name,
                serviceRequestId: serviceRequest._id,
                procedureId: savedProcedure._id,
                invoiceId: invoice._id
              },
              createdBy: req.user._id
            }).save();
            
            console.log('✅ [Service Request] Created procedure notification for nurse');
            
          } else {
            console.log('⚠️ [Service Request] No nurse found to assign procedure to');

            // Check if patient has valid card payment before sending to nurse
            const cardCheck = await checkCardPaymentStatus(patient._id);

            if (cardCheck.hasValidCard) {
              // Still update patient status to scheduled even without nurse assignment
              patient.status = 'scheduled';
              patient.lastUpdated = new Date();
              await patient.save();

              console.log('✅ [Service Request] Updated patient status to scheduled - patient will now appear in nurse interface');
            } else {
              // Keep patient in waiting status - they need to pay for card first
              console.log('⏳ [Service Request] Patient has no valid card payment - keeping in waiting status for card payment');

              // Create card payment notification
              await new Notification({
                title: 'Card Payment Required',
                message: `Patient ${patient.firstName} ${patient.lastName} needs to pay for card before proceeding with ${service.name}`,
                type: 'card_payment_required',
                priority: 'high',
                recipient: 'reception',
                senderId: req.user._id.toString(),
                senderRole: req.user.role,
                recipientRole: 'reception',
                data: {
                  patientId: patient._id,
                  patientName: `${patient.firstName} ${patient.lastName}`,
                  serviceId: service._id,
                  serviceName: service.name,
                  requiredAction: 'card_payment'
                },
                createdBy: req.user._id
              }).save();
            }
          }
          
      } catch (procedureError) {
        console.error('❌ [Service Request] Error handling procedure service:', procedureError);
        // Don't fail the service request if procedure creation fails
      }
    }

    // Save service request
    await serviceRequest.save();
    
    console.log('✅ [Service Request] Created service request:', serviceRequest._id);

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: {
        serviceRequest: serviceRequest._id,
        patient: {
          _id: patient._id,
          patientId: patient.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName
        },
        service: {
          _id: service._id,
          name: service.name,
          price: service.price
        },
        invoice: serviceRequest.invoice
      }
    });
    
  } catch (error) {
    console.error('❌ [Service Request] Error creating service request:', error);
    console.error('❌ [Service Request] Error stack:', error.stack);
    console.error('❌ [Service Request] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update service request
// @route   PUT /api/service-requests/:id
// @access  Private
const updateServiceRequest = async (req, res) => {
  try {
    const ServiceRequest = require('../models/ServiceRequest');
    
    const serviceRequest = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('patient', 'firstName lastName patientId')
    .populate('service', 'name price category')
    .populate('assignedNurse', 'firstName lastName')
    .populate('assignedDoctor', 'firstName lastName')
    .populate('orderedBy', 'firstName lastName')
    .populate('invoice', 'invoiceNumber total status');
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Service request updated successfully',
      data: serviceRequest
    });
  } catch (error) {
    console.error('Error updating service request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete service request
// @route   DELETE /api/service-requests/:id
// @access  Private
const deleteServiceRequest = async (req, res) => {
  try {
    const ServiceRequest = require('../models/ServiceRequest');
    
    const serviceRequest = await ServiceRequest.findByIdAndDelete(req.params.id);
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Service request deleted successfully',
      data: serviceRequest
    });
  } catch (error) {
    console.error('Error deleting service request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getServiceRequests,
  getServiceRequest,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest
};
