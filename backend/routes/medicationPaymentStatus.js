const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Prescription = require('../models/Prescription');
const MedicalInvoice = require('../models/MedicalInvoice');

/**
 * Shared helper: given a list of invoices for a patient and a medication name,
 * calculate item-level totalCost, totalPaid, and outstandingAmount.
 * Uses only medication items (not labs, cards, imaging) and distributes
 * invoice-level payments proportionally across all medication items.
 */
function calcMedicationPayment(invoices, medicationName) {
  const medNameLower = medicationName.toLowerCase();
  const baseMedName = medNameLower.split(' ')[0];

  let totalCost = 0;
  let totalAllMedCost = 0;
  let totalInvoiceCost = 0;
  let totalInvoicePaid = 0;
  let costPerDose = 0;
  let totalDoses = 0;
  const seenInvoiceIds = new Set();

  for (const invoice of invoices) {
    if (!invoice.items || !Array.isArray(invoice.items)) continue;

    const matchingMedItems = invoice.items.filter(item => {
      const itemType = (item.itemType || item.category || '').toLowerCase();
      if (itemType !== 'medication' && itemType !== 'prescription') return false;
      const metaMedName = ((item.metadata && item.metadata.medicationName) || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return (
        metaMedName === medNameLower ||
        metaMedName.includes(medNameLower) ||
        metaMedName.includes(baseMedName) ||
        desc.includes(medNameLower) ||
        desc.includes(baseMedName)
      );
    });

    if (matchingMedItems.length === 0) continue;

    const matchingCost = matchingMedItems.reduce((s, item) => s + (item.total || item.totalPrice || 0), 0);
    totalCost += matchingCost;

    // Collect costPerDose and totalDoses from item metadata
    matchingMedItems.forEach(item => {
      if (item.metadata) {
        if (item.metadata.costPerDose && !costPerDose) costPerDose = Number(item.metadata.costPerDose) || 0;
        if (item.metadata.totalDoses) totalDoses += Number(item.metadata.totalDoses) || 0;
      }
    });

    const invId = (invoice._id || '').toString();
    if (!seenInvoiceIds.has(invId)) {
      seenInvoiceIds.add(invId);
      const allMedItemsInInvoice = invoice.items.filter(item => {
        const t = (item.itemType || item.category || '').toLowerCase();
        return t === 'medication' || t === 'prescription';
      });
      const allMedCostInInvoice = allMedItemsInInvoice.reduce((s, item) => s + (item.total || item.totalPrice || 0), 0);
      totalAllMedCost += allMedCostInInvoice;
      totalInvoiceCost += invoice.total || 0;
      totalInvoicePaid += invoice.amountPaid || 0;
    }
  }

  // Proportional payment: how much of the paid amount covers this medication's items
  let totalPaid = 0;
  if (totalInvoiceCost > 0 && totalAllMedCost > 0 && totalCost > 0) {
    const medProportion = totalAllMedCost / totalInvoiceCost;
    const paidForAllMeds = totalInvoicePaid * medProportion;
    totalPaid = paidForAllMeds * (totalCost / totalAllMedCost);
  }

  totalPaid = Math.round(totalPaid * 100) / 100;
  totalCost = Math.round(totalCost * 100) / 100;
  const outstandingAmount = Math.max(0, Math.round((totalCost - totalPaid) * 100) / 100);

  // How many individual doses are covered by the amount paid
  const paidDoses = costPerDose > 0 ? Math.floor(totalPaid / costPerDose) : (totalPaid >= totalCost && totalCost > 0 ? totalDoses : 0);

  let paymentStatus;
  if (totalCost === 0) {
    paymentStatus = 'no_data';
  } else if (totalPaid >= totalCost) {
    paymentStatus = 'fully_paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partially_paid';
  } else {
    paymentStatus = 'unpaid';
  }

  return {
    totalPaid,
    totalCost,
    outstandingAmount,
    paymentPercentage: totalCost > 0 ? Math.round((totalPaid / totalCost) * 10000) / 100 : 0,
    paymentStatus,
    costPerDose,
    totalDoses,
    paidDoses,
    invoiceCount: seenInvoiceIds.size
  };
}

// @route   POST /api/medication-payment-status/batch
// @desc    Get payment status for multiple medications in a single request
// @access  Private
router.post('/batch', auth, async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'tasks array is required' });
    }

    // Collect all unique patient IDs
    const patientIds = [...new Set(tasks.map(t => t.patientId).filter(Boolean))];

    // Fetch all relevant invoices in ONE query — always use live billing data
    const invoiceConditions = [];
    patientIds.forEach(pid => {
      if (pid.match(/^[0-9a-fA-F]{24}$/)) {
        invoiceConditions.push({ patient: pid });
        invoiceConditions.push({ patientId: pid });
      }
    });

    let allInvoices = [];
    if (invoiceConditions.length > 0) {
      allInvoices = await MedicalInvoice.find({ $or: invoiceConditions })
        .select('patient patientId patientName total amountPaid balance status invoiceNumber items createdAt')
        .sort({ createdAt: -1 })
        .lean();
    }

    // Build a map: patientId -> invoices
    const invoicesByPatient = {};
    allInvoices.forEach(inv => {
      const pid = (inv.patient || inv.patientId || '').toString();
      if (!invoicesByPatient[pid]) invoicesByPatient[pid] = [];
      invoicesByPatient[pid].push(inv);
    });

    // Process each task using shared item-level helper
    const results = {};
    for (const task of tasks) {
      const { taskKey, patientId, medicationName } = task;
      if (!taskKey || !medicationName) continue;

      const patientInvoices = invoicesByPatient[patientId] || [];
      const calc = calcMedicationPayment(patientInvoices, medicationName);

      results[taskKey] = {
        medicationName,
        ...calc,
        status: calc.paymentStatus,
        source: calc.invoiceCount > 0 ? 'billing_invoices_item_level' : 'no_invoices_found'
      };
    }

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('❌ [BATCH PAYMENT STATUS] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Error fetching batch payment status', error: error.message });
  }
});

// @route   GET /api/medication-payment-status/:prescriptionId
// @desc    Get payment status for a specific medication/prescription
// @access  Private
router.get('/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId);
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // If prescription has payment authorization data, return it
    if (prescription.paymentAuthorization) {
      return res.json({
        success: true,
        data: prescription.paymentAuthorization
      });
    }

    // Otherwise, calculate current status based on invoices
    const invoices = await MedicalInvoice.find({
      'items.prescriptionId': prescriptionId
    });

    const totalPaid = invoices.reduce((sum, invoice) => sum + (invoice.amountPaid || 0), 0);
    const totalCost = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

    // Create basic payment status
    const basicStatus = {
      totalPaid,
      totalCost,
      outstandingAmount: totalCost - totalPaid,
      paymentPercentage: totalCost > 0 ? (totalPaid / totalCost) * 100 : 0,
      overallStatus: totalPaid >= totalCost ? 'fully_paid' : totalPaid > 0 ? 'partial' : 'unpaid'
    };

    res.json({
      success: true,
      data: basicStatus
    });

  } catch (error) {
    console.error('❌ [MEDICATION PAYMENT STATUS] Error getting payment status:', error);
    console.error('❌ [MEDICATION PAYMENT STATUS] Error stack:', error.stack);

    // Return a proper error response instead of 500
    res.status(200).json({
      success: false,
      message: 'Error retrieving payment status',
      error: error.message,
      data: {
        medicationName: 'Unknown',
        totalPaid: 0,
        totalCost: 0,
        outstandingAmount: 0,
        paymentPercentage: 0,
        paymentStatus: 'error',
        status: 'error',
        source: 'error_occurred',
        error: error.message
      }
    });
  }
});

// @route   GET /api/medication-payment-status/medication/:prescriptionId/:medicationName
// @desc    Get payment status for a specific medication within a prescription (frontend pattern)
// @access  Private
router.get('/medication/:prescriptionId/:medicationName', auth, async (req, res) => {
  try {
    console.log(`🔍 [MEDICATION PAYMENT STATUS] Request received:`, {
      prescriptionId: req.params.prescriptionId,
      medicationName: req.params.medicationName,
      url: req.url,
      method: req.method
    });
    
    const { prescriptionId, medicationName } = req.params;

    console.log(`🔍 [MEDICATION PAYMENT STATUS] Request params:`, {
      prescriptionId,
      medicationName,
      fullUrl: req.url
    });

    // Handle case where medication name is "Unknown Medication" or similar placeholder
    if (medicationName === 'Unknown Medication' || medicationName === 'Unknown' || !medicationName || medicationName.trim() === '') {
      console.log(`⚠️ [MEDICATION PAYMENT STATUS] Received placeholder medication name: "${medicationName}"`);
      console.log(`🔄 [MEDICATION PAYMENT STATUS] Returning default response for placeholder medication name`);

      return res.json({
        success: true,
        data: {
          medicationName: medicationName || 'Unknown',
          totalPaid: 0,
          totalCost: 0,
          outstandingAmount: 0,
          paymentPercentage: 0,
          paymentStatus: 'no_data',
          status: 'no_data',
          source: 'placeholder_medication_name',
          message: 'Medication name not provided or is placeholder'
        }
      });
    }

    // Prepare regex for flexible medication name matching
    const baseMedicationName = medicationName.split(/\s*[-–]\s*/)[0].trim();
    const medicationNameRegex = new RegExp(baseMedicationName, 'i');

    // Find the prescription (robust: accept patientId fallback)
    console.log(`🔍 [MEDICATION PAYMENT STATUS] Looking for prescription: ${prescriptionId}`);
    let prescription = null;
    try {
      prescription = await Prescription.findById(prescriptionId);
    } catch (castErr) {
      // Not a valid ObjectId; try as patientId lookup for latest matching medication
      console.warn(`⚠️ [MEDICATION PAYMENT STATUS] Invalid prescriptionId '${prescriptionId}', trying patient-based lookup`);
    }
    if (!prescription) {
      // Treat the provided value as patientId and find latest matching prescription by medication name
      try {
        // Extract base medication name to handle variants like "Ceftriaxone - QD Prescription"
        const nameRegex = new RegExp(baseMedicationName, 'i');
        
        // First try exact patient ID match (only if it's a valid ObjectId)
        if (prescriptionId.match(/^[0-9a-fA-F]{24}$/)) {
          prescription = await Prescription.findOne({
            $and: [
              { $or: [ { patient: prescriptionId }, { patientId: prescriptionId } ] },
              { $or: [ { medicationName: nameRegex }, { 'medications.name': nameRegex } ] }
            ]
          }).sort({ createdAt: -1 });
        }
        
        // If not found and prescriptionId looks like a shortened ID, try to find by partial match
        if (!prescription && prescriptionId.length === 8) {
          console.log(`🔍 [MEDICATION PAYMENT STATUS] Trying partial patient ID match for: ${prescriptionId}`);
          prescription = await Prescription.findOne({
            $and: [
              { 
                $or: [
                  { patient: { $regex: prescriptionId + '$' } },
                  { patientId: { $regex: prescriptionId + '$' } }
                ]
              },
              { $or: [ { medicationName: nameRegex }, { 'medications.name': nameRegex } ] }
            ]
          }).sort({ createdAt: -1 });
        }
      } catch (e) {
        console.error('Error in prescription lookup:', e);
      }
    }

    if (!prescription) {
      console.log(`❌ [MEDICATION PAYMENT STATUS] Prescription not found: ${prescriptionId}`);
      console.log(`🔄 [MEDICATION PAYMENT STATUS] Attempting to fetch payment status directly from billing invoices...`);

      // Debug: Check if patient exists at all
      try {
        const Patient = require('../models/Patient');
        const patientExists = await Patient.findById(prescriptionId);
        console.log(`🔍 [MEDICATION PAYMENT STATUS] Patient exists: ${!!patientExists}`);
        if (patientExists) {
          console.log(`🔍 [MEDICATION PAYMENT STATUS] Patient details: ${patientExists.firstName} ${patientExists.lastName}`);
        }
      } catch (error) {
        console.error(`❌ [MEDICATION PAYMENT STATUS] Error checking patient:`, error.message);
      }
      
      try {
        // If no prescription found, try to get payment status directly from billing invoices
        // This handles cases where medications are billed but no prescription record exists
      
        // Build search conditions for patient - improved matching logic
        const patientConditions = [];
        
        // Add exact patient ID matches for full ObjectIds
        if (prescriptionId.match(/^[0-9a-fA-F]{24}$/)) {
          patientConditions.push({ patient: prescriptionId });
          patientConditions.push({ patientId: prescriptionId });
        }
        
        // Add partial matches for shortened IDs (like e1fe3d35)
        if (prescriptionId.length === 8) {
          // Try regex match at the end of the ID
          patientConditions.push({ patient: { $regex: prescriptionId + '$' } });
          patientConditions.push({ patientId: { $regex: prescriptionId + '$' } });
          // Try exact match for the shortened ID
          patientConditions.push({ patient: prescriptionId });
          patientConditions.push({ patientId: prescriptionId });
          // Try regex match anywhere in the ID
          patientConditions.push({ patient: { $regex: prescriptionId } });
          patientConditions.push({ patientId: { $regex: prescriptionId } });
        }
        
        // Add patient name matching as fallback
        if (prescriptionId.toLowerCase().includes('ato') || prescriptionId.toLowerCase().includes('eliyas')) {
          patientConditions.push({ patientName: { $regex: /ato eliyas/i } });
        }
        
        console.log(`🔍 [MEDICATION PAYMENT STATUS] Patient search conditions for direct invoice lookup:`, patientConditions);
        
        // Find all invoices for this patient
        let invoices = [];
        if (patientConditions.length > 0) {
          invoices = await MedicalInvoice.find({
            $or: patientConditions
          }).sort({ createdAt: -1 });
        }
        
        console.log(`📋 [MEDICATION PAYMENT STATUS] Found ${invoices.length} total invoices for patient ${prescriptionId}`);
        
        // Log sample invoices for debugging
        if (invoices.length > 0) {
          console.log(`🔍 [MEDICATION PAYMENT STATUS] Sample invoices:`, invoices.slice(0, 3).map(inv => ({
            id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            patient: inv.patient,
            patientId: inv.patientId,
            patientName: inv.patientName,
            total: inv.total,
            amountPaid: inv.amountPaid,
            balance: inv.balance,
            items: inv.items ? inv.items.map(item => item.description) : []
          })));
        }
        
        // Filter invoices that contain the specific medication - improved logic
        const medicationInvoices = invoices.filter(invoice => {
          if (!invoice.items || !Array.isArray(invoice.items)) return false;
          
          return invoice.items.some(item => {
            try {
              const description = (item.description || '').toLowerCase();
              const serviceName = (item.serviceName || '').toLowerCase();
              const itemType = (item.itemType || '').toLowerCase();
              const medicationNameFromItem = ((item.metadata && item.metadata.medicationName) || '').toLowerCase();
              const medicationNameLower = medicationName.toLowerCase();
              const baseMedicationName = medicationNameLower.split(' ')[0]; // Get base name like "ceftriaxone"
              
              // Check if this item is a medication (more flexible)
              const isMedication = itemType === 'medication' || 
                                  itemType === 'prescription' ||
                                  description.includes('medication') ||
                                  description.includes('prescription') ||
                                  description.includes('drug') ||
                                  serviceName.includes('medication') ||
                                  serviceName.includes('prescription');
              
              // Check if it matches our medication name (more flexible matching)
              const matchesMedication = 
                description.includes(medicationNameLower) ||
                description.includes(baseMedicationName) ||
                serviceName.includes(medicationNameLower) ||
                serviceName.includes(baseMedicationName) ||
                medicationNameFromItem === medicationNameLower ||
                medicationNameFromItem.includes(medicationNameLower) ||
                medicationNameFromItem.includes(baseMedicationName);
              
              console.log(`🔍 [MEDICATION PAYMENT STATUS] Checking item: ${item.description || item.serviceName}, medicationName: ${medicationName}, isMedication: ${isMedication}, matchesMedication: ${matchesMedication}`);
              
              return isMedication && matchesMedication;
            } catch (error) {
              console.error(`❌ [MEDICATION PAYMENT STATUS] Error processing item:`, error);
              return false;
            }
          });
        });
        
        console.log(`💊 [MEDICATION PAYMENT STATUS] Found ${medicationInvoices.length} invoices containing medication ${medicationName}`);
        
        if (medicationInvoices.length === 0) {
          console.log(`⚠️ [MEDICATION PAYMENT STATUS] No invoices found for medication ${medicationName}`);
          console.log(`🔍 [MEDICATION PAYMENT STATUS] Available invoices for patient:`, invoices.length);
          console.log(`🔍 [MEDICATION PAYMENT STATUS] Medication search pattern: ${medicationName}`);
          console.log(`🔍 [MEDICATION PAYMENT STATUS] Patient conditions used:`, patientConditions);

          // Instead of 404, return a more informative response
          return res.json({
            success: true,
            data: {
              medicationName,
              totalPaid: 0,
              totalCost: 0,
              outstandingAmount: 0,
              paymentPercentage: 0,
              paymentStatus: 'no_data',
              status: 'no_data',
              source: 'no_invoices_found',
              invoiceCount: 0,
              invoices: [],
              message: 'No invoices found for this medication'
            }
          });
        }
      
      // Use shared item-level helper on all patient invoices (not just filtered ones)
      const calc = calcMedicationPayment(invoices, medicationName);
      console.log(`✅ [MEDICATION PAYMENT STATUS] Item-level calculation result:`, calc);
      
      return res.json({
        success: true,
        data: {
          medicationName,
          ...calc,
          status: calc.paymentStatus,
          source: 'billing_invoices_item_level'
        }
      });
      
      } catch (error) {
        console.error(`❌ [MEDICATION PAYMENT STATUS] Error in direct invoice lookup:`, error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching payment status from billing invoices',
          error: error.message
        });
      }
    }

    console.log(`✅ [MEDICATION PAYMENT STATUS] Found prescription: ${prescription.medicationName}`);

    // Check if prescription has payment authorization with medication breakdown
    console.log(`🔍 [MEDICATION PAYMENT STATUS] Checking payment authorization for medication: ${medicationName}`);
    if (prescription.paymentAuthorization && prescription.paymentAuthorization.medicationPaymentPlans) {
      const medicationPlan = prescription.paymentAuthorization.medicationPaymentPlans.find(
        plan => plan.medicationName === medicationName
      );
      
      if (medicationPlan) {
        console.log(`✅ [MEDICATION PAYMENT STATUS] Found medication payment plan:`, medicationPlan);
        return res.json({
          success: true,
          data: medicationPlan
        });
      }
    }
    
    console.log(`🔄 [MEDICATION PAYMENT STATUS] No payment plan found, falling back to billing invoices calculation`);

    // NEW APPROACH: Fetch from billing invoices using the same logic as the billing page
    console.log(`🔍 [MEDICATION PAYMENT STATUS] Fetching billing invoices for patient: ${prescription.patient || prescription.patientId}, medication: ${medicationName}`);
    
    // Build search conditions for patient - improved matching logic
    const patientConditions = [];
    
    // Add exact patient ID matches for full ObjectIds
    if (prescription.patient && prescription.patient.toString().match(/^[0-9a-fA-F]{24}$/)) {
      patientConditions.push({ patient: prescription.patient });
    }
    if (prescription.patientId && prescription.patientId.toString().match(/^[0-9a-fA-F]{24}$/)) {
      patientConditions.push({ patientId: prescription.patientId });
    }
    
    // Add partial matches for shortened IDs (like e1fe3d35)
    if (prescriptionId.length === 8) {
      patientConditions.push({ patient: { $regex: prescriptionId + '$' } });
      patientConditions.push({ patientId: { $regex: prescriptionId + '$' } });
      patientConditions.push({ patient: { $regex: prescriptionId } });
      patientConditions.push({ patientId: { $regex: prescriptionId } });
    }
    
    // If no valid patient conditions, try to use the prescriptionId as patient ID
    if (patientConditions.length === 0) {
      patientConditions.push({ patient: prescriptionId });
      patientConditions.push({ patientId: prescriptionId });
    }
    
    // Add patient name matching as fallback
    if (prescription.patientName && prescription.patientName.toLowerCase().includes('ato eliyas')) {
      patientConditions.push({ patientName: { $regex: /ato eliyas/i } });
    }
    
    console.log(`🔍 [MEDICATION PAYMENT STATUS] Patient search conditions:`, patientConditions);
    
    // Find all invoices for this patient
    let invoices = [];
    if (patientConditions.length > 0) {
      invoices = await MedicalInvoice.find({
        $or: patientConditions
      }).sort({ createdAt: -1 });
    }
    
    console.log(`📋 [MEDICATION PAYMENT STATUS] Found ${invoices.length} total invoices for patient`);
    
    // Use shared item-level helper on all patient invoices
    const calc = calcMedicationPayment(invoices, medicationName);
    console.log(`✅ [MEDICATION PAYMENT STATUS] Item-level result (prescription path):`, calc);

    res.json({
      success: true,
      data: {
        medicationName,
        ...calc,
        status: calc.paymentStatus,
        source: 'billing_invoices_item_level'
      }
    });

  } catch (error) {
    console.error('❌ [MEDICATION PAYMENT STATUS] Error getting payment status:', error);
    console.error('❌ [MEDICATION PAYMENT STATUS] Error stack:', error.stack);

    // Return a proper error response instead of 500
    res.status(200).json({
      success: false,
      message: 'Error retrieving payment status',
      error: error.message,
      data: {
        medicationName: 'Unknown',
        totalPaid: 0,
        totalCost: 0,
        outstandingAmount: 0,
        paymentPercentage: 0,
        paymentStatus: 'error',
        status: 'error',
        source: 'error_occurred',
        error: error.message
      }
    });
  }
});


module.exports = router;
