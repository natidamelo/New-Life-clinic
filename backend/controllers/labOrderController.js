const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const mongoose = require('mongoose');

// @desc    Get all lab orders
// @route   GET /api/lab-orders
// @access  Private
const getLabOrders = async (req, res) => {
  try {
    console.log('Fetching lab orders from database...');
    
    // Get query parameters
    const { status, patientId } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Filter by payment status - show all orders for lab dashboard (including pending)
    if (status === 'all') {
      // Show all orders regardless of payment status
      filter = {};
    } else {
      // Default behavior: show all orders for lab processing (paid, pending, and partially paid)
      filter = {
        $or: [
          { paymentStatus: 'paid' },
          { paymentStatus: 'pending' }, // Include pending orders
          { paymentStatus: 'partially_paid' },
          { paymentStatus: 'partial' } // Alternative naming
        ]
      };
    }
    
    // Filter by patient if specified
    if (patientId) {
      filter.patientId = patientId;
    }
    
    console.log('Lab orders filter:', JSON.stringify(filter, null, 2));
    
    // Debug: First check all lab orders to see what payment statuses exist
    const allLabOrders = await LabOrder.find({}).select('paymentStatus testName patientId').limit(20);
    const allPaymentStatuses = [...new Set(allLabOrders.map(order => order.paymentStatus))];
    console.log('All payment statuses in database:', allPaymentStatuses);
    console.log('Sample orders by payment status:');
    allPaymentStatuses.forEach(status => {
      const ordersWithStatus = allLabOrders.filter(order => order.paymentStatus === status);
      console.log(`  ${status}: ${ordersWithStatus.length} orders`);
      if (ordersWithStatus.length > 0) {
        console.log(`    Example: ${ordersWithStatus[0].testName} (Patient: ${ordersWithStatus[0].patientId})`);
      }
    });
    
    // Fetch lab orders with populated fields
    const labOrders = await LabOrder.find(filter)
      .populate('patient', 'firstName lastName patientId')
      .populate('orderingDoctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(100); // Limit to prevent performance issues
    
    console.log(`Found ${labOrders.length} lab orders matching filter`);
    
    // Debug: Log payment statuses found
    const paymentStatuses = [...new Set(labOrders.map(order => order.paymentStatus))];
    console.log('Payment statuses found in lab orders:', paymentStatuses);
    
    // Debug: Log first few orders to see their structure
    if (labOrders.length > 0) {
      console.log('First lab order structure:', JSON.stringify(labOrders[0], null, 2));
      console.log('First lab order paymentStatus:', labOrders[0].paymentStatus);
      console.log('First lab order patientId:', labOrders[0].patientId);
      console.log('First lab order patient (populated):', labOrders[0].patient);
    }
    
    // Transform the data to ensure consistent patient information
    const transformedOrders = await Promise.all(labOrders.map(async (order, index) => {
      let patientData = order.patient;
      
      console.log(`Processing lab order ${index + 1}:`, {
        orderId: order._id,
        testName: order.testName,
        paymentStatus: order.paymentStatus,
        patientId: order.patientId,
        patientPopulated: !!patientData,
        patientFirstName: patientData?.firstName
      });
      
      // If populate didn't work, manually fetch patient data
      if (!patientData || !patientData.firstName) {
        console.log(`Patient data not populated for order ${order._id}, attempting manual fetch...`);
        const patientId = order.patientId;
        if (patientId && typeof patientId === 'object' && patientId._id) {
          patientData = await Patient.findById(patientId._id).select('firstName lastName patientId');
        } else if (patientId && typeof patientId === 'string' && patientId.startsWith('P')) {
          // If it's a patient ID string, find by patientId
          patientData = await Patient.findOne({ patientId: patientId }).select('firstName lastName patientId');
        } else if (mongoose.Types.ObjectId.isValid(patientId)) {
          // If it's a valid ObjectId, find by _id
          patientData = await Patient.findById(patientId).select('firstName lastName patientId');
        }
        
        console.log(`Manual patient fetch result for order ${order._id}:`, {
          found: !!patientData,
          firstName: patientData?.firstName,
          lastName: patientData?.lastName
        });
      }
      
      // If we still don't have patient data, create a minimal patient object
      if (!patientData) {
        console.warn(`No patient data found for lab order ${order._id}, creating minimal patient info`);
        patientData = {
          _id: order.patientId,
          firstName: 'Unknown',
          lastName: 'Patient',
          patientId: order.patientId
        };
      }
      
      return {
        ...order.toObject(),
        patient: patientData,
        patientId: patientData?._id || order.patientId
      };
    }));
    
    res.json({
      success: true,
      message: `Found ${transformedOrders.length} lab orders`,
      count: transformedOrders.length,
      data: transformedOrders
    });
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create lab order
// @route   POST /api/lab-orders
// @access  Private
const createLabOrder = async (req, res) => {
  try {
    console.log('Creating single lab order:', req.body);
    
    const { patientId, visitId, testName, panelName, specimenType, priority, notes } = req.body;
    
    // Validate required fields
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    if (!testName) {
      return res.status(400).json({
        success: false,
        message: 'Test name is required'
      });
    }
    
    // 🔒 DUPLICATE PREVENTION: Check for existing pending lab order
    const existingOrder = await LabOrder.findOne({
      patientId: patientId,
      testName: testName,
      paymentStatus: 'pending',
      status: { $in: ['Pending Payment', 'Ordered', 'In Progress'] }
    });
    
    if (existingOrder) {
      console.log(`⚠️ Duplicate lab order prevented: ${testName} for patient ${patientId}`);
      
      // Notification existence check removed
      
      // Instead of blocking, allow the order but log a warning
      console.log(`⚠️ Allowing duplicate order but warning user about existing pending order for ${testName}`);
      // Continue with order creation instead of returning error
    }
    
    const currentTime = new Date();
    
    // 🔍 FETCH REAL PRICE FROM INVENTORY
    let testPrice = 200; // Default fallback price
    try {
      const LabPricingService = require('../services/labPricingService');
      const inventoryPrice = await LabPricingService.findInventoryPrice(testName);
      
      if (inventoryPrice && inventoryPrice.price > 0) {
        // Round to 2 decimal places to ensure consistency and prevent floating point issues
        testPrice = Math.round(inventoryPrice.price * 100) / 100;
        console.log(`✅ Found inventory price for ${testName}: ${inventoryPrice.price} → rounded to ${testPrice}`);
      } else {
        // Try with default pricing service
        testPrice = LabPricingService.getDefaultPrice(testName) || 200;
        console.log(`⚠️ No inventory price found for ${testName}, using default: ${testPrice}`);
      }
    } catch (inventoryError) {
      console.error('Error fetching inventory price:', inventoryError.message);
      console.log(`⚠️ Using default price for ${testName}: ${testPrice}`);
    }
    
    const labOrderData = {
      patientId: patientId,
      visitId: visitId || null,
      testName: testName,
      panelName: panelName || null,
      specimenType: specimenType || 'Blood', // Default to Blood
      orderDateTime: currentTime,
      status: 'Pending Payment', // Initial status
      paymentStatus: 'pending', // Initial payment status
      priority: priority || 'Routine',
      notes: notes || '',
      orderingDoctorId: req.user._id, // Use the authenticated user as the ordering doctor
      totalPrice: testPrice, // Use real price from inventory (already rounded)
      createdAt: currentTime,
      updatedAt: currentTime
    };
    
    const labOrder = new LabOrder(labOrderData);
    const savedOrder = await labOrder.save();
    
    // Populate the saved order with patient and doctor information
    const populatedOrder = await LabOrder.findById(savedOrder._id)
      .populate('patient', 'firstName lastName patientId')
      .populate('orderingDoctorId', 'firstName lastName');
    
    console.log('Successfully created lab order:', populatedOrder._id);
    
    // 🔧 RESTORED: Create invoice and notification for single lab order
    console.log(`🎯 [SINGLE] Starting invoice creation process for lab order: ${populatedOrder.testName}`);
    try {
      const Patient = require('../models/Patient');
      const MedicalInvoice = require('../models/MedicalInvoice');
      const Notification = require('../models/Notification');
      
      // Find patient for invoice creation
      let patient = null;
      console.log(`🔍 [Single] Looking for patient with ID: ${patientId} (type: ${typeof patientId})`);
      
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        patient = await Patient.findById(patientId);
        console.log(`📋 [Single] Patient lookup by ObjectId: ${patient ? 'Found' : 'Not found'}`);
      } else {
        patient = await Patient.findOne({ patientId: patientId });
        console.log(`📋 [Single] Patient lookup by patientId: ${patient ? 'Found' : 'Not found'}`);
      }
      
      if (patient) {
        console.log(`✅ [Single] Found patient: ${patient.firstName} ${patient.lastName}`);
        
        // Use billing service to add lab to daily consolidated invoice
        const billingService = require('../services/billingService');
        
        let invoice = null;
        try {
          console.log(`🔍 [Single] Calling addServiceToDailyInvoice for patient ${patient._id}, lab test: ${populatedOrder.testName}`);
          invoice = await billingService.addServiceToDailyInvoice(
            patient._id,
            'lab',
            {
              description: `Lab test: ${populatedOrder.testName}`,
              testName: populatedOrder.testName,
              totalPrice: populatedOrder.totalPrice || 0,
              unitPrice: populatedOrder.totalPrice || 0,
              quantity: 1,
              labOrderId: populatedOrder._id,
              metadata: {
                labOrderId: populatedOrder._id,
                testName: populatedOrder.testName
              }
            },
            req.user._id
          );
          
          if (!invoice) {
            throw new Error('Invoice creation returned null');
          }
          
          // Link lab order to invoice
          populatedOrder.serviceRequestId = invoice._id;
          populatedOrder.invoiceId = invoice._id;
          await populatedOrder.save();
          
          console.log(`✅ [Single] Successfully added lab test to invoice ${invoice.invoiceNumber} (ID: ${invoice._id})`);
          console.log(`   Invoice details: patient=${invoice.patientName}, total=${invoice.total}, status=${invoice.status}, finalized=${invoice.finalized}`);
        } catch (invoiceError) {
          console.error('❌ [Single] Error adding lab to daily invoice:', invoiceError);
          console.error('   Error stack:', invoiceError.stack);
          // Continue without failing the lab order creation, but log the error
        }
        
        // Create notification for reception (only if invoice was created successfully)
        if (invoice && invoice._id) {
          try {
            const notificationData = {
              type: 'lab_payment_required',
              title: 'Lab Payment Required',
              message: `Payment required for lab test: ${populatedOrder.testName}`,
              recipientRole: 'reception',
              senderRole: 'doctor',
              senderId: req.user._id,
              data: {
                labOrderIds: [populatedOrder._id],
                patientId: patient._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                testNames: [populatedOrder.testName],
                amount: populatedOrder.totalPrice || 0,
                totalAmount: populatedOrder.totalPrice || 0,
                itemCount: 1,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                tests: [{
                  testName: populatedOrder.testName,
                  price: populatedOrder.totalPrice || 0,
                  labOrderId: populatedOrder._id
                }],
                paymentStatus: 'pending'
              },
              priority: 'high',
              read: false
            };
            
            const notification = new Notification(notificationData);
            await notification.save();
            
            console.log(`✅ [Single] Created notification for ${patient.firstName} ${patient.lastName}: ${populatedOrder.totalPrice || 0} ETB`);
          } catch (notificationError) {
            console.error('❌ [Single] Error creating notification:', notificationError);
            // Don't fail if notification creation fails
          }
        } else {
          console.warn(`⚠️ [Single] No invoice created, skipping notification creation for lab order ${populatedOrder._id}`);
        }

        // Write to patient history: create or update a draft medical record with "Lab ordered: ..."
        try {
          const doctorId = req.user._id;
          const doctorName = (req.user.firstName && req.user.lastName) ? `${req.user.firstName} ${req.user.lastName}` : (req.user.username || 'Doctor');
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const patientObjId = patient._id;

          let record = await MedicalRecord.findOne({
            patient: patientObjId,
            status: 'Draft',
            createdBy: doctorId,
            createdAt: { $gte: todayStart }
          }).sort({ createdAt: -1 });

          const labOrderLine = `Lab ordered: ${populatedOrder.testName}.`;
          if (record) {
            const existingPlan = record.plan || record.assessment?.plan || '';
            record.plan = existingPlan.trim() ? `${existingPlan.trim()}\n${labOrderLine}` : labOrderLine;
            if (record.assessment && typeof record.assessment === 'object') {
              record.assessment.plan = record.plan;
            }
            record.updatedAt = new Date();
            record.lastUpdatedBy = doctorId;
            await record.save();
            console.log(`✅ [Single] Updated draft medical record ${record._id} with lab order: ${populatedOrder.testName}`);
          } else {
            record = await MedicalRecord.create({
              patient: patientObjId,
              doctor: doctorId,
              doctorId,
              doctorName,
              status: 'Draft',
              plan: labOrderLine,
              assessment: { plan: labOrderLine },
              chiefComplaint: { description: 'Medical consultation' },
              createdBy: doctorId,
              visitDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
            console.log(`✅ [Single] Created draft medical record ${record._id} with lab order: ${populatedOrder.testName}`);
          }
        } catch (historyError) {
          console.error('❌ [Single] Error writing lab order to patient history:', historyError);
          // Do not fail the lab order creation
        }
      }
      
    } catch (invoiceError) {
      console.error('Error creating invoice/notification for lab order:', invoiceError);
      // Don't fail the lab order creation if invoice creation fails
    }
    
    res.status(201).json({
      success: true,
      message: 'Lab order created successfully',
      data: populatedOrder
    });
  } catch (error) {
    console.error('Error creating lab order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create bulk lab orders
// @route   POST /api/lab-orders
// @access  Private
const createBulkLabOrders = async (req, res) => {
  try {
    console.log('Creating bulk lab orders:', req.body);
    console.log('Request user:', req.user);
    
	const { patientId, visitId, priority, notes } = req.body;
	let tests = req.body.tests;
    
    // Validate required fields
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    if (!tests || !Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one test must be specified'
      });
    }
    
    // Validate each test
    for (const test of tests) {
      if (!test.testName || typeof test.testName !== 'string' || test.testName.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Each test must have a valid test name'
        });
      }
    }
    
    // 🔒 DUPLICATE PREVENTION: Check for existing pending lab orders
    const testNames = tests.map(test => test.testName);
    const existingOrders = await LabOrder.find({
      patientId: patientId,
      testName: { $in: testNames },
      paymentStatus: 'pending',
      status: { $in: ['Pending Payment', 'Ordered', 'In Progress'] }
    });
    
    if (existingOrders.length > 0) {
      const duplicateTests = existingOrders.map(order => order.testName);
      console.log(`⚠️ Duplicate lab orders prevented: ${duplicateTests.join(', ')} for patient ${patientId}`);
      
      // Notification ensure/create for existing orders removed
      
      // 🔧 FIX: Check if existing orders have invoices, create them if missing
      console.log(`⚠️ Found duplicate orders: ${duplicateTests.join(', ')}`);
      
      let ordersNeedingInvoices = [];
      for (const existingOrder of existingOrders) {
        if (!existingOrder.invoiceId) {
          console.log(`📋 Existing order "${existingOrder.testName}" needs invoice`);
          ordersNeedingInvoices.push(existingOrder);
        }
      }
      
      if (ordersNeedingInvoices.length > 0) {
        console.log(`🔧 Creating invoices for ${ordersNeedingInvoices.length} existing orders without invoices`);
        
        try {
          const Patient = require('../models/Patient');
          const MedicalInvoice = require('../models/MedicalInvoice');
          const Notification = require('../models/Notification');
          
          // Find patient
          let patient = null;
          if (mongoose.Types.ObjectId.isValid(patientId)) {
            patient = await Patient.findById(patientId);
          } else {
            patient = await Patient.findOne({ patientId: patientId });
          }
          
          if (patient) {
            console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`);
            
            // Create invoice for existing orders
            const totalAmount = ordersNeedingInvoices.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
            
            const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
            const invoiceData = {
              invoiceNumber: invoiceNumber,
              patient: patient._id,
              patientId: patient._id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              items: ordersNeedingInvoices.map(order => ({
                itemType: 'lab',
                category: 'lab',
                serviceName: order.testName,
                description: `Lab test: ${order.testName}`,
                quantity: 1,
                unitPrice: order.totalPrice || 0,
                totalPrice: order.totalPrice || 0,
                total: order.totalPrice || 0,
                metadata: {
                  labOrderId: order._id,
                  testName: order.testName
                },
                addedAt: new Date(),
                addedBy: req.user._id
              })),
              subtotal: totalAmount,
              total: totalAmount,
              balance: totalAmount,
              status: 'pending',
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              notes: `Lab orders: ${ordersNeedingInvoices.map(o => o.testName).join(', ')}`,
              createdBy: req.user._id
            };
            
            const invoice = new MedicalInvoice(invoiceData);
            await invoice.save();
            
            console.log(`✅ Created invoice ${invoice.invoiceNumber} for existing orders`);
            
            // Link existing orders to invoice
            for (const order of ordersNeedingInvoices) {
              order.serviceRequestId = invoice._id;
              order.invoiceId = invoice._id;
              await order.save();
              console.log(`🔗 Linked ${order.testName} to invoice ${invoice.invoiceNumber}`);
            }
            
            // Create notification
            const notificationData = {
              type: 'lab_payment_required',
              title: 'Lab Payment Required',
              message: `Payment required for ${ordersNeedingInvoices.length} lab test(s): ${ordersNeedingInvoices.map(o => o.testName).join(', ')}`,
              recipientRole: 'reception',
              senderRole: 'doctor',
              senderId: req.user._id,
              data: {
                labOrderIds: ordersNeedingInvoices.map(o => o._id),
                patientId: patient._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                testNames: ordersNeedingInvoices.map(o => o.testName),
                amount: totalAmount,
                totalAmount: totalAmount,
                itemCount: ordersNeedingInvoices.length,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                tests: ordersNeedingInvoices.map(o => ({
                  testName: o.testName,
                  price: o.totalPrice || 0,
                  labOrderId: o._id
                })),
                paymentStatus: 'pending'
              },
              priority: 'high',
              read: false
            };
            
            const notification = new Notification(notificationData);
            await notification.save();
            
            console.log(`✅ Created notification for existing orders`);
          }
        } catch (invoiceError) {
          console.error('❌ Error creating invoices for existing orders:', invoiceError);
        }
      }
      
      // Remove duplicate tests from the tests array
      const filteredTests = tests.filter(test => !duplicateTests.includes(test.testName));
      
      if (filteredTests.length === 0) {
        // If all tests were duplicates but we created invoices, return success
        if (ordersNeedingInvoices.length > 0) {
          return res.status(200).json({
            success: true,
            message: `Created invoices for existing lab orders: ${duplicateTests.join(', ')}`,
            invoicesCreated: true,
            count: ordersNeedingInvoices.length,
            data: ordersNeedingInvoices // Add the data field that frontend expects
          });
        }
        
        return res.status(409).json({
          success: false,
          message: `All requested lab orders already exist: ${duplicateTests.join(', ')}`,
          duplicateTests: duplicateTests,
          existingOrders: existingOrders
        });
      }
      
		// Update tests array to only include non-duplicate tests
		tests = filteredTests;
      console.log(`✅ Continuing with ${tests.length} non-duplicate tests`);
    }

    // Create individual lab orders for each test (not using the tests array)
    const createdOrders = [];
    const currentTime = new Date();
    
    for (const test of tests) {
      try {
        console.log(`Creating lab order for test: ${test.testName}`);
        
        // 🔍 FETCH REAL PRICE FROM INVENTORY
        let testPrice = test.price || 200; // Use provided price or default fallback
        try {
          const LabPricingService = require('../services/labPricingService');
          const inventoryPrice = await LabPricingService.findInventoryPrice(test.testName);
          
          if (inventoryPrice && inventoryPrice.price > 0) {
            // Round to 2 decimal places to ensure consistency and prevent floating point issues
            testPrice = Math.round(inventoryPrice.price * 100) / 100;
            console.log(`✅ Found inventory price for ${test.testName}: ${inventoryPrice.price} → rounded to ${testPrice}`);
          } else {
            // Try with default pricing service
            testPrice = LabPricingService.getDefaultPrice(test.testName) || test.price || 200;
            console.log(`⚠️ No inventory price found for ${test.testName}, using default: ${testPrice}`);
          }
        } catch (inventoryError) {
          console.error('Error fetching inventory price:', inventoryError.message);
          console.log(`⚠️ Using provided/default price for ${test.testName}: ${testPrice}`);
        }
        
        const labOrderData = {
          patientId: patientId,
          visitId: visitId || null,
          testName: test.testName,
          panelName: test.panelName || null,
          specimenType: test.specimenType || 'Blood', // Default to Blood
          orderDateTime: currentTime,
          status: 'Pending Payment', // Initial status
          paymentStatus: 'pending', // Initial payment status
          priority: priority || 'Routine',
          notes: notes || '',
          orderingDoctorId: req.user._id, // Use the authenticated user as the ordering doctor
          totalPrice: testPrice, // Use real price from inventory (already rounded)
          createdAt: currentTime,
          updatedAt: currentTime
        };
        
        console.log('Lab order data:', labOrderData);
        
        const labOrder = new LabOrder(labOrderData);
        const savedOrder = await labOrder.save();
        
        console.log(`Lab order saved with ID: ${savedOrder._id}`);
        
        // Populate the saved order with patient and doctor information
        const populatedOrder = await LabOrder.findById(savedOrder._id)
          .populate('patient', 'firstName lastName patientId')
          .populate('orderingDoctorId', 'firstName lastName');
        
        createdOrders.push(populatedOrder);
        console.log(`Successfully created lab order for ${test.testName}`);
      } catch (testError) {
        console.error(`Error creating lab order for test ${test.testName}:`, testError);
        throw testError; // Re-throw to stop the process
      }
    }
    
    console.log(`Successfully created ${createdOrders.length} lab orders`);
    
    // 📱 Send ONE Telegram notification to lab staff for ALL bulk lab orders
    // Only send if we have at least one order created
    if (createdOrders.length > 0) {
      try {
        const notificationService = require('../services/notificationService');
        const telegramService = require('../services/telegramService');
        const Patient = require('../models/Patient');
        
        // Initialize telegram service
        await telegramService.initialize();
        
        if (telegramService.isInitialized) {
          console.log(`📱 Sending ONE combined lab order notification for ${createdOrders.length} tests...`);
          
          // Fetch patient data to ensure we have correct patient info
          let patient = null;
          if (mongoose.Types.ObjectId.isValid(patientId)) {
            patient = await Patient.findById(patientId);
          } else {
            patient = await Patient.findOne({ patientId: patientId });
          }
          
          // Fallback to populated order patient if direct lookup fails
          if (!patient && createdOrders[0] && createdOrders[0].patient) {
            patient = createdOrders[0].patient;
          }


          if (patient) {
            const patientIdStr = patient.patientId || patient._id.toString();
            const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
            
            // Collect all test names and types from created orders
            const allLabTests = createdOrders.map(order => ({
              name: order.testName || 'Unknown Test',
              type: order.specimenType || 'Blood'
            }));
            
            console.log(`📱 Preparing notification for patient ${patientName} with ${allLabTests.length} tests:`, allLabTests.map(t => t.name).join(', '));
            
            // Send ONE notification with ALL tests
            const labNotification = await notificationService.sendNotification(
              'labOrder',
              {
                patientId: patientIdStr,
                patientName: patientName,
                age: patient.age,
                gender: patient.gender,
                labTests: allLabTests // All tests in one array
              }
            );
            
            if (labNotification.success) {
              console.log(`✅ Successfully sent ONE combined lab order notification with ${allLabTests.length} tests`);
            } else {
              console.log('❌ Bulk lab order notification failed:', labNotification.message);
            }
          } else {
            console.error('❌ Patient not found, cannot send lab order notification');
          }
        } else {
          console.log('📱 Telegram bot not initialized, skipping bulk lab order notification');
        }
      } catch (telegramError) {
        console.error('❌ Error sending bulk lab order notification:', telegramError);
        // Don't fail lab order creation if Telegram notification fails
      }
    }
    
    // 🔧 RESTORED: Create invoice and notification for lab orders
    console.log(`🎯 [BULK] Starting invoice creation process for ${createdOrders.length} lab orders`);
    try {
      const Patient = require('../models/Patient');
      const MedicalInvoice = require('../models/MedicalInvoice');
      const Notification = require('../models/Notification');
      
      // Find patient for invoice creation
      let patient = null;
      console.log(`🔍 Looking for patient with ID: ${patientId} (type: ${typeof patientId})`);
      
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        patient = await Patient.findById(patientId);
        console.log(`📋 Patient lookup by ObjectId: ${patient ? 'Found' : 'Not found'}`);
      } else {
        patient = await Patient.findOne({ patientId: patientId });
        console.log(`📋 Patient lookup by patientId: ${patient ? 'Found' : 'Not found'}`);
      }
      
      if (!patient) {
        console.error(`❌ Patient not found for invoice creation. Searched for: ${patientId}`);
        // Don't return error, just log and continue without creating invoice
        console.log('⚠️ Continuing without invoice creation...');
      } else {
        console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`);
      }
      
      // Use billing service to add lab orders to daily consolidated invoice
      const billingService = require('../services/billingService');
      
      let invoice = null;
      try {
        // Add each lab order to the daily consolidated invoice
        for (const order of createdOrders) {
          invoice = await billingService.addServiceToDailyInvoice(
            patient._id,
            'lab',
            {
              description: `Lab test: ${order.testName}`,
              testName: order.testName,
              totalPrice: order.totalPrice || 0,
              unitPrice: order.totalPrice || 0,
              quantity: 1,
              labOrderId: order._id,
              metadata: {
                labOrderId: order._id,
                testName: order.testName
              }
            },
            req.user._id
          );
          
          // Link lab order to invoice
          order.serviceRequestId = invoice._id;
          order.invoiceId = invoice._id;
          await order.save();
        }
        
        console.log(`✅ Added ${createdOrders.length} lab test(s) to daily consolidated invoice ${invoice.invoiceNumber}`);
      } catch (invoiceError) {
        console.error('❌ Error adding lab orders to daily invoice:', invoiceError);
        // Continue without failing the lab order creation
      }
      
      // Create notification for reception
      const testNames = createdOrders.map(o => o.testName);
      const totalAmount = createdOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
      
      const notificationData = {
        type: 'lab_payment_required',
        title: 'Lab Payment Required',
        message: `Payment required for ${createdOrders.length} lab test(s): ${testNames.join(', ')}`,
        recipientRole: 'reception',
        senderRole: 'doctor',
        senderId: req.user._id,
        data: {
          labOrderIds: createdOrders.map(o => o._id),
          patientId: patient._id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          testNames: testNames,
          amount: totalAmount,
          totalAmount: totalAmount,
          itemCount: createdOrders.length,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          tests: createdOrders.map(o => ({
            testName: o.testName,
            price: o.totalPrice || 0,
            labOrderId: o._id
          })),
          paymentStatus: 'pending'
        },
        priority: 'high',
        read: false
      };
      
      const notification = new Notification(notificationData);
      await notification.save();
      
      console.log(`✅ Created notification for ${patient.firstName} ${patient.lastName}: ${totalAmount} ETB (${createdOrders.length} tests)`);

      // Write to patient history: create or update draft medical record with "Lab ordered: ..."
      try {
        const doctorId = req.user._id;
        const doctorName = (req.user.firstName && req.user.lastName) ? `${req.user.firstName} ${req.user.lastName}` : (req.user.username || 'Doctor');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const labOrderLines = createdOrders.map(o => `Lab ordered: ${o.testName}.`).join('\n');

        let record = await MedicalRecord.findOne({
          patient: patient._id,
          status: 'Draft',
          createdBy: doctorId,
          createdAt: { $gte: todayStart }
        }).sort({ createdAt: -1 });

        if (record) {
          const existingPlan = record.plan || (record.assessment && record.assessment.plan) || '';
          record.plan = existingPlan.trim() ? `${existingPlan.trim()}\n${labOrderLines}` : labOrderLines;
          if (record.assessment && typeof record.assessment === 'object') {
            record.assessment.plan = record.plan;
          }
          record.updatedAt = new Date();
          record.lastUpdatedBy = doctorId;
          await record.save();
          console.log(`✅ [BULK] Updated draft medical record ${record._id} with ${createdOrders.length} lab order(s)`);
        } else {
          record = await MedicalRecord.create({
            patient: patient._id,
            doctor: doctorId,
            doctorId,
            doctorName,
            status: 'Draft',
            plan: labOrderLines,
            assessment: { plan: labOrderLines },
            chiefComplaint: { description: 'Medical consultation' },
            createdBy: doctorId,
            visitDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`✅ [BULK] Created draft medical record ${record._id} with ${createdOrders.length} lab order(s)`);
        }
      } catch (historyError) {
        console.error('❌ [BULK] Error writing lab orders to patient history:', historyError);
      }
      
    } catch (invoiceError) {
      console.error('Error creating invoice/notification for lab orders:', invoiceError);
      // Don't fail the lab order creation if invoice creation fails
    }
    
    res.status(201).json({
      success: true,
      message: `Successfully created ${createdOrders.length} lab orders`,
      count: createdOrders.length,
      data: createdOrders
    });
  } catch (error) {
    console.error('Error creating bulk lab orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get lab order by ID
// @route   GET /api/lab-orders/:id
// @access  Private
const getLabOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching lab order ${id}...`);
    
    const labOrder = await LabOrder.findById(id)
      .populate('patient', 'firstName lastName patientId')
      .populate('orderingDoctorId', 'firstName lastName');
    
    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }
    
    console.log(`Successfully fetched lab order ${id}`);
    
    res.json({
      success: true,
      data: labOrder
    });
  } catch (error) {
    console.error('Error fetching lab order by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update lab order
// @route   PUT /api/lab-orders/:id
// @access  Private
const updateLabOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`Updating lab order ${id} with data:`, updateData);
    
    // Validate that the lab order exists
    const existingOrder = await LabOrder.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }
    
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();
    
    // Update the lab order
    const updatedOrder = await LabOrder.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .populate('patient', 'firstName lastName patientId')
    .populate('orderingDoctorId', 'firstName lastName');
    
    if (!updatedOrder) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update lab order'
      });
    }
    
    console.log(`Successfully updated lab order ${id} to status: ${updatedOrder.status}`);

    // Deduct inventory if the lab order status is being updated to completed/results available
    // ✅ FIX: Atomic locking in service prevents double deductions - no need to check inventoryDeducted
    if ((updatedOrder.status === 'Results Available' || updatedOrder.status === 'Completed') &&
        existingOrder.status !== updatedOrder.status) {
      try {
        console.log(`🔬 [UPDATE LAB ORDER] Processing inventory deduction for completed lab order: ${updatedOrder.testName}`);

        const inventoryDeductionService = require('../services/inventoryDeductionService');

        // For the controller, we need to get a user ID. Since we don't have req.user here,
        // we'll use a fallback approach or get it from the lab order itself
        let userId = null;

        // Try to get user ID from the lab order's createdBy or orderingDoctorId
        if (updatedOrder.createdBy) {
          userId = updatedOrder.createdBy;
        } else if (updatedOrder.orderingDoctorId) {
          userId = updatedOrder.orderingDoctorId;
        } else {
          // Fallback: use a default admin user ID
          userId = new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3');
        }

        const inventoryResult = await inventoryDeductionService.deductLabInventory(updatedOrder, userId);

        if (inventoryResult && inventoryResult.success) {
          console.log(`✅ [UPDATE LAB ORDER] Inventory deducted successfully for ${updatedOrder.testName}:`);
          console.log(`   Item: ${inventoryResult.itemName}`);
          console.log(`   Quantity consumed: ${inventoryResult.quantityConsumed}`);
          console.log(`   New quantity: ${inventoryResult.newQuantity}`);
          
          // Note: The inventoryDeducted flag was already set atomically by the service
          // No need to set it again here - just log success
          console.log(`✅ [UPDATE LAB ORDER] Inventory deduction completed for lab order ${updatedOrder._id}`);
        } else if (inventoryResult === null) {
          console.log(`ℹ️ [UPDATE LAB ORDER] Inventory deduction skipped for ${updatedOrder.testName} (already deducted, no mapping, or insufficient stock)`);
        } else {
          console.log(`⚠️ [UPDATE LAB ORDER] No inventory deduction for ${updatedOrder.testName} - no mapping found or insufficient stock`);
        }
      } catch (inventoryError) {
        console.error('❌ [UPDATE LAB ORDER] Error deducting inventory for lab order completion:', inventoryError);
        // Don't fail the update if inventory deduction fails
      }
    } else if (existingOrder.inventoryDeducted) {
      console.log(`🔬 [UPDATE LAB ORDER] Inventory already deducted for lab order ${updatedOrder._id}, skipping deduction`);
    } else {
      console.log(`🔬 [UPDATE LAB ORDER] Skipping inventory deduction - status: ${updatedOrder.status}, existing status: ${existingOrder.status}, inventoryDeducted: ${existingOrder.inventoryDeducted}`);
    }

    res.json({
      success: true,
      message: 'Lab order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating lab order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete lab order
// @route   DELETE /api/lab-orders/:id
// @access  Private
const deleteLabOrder = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Lab order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lab order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getLabOrders,
  getLabOrderById,
  createLabOrder,
  createBulkLabOrders,
  updateLabOrder,
  deleteLabOrder
};
