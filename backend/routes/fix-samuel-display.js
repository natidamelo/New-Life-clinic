const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const NurseTask = require('../models/NurseTask');
const MedicalInvoice = require('../models/MedicalInvoice');

/**
 * Fix Samuel Kinfe's display data
 * POST /api/fix-samuel-display
 */
router.post('/', async (req, res) => {
  try {
    console.log('🔧 API: Fixing Samuel Kinfe\'s display data...');
    
    // Find Samuel Kinfe
    const patient = await Patient.findOne({
      $or: [
        { firstName: { $regex: /samuel/i }, lastName: { $regex: /kinfe/i } },
        { firstName: 'Samuel', lastName: 'Kinfe' }
      ]
    });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Samuel Kinfe not found'
      });
    }
    
    console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`);
    
    // Find Ceftriaxone prescription
    const prescription = await Prescription.findOne({
      patient: patient._id,
      medicationName: { $regex: /ceftriaxone/i }
    }).sort({ createdAt: -1 });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'No Ceftriaxone prescription found for Samuel Kinfe'
      });
    }
    
    console.log(`✅ Found prescription: ${prescription.medicationName}`);
    
    // Fix prescription frequency
    await Prescription.findByIdAndUpdate(prescription._id, {
      $set: {
        frequency: 'BID (twice daily)',
        dosesPerDay: 2
      }
    });
    
    // Fix extension details
    const extensionDetails = prescription.extensionDetails || {};
    const additionalDays = extensionDetails.additionalDays || 3;
    const correctAdditionalDoses = additionalDays * 2; // BID = 2 doses per day
    
    const updatedExtensionDetails = {
      ...extensionDetails,
      additionalDoses: correctAdditionalDoses,
      frequency: 'BID (twice daily)',
      dosesPerDay: 2,
      extensionFrequency: 'BID (twice daily)',
      fixedAt: new Date(),
      fixReason: 'API fix - corrected to BID'
    };
    
    await Prescription.findByIdAndUpdate(prescription._id, {
      $set: {
        extensionDetails: updatedExtensionDetails
      }
    });
    
    // Generate correct BID dose records
    const originalDuration = extensionDetails.originalDuration || 5;
    const startingDay = originalDuration + 1;
    const bidTimeSlots = ['09:00', '21:00'];
    const newDoseRecords = [];
    
    // Active period doses
    for (let day = 1; day <= originalDuration; day++) {
      bidTimeSlots.forEach((timeSlot) => {
        newDoseRecords.push({
          day: day,
          timeSlot: timeSlot,
          administered: false,
          administeredAt: null,
          administeredBy: null,
          notes: `Active dose - BID (${timeSlot === '09:00' ? 'Morning' : 'Evening'})`,
          period: 'active'
        });
      });
    }
    
    // Extension period doses
    for (let dayOffset = 0; dayOffset < additionalDays; dayOffset++) {
      const day = startingDay + dayOffset;
      
      bidTimeSlots.forEach((timeSlot) => {
        newDoseRecords.push({
          day: day,
          timeSlot: timeSlot,
          administered: false,
          administeredAt: null,
          administeredBy: null,
          notes: `Extension dose - BID (${timeSlot === '09:00' ? 'Morning' : 'Evening'})`,
          period: 'extension1'
        });
      });
    }
    
    // Update prescription with dose records
    await Prescription.findByIdAndUpdate(prescription._id, {
      $set: {
        'medicationDetails.doseRecords': newDoseRecords,
        'medicationDetails.frequency': 'BID (twice daily)',
        'medicationDetails.totalDoses': newDoseRecords.length
      }
    });
    
    // Update nurse task
    const nurseTask = await NurseTask.findOne({
      patientId: patient._id,
      'medicationDetails.medicationName': { $regex: /ceftriaxone/i }
    }).sort({ createdAt: -1 });
    
    if (nurseTask) {
      const doseStatuses = newDoseRecords.map((record) => ({
        day: record.day,
        timeSlot: record.timeSlot,
        administered: record.administered,
        administeredAt: record.administeredAt,
        administeredBy: record.administeredBy,
        notes: record.notes,
        period: record.period,
        status: record.administered ? 'completed' : 'pending',
        isToday: false,
        isOverdue: false,
        isFuture: true,
        isDisabled: false,
        paymentAuthorized: true
      }));
      
      await NurseTask.findByIdAndUpdate(nurseTask._id, {
        $set: {
          'medicationDetails.frequency': 'BID (twice daily)',
          'medicationDetails.totalDoses': newDoseRecords.length,
          'medicationDetails.doseStatuses': doseStatuses,
          'medicationDetails.doseRecords': newDoseRecords,
          'medicationDetails.isExtension': true,
          'medicationDetails.extensionDetails': updatedExtensionDetails,
          lastUpdated: new Date()
        }
      });
      
      console.log(`✅ Updated nurse task with ${doseStatuses.length} dose statuses`);
    }
    
    // Update invoice
    const invoice = await MedicalInvoice.findOne({
      patient: patient._id,
      'items.description': { $regex: /ceftriaxone.*extension/i }
    }).sort({ dateIssued: -1 });
    
    if (invoice) {
      const extensionItem = invoice.items.find(item => 
        item.description && 
        item.description.toLowerCase().includes('extension') &&
        item.description.toLowerCase().includes('ceftriaxone')
      );
      
      if (extensionItem) {
        extensionItem.description = `Medication Extension - Ceftriaxone (+${additionalDays} days × 2 doses/day = ${correctAdditionalDoses} total doses)`;
        extensionItem.quantity = correctAdditionalDoses;
        
        if (extensionItem.metadata) {
          extensionItem.metadata.additionalDoses = correctAdditionalDoses;
          extensionItem.metadata.totalDoses = correctAdditionalDoses;
          extensionItem.metadata.dosesPerDay = 2;
          extensionItem.metadata.frequency = 'BID (twice daily)';
        }
        
        await invoice.save();
      }
    }
    
    // Get the updated data for response
    const updatedPrescription = await Prescription.findById(prescription._id);
    const updatedNurseTask = await NurseTask.findById(nurseTask?._id);
    
    const extensionDoses = newDoseRecords.filter(r => r.period === 'extension1');
    
    res.json({
      success: true,
      message: 'Samuel Kinfe\'s display data has been fixed successfully',
      data: {
        patientName: `${patient.firstName} ${patient.lastName}`,
        prescriptionId: prescription._id,
        frequency: 'BID (twice daily)',
        extensionDays: additionalDays,
        extensionDoses: correctAdditionalDoses,
        totalDoseRecords: newDoseRecords.length,
        extensionTabs: extensionDoses.length,
        timeSlots: bidTimeSlots,
        expectedResult: {
          frequency: 'BID (twice daily)',
          extensionTabs: extensionDoses.length,
          morningDoses: extensionDoses.filter(d => d.timeSlot === '09:00').length,
          eveningDoses: extensionDoses.filter(d => d.timeSlot === '21:00').length,
          schedule: extensionDoses.map(d => ({
            day: d.day,
            timeSlot: d.timeSlot,
            type: d.timeSlot === '09:00' ? 'Morning' : 'Evening'
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fixing Samuel\'s display data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix Samuel\'s display data',
      error: error.message
    });
  }
});

module.exports = router;
