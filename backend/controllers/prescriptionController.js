const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');
const InventoryItem = require('../models/InventoryItem');
const { asyncHandler } = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create prescription
// @route   POST /api/prescriptions
// @access  Private
exports.createPrescription = asyncHandler(async (req, res, next) => {
  const {
    patientId,
    doctorId,
    diagnosis,
    medications,
    instructions,
    followUpDate,
    status = 'active'
  } = req.body;

  // Validate required fields
  if (!patientId || !doctorId || !medications || !Array.isArray(medications)) {
    return next(new ErrorResponse('Patient ID, doctor ID, and medications array are required', 400));
  }

  // Verify patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    return next(new ErrorResponse('Patient not found', 404));
  }

  let totalCost = 0;
  const processedMedications = [];

  // Process each medication
  for (const medicationData of medications) {
    try {
      console.log(`🔍 Processing medication: ${JSON.stringify(medicationData)}`);
      
            let inventoryItem = null;

      // Try to find inventory item by ID first
      if (medicationData.inventoryItemId) {
        console.log(`🔍 Looking up inventory item by ID: ${medicationData.inventoryItemId}`);
        inventoryItem = await InventoryItem.findById(medicationData.inventoryItemId);
            if (inventoryItem) {
          console.log(`✅ Found inventory item by ID: ${inventoryItem.name}`);
        }
      }
      
      // If not found by ID, try by name
      if (!inventoryItem && medicationData.medication) {
        console.log(`🔍 Looking up inventory item by name: ${medicationData.medication}`);
        inventoryItem = await InventoryItem.findOne({ 
          name: { $regex: new RegExp(medicationData.medication, 'i') } 
        });
        if (inventoryItem) {
          console.log(`✅ Found inventory item by name: ${inventoryItem.name}`);
        }
      }

      // Calculate medication cost
      const unitPrice = inventoryItem ? inventoryItem.sellingPrice : 0;
      const quantity = medicationData.quantity || 1;
      const duration = medicationData.duration || '';
      const frequency = medicationData.frequency || 'Once daily';
      
      // Parse frequency to number of doses per day (TID = 3 times daily)
      // Use centralized medication calculator
      const MedicationCalculator = require('../utils/medicationCalculator');
      
      const calculation = await MedicationCalculator.calculateMedicationCost({
        name: medicationData.medication,
        frequency: frequency,
        duration: duration,
        inventoryItemId: inventoryItem ? inventoryItem._id : null
      });
      
      const medicationCost = calculation.totalCost;

      console.log(`📊 Cost calculation: price=${calculation.costPerDose} ETB, frequency=${calculation.dosesPerDay} doses/day, duration=${calculation.days} days, total=${medicationCost} ETB`);

      const processedMedication = {
        medication: medicationData.medication,
        dosage: medicationData.dosage,
        frequency: calculation.frequency,
        duration: calculation.duration,
        quantity: quantity, // prescription quantity (e.g., bottles, vials)
        totalDoses: calculation.totalDoses || calculation.dosesPerDay * calculation.days, // calculated total doses
        dosesPerDay: calculation.dosesPerDay,
        instructions: medicationData.instructions,
        unitPrice: calculation.costPerDose,
        totalPrice: calculation.totalCost,
        inventoryItemId: inventoryItem ? inventoryItem._id : null
      };

      processedMedications.push(processedMedication);
      totalCost += medicationCost;

      console.log(`✅ Added medication to processed list: ${processedMedication.medication}, cost: ${medicationCost}`);
    } catch (error) {
      console.error(`❌ Error processing medication ${medicationData.medication}:`, error);
      
      // Add medication with zero cost if processing fails
      processedMedications.push({
        medication: medicationData.medication,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency || 'Once daily',
        duration: medicationData.duration || '',
        quantity: medicationData.quantity || 1,
        instructions: medicationData.instructions,
        unitPrice: 0,
        totalPrice: 0,
        inventoryItemId: null
      });
    }
  }

  console.log(`*** CRITICAL DEBUG: processedMedications length before notification/invoice: ${processedMedications.length}`);
  console.log(`*** CRITICAL DEBUG: totalCost before notification/invoice: ${totalCost}`);

  // Create prescription
  const prescription = await Prescription.create({
    patientId,
    doctorId,
    diagnosis,
    medications: processedMedications,
    instructions,
    followUpDate,
    status,
    totalCost
  });

  console.log(`✅ Prescription created with ${processedMedications.length} medications, total cost: ${totalCost}`);

  // Create medications list for notification
  const medicationsList = [];
  for (const med of processedMedications) {
    medicationsList.push({
                name: med.medication,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
      quantity: med.quantity,
                unitPrice: med.unitPrice,
      totalPrice: med.totalPrice
    });
  }

  console.log(`*** CRITICAL DEBUG: Notification medications data before save ***`);
  console.log(JSON.stringify(medicationsList, null, 2));

  // FIX: Add prescription to daily consolidated invoice
  let createdInvoice = null;
  try {
    console.log('🔧 Adding prescription to daily consolidated invoice...');
    
    // Use billing service to add prescription to daily consolidated invoice
    const billingService = require('../services/billingService');
    
    // Prepare all medication items as service data array
    const servicesData = processedMedications.map(med => ({
      description: `Medication: ${med.medication} (${med.totalDoses || 1} doses - ${med.frequency} for ${med.duration})`,
      medicationName: med.medication,
      totalPrice: med.totalPrice || 0,
      unitPrice: med.unitPrice || 0,
      quantity: med.totalDoses || 1,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      prescriptionId: prescription._id,
      metadata: {
        prescriptionId: prescription._id,
        medicationName: med.medication,
        frequency: med.frequency,
        duration: med.duration,
        totalDoses: med.totalDoses,
        dosesPerDay: med.dosesPerDay,
        costPerDose: med.unitPrice
      }
    }));
    
    // Add all medication items to the daily consolidated invoice in one operation
    // This ensures all items are in the same invoice
    createdInvoice = await billingService.addMultipleServicesToDailyInvoice(
      patient._id,
      'medication',
      servicesData,
      doctorId
    );
    
    console.log(`✅ Prescription added to daily consolidated invoice:`, {
      id: createdInvoice._id,
      invoiceNumber: createdInvoice.invoiceNumber,
      total: createdInvoice.total
    });

    // Update prescription with invoice reference
    prescription.invoiceId = createdInvoice._id;
    prescription.invoiceNumber = createdInvoice.invoiceNumber;
    await prescription.save();
    
    console.log(`✅ Prescription linked to invoice: ${createdInvoice.invoiceNumber}`);

  } catch (invoiceError) {
    console.error('❌ Error creating automatic invoice:', invoiceError);
    console.log('⚠️ Prescription created but invoice creation failed - will need manual invoice creation');
  }

  // Create notification for payment
  try {
    const notification = await Notification.create({
      patientId: patient._id,
      type: 'medication_payment',
              title: 'Medication Payment Required',
      message: `Payment required for ${processedMedications.length} medication(s) - Total: ETB ${totalCost}`,
              data: {
        prescriptionId: prescription._id,
        invoiceId: createdInvoice?._id || null,
        invoiceNumber: createdInvoice?.invoiceNumber || null,
                medications: medicationsList,
        totalCost: totalCost,
        patientName: patient.fullName,
        patientId: patient._id
      },
      status: 'pending',
      priority: 'high'
    });

    console.log(`✅ Notification created with ${medicationsList.length} medications and invoice reference`);
  } catch (notificationError) {
    console.error('❌ Error creating notification:', notificationError);
    
    // Create a fallback notification
    await Notification.create({
      patientId: patient._id,
      type: 'medication_payment',
      title: 'Medication Payment Required',
      message: 'Payment required for medications',
      data: {
        prescriptionId: prescription._id,
        invoiceId: createdInvoice?._id || null,
        invoiceNumber: createdInvoice?.invoiceNumber || null,
        medications: processedMedications.map(med => ({
          name: med.medication,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: med.quantity,
          unitPrice: med.unitPrice,
          totalPrice: med.totalPrice
        })),
        totalCost: totalCost,
        patientName: patient.fullName,
        patientId: patient._id
      },
      status: 'pending',
      priority: 'high'
    });
  }

  console.log(`*** DEBUG: Loop completed. Total processedMedications count: ${processedMedications.length}`);

      res.status(201).json({
    success: true,
    data: prescription,
    message: `Prescription created with ${processedMedications.length} medications`
  });
});

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = asyncHandler(async (req, res, next) => {
  const prescriptions = await Prescription.find()
    .populate('patientId', 'fullName')
    .populate('doctorId', 'fullName')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    data: prescriptions
  });
});

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private
exports.getPrescription = asyncHandler(async (req, res, next) => {
      const prescription = await Prescription.findById(req.params.id)
    .populate('patientId', 'fullName')
    .populate('doctorId', 'fullName');

      if (!prescription) {
    return next(new ErrorResponse('Prescription not found', 404));
  }

  res.status(200).json({
    success: true,
    data: prescription
  });
});

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private
exports.updatePrescription = asyncHandler(async (req, res, next) => {
  let prescription = await Prescription.findById(req.params.id);

      if (!prescription) {
    return next(new ErrorResponse('Prescription not found', 404));
  }

  prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: prescription
  });
});

// @desc    Delete prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private
exports.deletePrescription = asyncHandler(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id);

      if (!prescription) {
    return next(new ErrorResponse('Prescription not found', 404));
  }

  await prescription.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get prescriptions by patient
// @route   GET /api/prescriptions/patient/:patientId
// @access  Private
exports.getPrescriptionsByPatient = asyncHandler(async (req, res, next) => {
  const prescriptions = await Prescription.find({ patientId: req.params.patientId })
    .populate('doctorId', 'fullName')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    data: prescriptions
  });
});

// @desc    Get prescriptions by doctor
// @route   GET /api/prescriptions/doctor/:doctorId
// @access  Private
exports.getPrescriptionsByDoctor = asyncHandler(async (req, res, next) => {
  const prescriptions = await Prescription.find({ doctorId: req.params.doctorId })
    .populate('patientId', 'fullName')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    data: prescriptions
  });
});
