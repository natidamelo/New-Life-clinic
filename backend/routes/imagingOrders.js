const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ImagingOrder = require('../models/ImagingOrder');
const Visit = require('../models/Visit'); // Needed to link order to visit
const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const Notification = require('../models/Notification');
const InventoryItem = require('../models/InventoryItem');
const billingService = require('../services/billingService');
const { auth, checkRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}

function getPatientDisplayName(patientDocOrId) {
  if (!patientDocOrId || typeof patientDocOrId !== 'object') return 'Unknown Patient';
  const first = patientDocOrId.firstName || '';
  const last = patientDocOrId.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || patientDocOrId.name || 'Unknown Patient';
}

function pushReportHistory(imagingOrder, { action, user, note } = {}) {
  if (!imagingOrder.reportWorkflow) imagingOrder.reportWorkflow = {};
  if (!Array.isArray(imagingOrder.reportWorkflow.history)) imagingOrder.reportWorkflow.history = [];
  imagingOrder.reportWorkflow.history.push({
    action,
    by: user?._id || user?.id,
    role: user?.role,
    note,
    snapshotVersion: imagingOrder.reportWorkflow.version
  });
}

async function syncPatientImagingRecord({ imagingOrder, user, results, notesOverride }) {
  if (!imagingOrder?.patientId) return;
  try {
    const Patient = require('../models/Patient');
    const patient = await Patient.findById(imagingOrder.patientId);
    if (!patient) return;

    const existingImagingIndex = patient.imaging.findIndex(img =>
      img.type === imagingOrder.imagingType &&
      img.date && new Date(img.date).toDateString() === new Date(imagingOrder.orderDateTime).toDateString()
    );

    const orderedBy = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.name || 'Staff');

    const imagingEntry = {
      type: imagingOrder.imagingType,
      orderedBy,
      date: imagingOrder.orderDateTime,
      status: 'completed',
      results: typeof results === 'object' ? JSON.stringify(results) : results,
      notes: notesOverride ?? imagingOrder.notes ?? ''
    };

    if (existingImagingIndex >= 0) patient.imaging[existingImagingIndex] = imagingEntry;
    else patient.imaging.push(imagingEntry);

    await patient.save();
  } catch (error) {
    console.error('Error syncing patient imaging record:', error);
  }
}

function buildImagingSearchCandidates(imagingType, bodyPart) {
  const normalize = (val) => (val || '').trim();
  const candidates = new Set();
  const type = normalize(imagingType);
  const body = normalize(bodyPart);

  if (type) {
    candidates.add(type);
    candidates.add(type.replace(/-/g, ' '));
  }
  if (body) {
    candidates.add(body);
    candidates.add(body.replace(/-/g, ' '));
  }
  if (type && body) {
    candidates.add(`${type} ${body}`);
    candidates.add(`${body} ${type}`);
    candidates.add(`${type} - ${body}`);
    candidates.add(`${body} - ${type}`);
  }

  return Array.from(candidates).filter(Boolean);
}

async function findInventoryItemForCandidates(candidateNames = []) {
  for (const candidate of candidateNames) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    const exactMatch = await InventoryItem.findOne({
      name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i'),
      isActive: { $ne: false }
    });
    if (exactMatch) {
      return exactMatch;
    }
  }

  for (const candidate of candidateNames) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    const partialPattern = trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map(escapeRegex)
      .join('.*');
    if (!partialPattern) continue;
    const partialMatch = await InventoryItem.findOne({
      name: new RegExp(partialPattern, 'i'),
      isActive: { $ne: false }
    });
    if (partialMatch) {
      return partialMatch;
    }
  }

  return null;
}

function resolveInventoryPrice(inventoryItem) {
  if (!inventoryItem) return null;
  if (typeof inventoryItem.sellingPrice === 'number' && inventoryItem.sellingPrice > 0) {
    return inventoryItem.sellingPrice;
  }
  if (typeof inventoryItem.costPrice === 'number' && inventoryItem.costPrice > 0) {
    return inventoryItem.costPrice;
  }
  return null;
}

// GET all imaging orders (temporarily without auth to fix 403 errors)
// Now filters to ONLY show orders with PAID invoices (payment gating)
router.get('/', async (req, res) => {
  try {
    // Optional query flags
    const includeUnpaid = req.query.includeUnpaid === 'true';
    
    // Basic filter (extendable with patientId, doctorId, status, date range)
    const filter = {};
    
    // Populate related references including serviceRequest -> invoice for payment status
    const imagingOrders = await ImagingOrder.find(filter)
      .populate('patientId')
      .populate('orderingDoctorId')
      .populate({
        path: 'serviceRequestId',
        populate: { path: 'invoice', select: 'status' }
      });
    
    // Filter out orders with null patientId or orderingDoctorId first
    let validImagingOrders = imagingOrders.filter(order => 
      order.patientId != null && order.orderingDoctorId != null
    );
    
    // Enforce payment gating unless explicitly overridden for admins/testing
    if (!includeUnpaid) {
      validImagingOrders = validImagingOrders.filter(order => {
        const sr = order.serviceRequestId;
        if (!sr) return false;
        // Visible if: the linked invoice is paid/partial OR the service request has moved into workflow
        const invoiceStatus = sr.invoice?.status?.toLowerCase();
        const invoicePaid = invoiceStatus === 'paid' || invoiceStatus === 'partial' || invoiceStatus === 'partially_paid';
        const srAdvanced = ['in-progress', 'completed'].includes((sr.status || '').toLowerCase());
        return invoicePaid || srAdvanced;
      });
    }
    
    console.log(`Found ${imagingOrders.length} total imaging orders, ${validImagingOrders.length} with valid data`);
    
    res.json(validImagingOrders);
  } catch (err) {
    console.error('Error fetching imaging orders:', err);
    res.status(500).send('Server Error');
  }
});

// GET imaging results by patient ID (for medical history)
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log(`Fetching imaging results for patient: ${patientId}`);
    
    // First, try to find the patient to get their ObjectId
    const Patient = require('../models/Patient');
    let patientObjectId = null;
    
    // Try to find patient by ObjectId first
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      const patient = await Patient.findById(patientId);
      if (patient) {
        patientObjectId = patient._id;
        console.log(`Found patient by ObjectId: ${patient.firstName} ${patient.lastName}`);
      }
    }
    
    // If not found by ObjectId, try to find by patientId string
    if (!patientObjectId) {
      const patient = await Patient.findOne({ patientId: patientId });
      if (patient) {
        patientObjectId = patient._id;
        console.log(`Found patient by patientId string: ${patient.firstName} ${patient.lastName}`);
      }
    }
    
    if (!patientObjectId) {
      console.log(`Patient not found for ID: ${patientId}`);
      return res.json([]);
    }
    
    // Find imaging orders for this patient with results
    const imagingOrders = await ImagingOrder.find({
      patientId: patientObjectId,
      $or: [
        { status: 'Results Available' },
        { status: 'Completed' },
        { status: 'In Progress' },
        { results: { $exists: true, $ne: null } },
        { resultsSummary: { $exists: true, $ne: null } },
        // Legacy/new workflow compatibility: status may remain older value while report is finalized/sent
        { 'reportWorkflow.status': { $in: ['Finalized', 'Sent'] } }
      ]
    })
    .populate('patientId')
    .populate('orderingDoctorId');
    
    console.log(`Found ${imagingOrders.length} imaging orders with results for patient ${patientId}`);
    
    res.json(imagingOrders);
  } catch (err) {
    console.error('Error fetching imaging results by patient:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET imaging order by ID (temporarily without auth to fix 403 errors)
router.get('/:id', async (req, res) => {
  try {
    const imagingOrder = await ImagingOrder.findById(req.params.id)
                                           .populate('patientId')
                                           .populate('orderingDoctorId');
    if (!imagingOrder) {
      return res.status(404).json({ msg: 'Imaging order not found' });
    }
    res.json(imagingOrder);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Imaging order not found' });
    }
    res.status(500).send('Server Error');
  }
});

// PUT save imaging report DRAFT (persist results without releasing to doctor)
router.put(
  '/:id/report/draft',
  [
    auth,
    checkRole('imaging', 'radiologist', 'admin'),
    body('results').optional().isObject().withMessage('results must be an object')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const imagingOrder = await ImagingOrder.findById(req.params.id)
        .populate('patientId')
        .populate('orderingDoctorId');

      if (!imagingOrder) return res.status(404).json({ msg: 'Imaging order not found' });

      const workflowStatus = imagingOrder.reportWorkflow?.status || 'Draft';
      if (['Finalized', 'Sent'].includes(workflowStatus)) {
        return res.status(409).json({ msg: `Report is already ${workflowStatus.toLowerCase()} and cannot be saved as draft.` });
      }

      if (req.body.results) {
        imagingOrder.results = req.body.results;
      }

      if (!imagingOrder.reportWorkflow) imagingOrder.reportWorkflow = {};
      imagingOrder.reportWorkflow.status = 'Draft';
      imagingOrder.reportWorkflow.lastDraftSavedAt = new Date();

      pushReportHistory(imagingOrder, { action: 'draft_saved', user: req.user });

      await imagingOrder.save();
      return res.json(imagingOrder);
    } catch (err) {
      console.error('Error saving imaging draft:', err);
      return res.status(500).json({ msg: 'Server Error' });
    }
  }
);

// PUT finalize imaging report (validates required fields, marks results available)
router.put(
  '/:id/report/finalize',
  [
    auth,
    checkRole('imaging', 'radiologist', 'admin'),
    body('results').exists().withMessage('results is required').isObject().withMessage('results must be an object')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const imagingOrder = await ImagingOrder.findById(req.params.id)
        .populate('patientId')
        .populate('orderingDoctorId');

      if (!imagingOrder) return res.status(404).json({ msg: 'Imaging order not found' });

      const currentStatus = imagingOrder.reportWorkflow?.status || 'Draft';
      if (currentStatus === 'Sent') {
        return res.status(409).json({ msg: 'Report is already sent and cannot be finalized again.' });
      }

      const results = req.body.results || {};
      const impression = stripHtml(results.impression || '');
      const findings = stripHtml(results.findings || '');
      const conclusion = stripHtml(results.conclusion || '');
      const radiologist = stripHtml(results.radiologist || '');

      if (!impression) return res.status(400).json({ msg: 'Impression is required to finalize.' });
      if (!findings) return res.status(400).json({ msg: 'Detailed findings is required to finalize.' });
      if (!conclusion) return res.status(400).json({ msg: 'Conclusion is required to finalize.' });
      if (!radiologist) return res.status(400).json({ msg: 'Radiologist name is required to finalize.' });

      imagingOrder.results = results;

      if (!imagingOrder.reportWorkflow) imagingOrder.reportWorkflow = {};
      imagingOrder.reportWorkflow.status = 'Finalized';
      imagingOrder.reportWorkflow.finalizedAt = new Date();
      imagingOrder.reportWorkflow.finalizedBy = req.user._id;
      imagingOrder.reportWorkflow.lastDraftSavedAt = imagingOrder.reportWorkflow.lastDraftSavedAt || new Date();

      // Keep study status separate, but mark results available for doctor visibility
      imagingOrder.status = 'Results Available';
      if (!imagingOrder.completionDateTime) imagingOrder.completionDateTime = Date.now();

      pushReportHistory(imagingOrder, { action: 'finalized', user: req.user });

      await imagingOrder.save();

      // Sync finalized report into patient medical history
      await syncPatientImagingRecord({ imagingOrder, user: req.user, results, notesOverride: imagingOrder.notes });

      // Create in-app notification for ordering doctor
      const patientName = getPatientDisplayName(imagingOrder.patientId);
      await new Notification({
        title: 'Imaging report finalized',
        message: `Imaging report finalized for ${patientName} (${imagingOrder.imagingType} - ${imagingOrder.bodyPart}).`,
        type: 'imaging_report_finalized',
        senderId: req.user._id.toString(),
        senderRole: req.user.role,
        recipientId: imagingOrder.orderingDoctorId?._id?.toString?.() || imagingOrder.orderingDoctorId?.toString?.() || null,
        recipientRole: 'doctor',
        priority: 'medium',
        category: 'service',
        data: {
          imagingOrderId: imagingOrder._id,
          patientId: imagingOrder.patientId?._id || imagingOrder.patientId,
          imagingType: imagingOrder.imagingType,
          bodyPart: imagingOrder.bodyPart,
          reportStatus: imagingOrder.reportWorkflow.status
        }
      }).save();

      return res.json(imagingOrder);
    } catch (err) {
      console.error('Error finalizing imaging report:', err);
      return res.status(500).json({ msg: 'Server Error' });
    }
  }
);

// PUT send imaging report to doctor (locks as sent + notification)
router.put(
  '/:id/report/send',
  [auth, checkRole('imaging', 'radiologist', 'admin')],
  async (req, res) => {
    try {
      const imagingOrder = await ImagingOrder.findById(req.params.id)
        .populate('patientId')
        .populate('orderingDoctorId');

      if (!imagingOrder) return res.status(404).json({ msg: 'Imaging order not found' });

      const currentStatus = imagingOrder.reportWorkflow?.status || 'Draft';
      if (currentStatus !== 'Finalized') {
        return res.status(409).json({ msg: 'Report must be finalized before sending to doctor.' });
      }

      imagingOrder.reportWorkflow.status = 'Sent';
      imagingOrder.reportWorkflow.sentAt = new Date();
      imagingOrder.reportWorkflow.sentBy = req.user._id;
      pushReportHistory(imagingOrder, { action: 'sent', user: req.user });

      await imagingOrder.save();

      const patientName = getPatientDisplayName(imagingOrder.patientId);
      await new Notification({
        title: 'Imaging report sent',
        message: `Imaging report sent to you for ${patientName} (${imagingOrder.imagingType} - ${imagingOrder.bodyPart}).`,
        type: 'imaging_report_sent',
        senderId: req.user._id.toString(),
        senderRole: req.user.role,
        recipientId: imagingOrder.orderingDoctorId?._id?.toString?.() || imagingOrder.orderingDoctorId?.toString?.() || null,
        recipientRole: 'doctor',
        priority: 'medium',
        category: 'service',
        data: {
          imagingOrderId: imagingOrder._id,
          patientId: imagingOrder.patientId?._id || imagingOrder.patientId,
          imagingType: imagingOrder.imagingType,
          bodyPart: imagingOrder.bodyPart,
          reportStatus: imagingOrder.reportWorkflow.status
        }
      }).save();

      return res.json(imagingOrder);
    } catch (err) {
      console.error('Error sending imaging report:', err);
      return res.status(500).json({ msg: 'Server Error' });
    }
  }
);

// POST create new imaging order
router.post('/', [auth,
  checkRole('doctor', 'nurse'), // Roles that can order imaging
  body('patientId', 'Patient ID is required').not().isEmpty().isMongoId(),
  body('visitId').optional().isMongoId(),
  body('imagingType', 'Imaging type is required').not().isEmpty(),
  body('bodyPart', 'Body part is required').not().isEmpty(),
  body('serviceId').optional().isMongoId(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Creating imaging order with data:', req.body);
    console.log('User from auth middleware:', req.user);
    let {
      patientId,
      visitId,
      imagingType,
      bodyPart,
      laterality,
      contrast,
      notes,
      priority,
      serviceId
    } = req.body;

    const candidateNames = buildImagingSearchCandidates(imagingType, bodyPart);
    let inventoryItem = await findInventoryItemForCandidates(candidateNames);
    const imagingCategories = ['imaging', 'ultrasound', 'xray'];

    // 1) Resolve the imaging Service (use provided serviceId, otherwise smart lookup by name)
    let imagingService = null;
    if (serviceId) {
      imagingService = await Service.findOne({ 
        _id: serviceId, 
        category: { $in: imagingCategories }, 
        isActive: true 
      }).populate('linkedInventoryItems');
    }
    if (!imagingService) {
      // Try a robust lookup using bodyPart/imagingType combinations
      for (const candidate of candidateNames) {
        // Exact match first
        imagingService = await Service.findOne({
          category: { $in: imagingCategories },
          isActive: true,
          name: new RegExp(`^${escapeRegex(candidate)}$`, 'i')
        }).populate('linkedInventoryItems');
        if (imagingService) break;
      }

      if (!imagingService) {
        // Partial contains match as fallback
        for (const candidate of candidateNames) {
          const partialPattern = candidate
            .split(/\s+/)
            .filter(Boolean)
            .map(escapeRegex)
            .join('.*');
          if (!partialPattern) continue;
          imagingService = await Service.findOne({
            category: { $in: imagingCategories },
            isActive: true,
            name: new RegExp(partialPattern, 'i')
          }).populate('linkedInventoryItems');
          if (imagingService) break;
        }
      }
    }

    if (!inventoryItem && imagingService && imagingService.linkedInventoryItems && imagingService.linkedInventoryItems.length > 0) {
      inventoryItem = imagingService.linkedInventoryItems[0];
    }

    if (!inventoryItem && imagingService) {
      inventoryItem = await findInventoryItemForCandidates([imagingService.name, ...candidateNames]);
    }

    // If still not found, AUTO-CREATE a Service entry so reception gets a payment notification
    if (!imagingService) {
      if (!inventoryItem) {
        return res.status(400).json({
          msg: 'No matching imaging stock item found. Please add the imaging service in Stock Management before ordering.'
        });
      }

      const inventoryPrice = resolveInventoryPrice(inventoryItem);
      if (!inventoryPrice) {
        return res.status(400).json({
          msg: `Inventory item '${inventoryItem.name}' is missing a valid selling price. Update Stock Management before ordering.`
        });
      }

      try {
        imagingService = await Service.create({
          name: inventoryItem.name || (bodyPart || imagingType || 'Imaging').trim(),
          category: 'imaging',
          price: inventoryPrice,
          description: inventoryItem.description || `Auto-created from imaging order for ${inventoryItem.name}`,
          isActive: true,
          unit: inventoryItem.unit || 'service',
          linkedInventoryItems: [inventoryItem._id]
        });
        console.log(`✅ Auto-created imaging Service '${imagingService.name}' linked to inventory '${inventoryItem.name}' @ ${inventoryPrice} ETB`);
      } catch (createErr) {
        console.error('❌ Failed to auto-create imaging service:', createErr);
      }
    }

    if (!inventoryItem && imagingService && imagingService.linkedInventoryItems && imagingService.linkedInventoryItems.length > 0) {
      inventoryItem = imagingService.linkedInventoryItems[0];
    }

    if (!inventoryItem) {
      return res.status(400).json({
        msg: 'Unable to resolve imaging price from Stock Management. Please link the imaging service to an inventory item.'
      });
    }

    const inventoryPrice = resolveInventoryPrice(inventoryItem);
    if (!inventoryPrice) {
      return res.status(400).json({
        msg: `Inventory item '${inventoryItem.name}' does not have a valid selling price. Please update Stock Management.`
      });
    }

    if (imagingService) {
      let needsSave = false;
      if (!imagingService.linkedInventoryItems || imagingService.linkedInventoryItems.length === 0) {
        imagingService.linkedInventoryItems = [inventoryItem._id];
        needsSave = true;
      }
      if (imagingService.price !== inventoryPrice) {
        imagingService.price = inventoryPrice;
        needsSave = true;
      }
      if (needsSave) {
        await imagingService.save();
      }
    }

    // 2) If we found a service, create a ServiceRequest and attach to an invoice
    let createdServiceRequest = null;
    let linkedInvoice = null;
    if (imagingService) {
      createdServiceRequest = await ServiceRequest.create({
        patient: patientId,
        service: imagingService._id,
        notes: notes || `${imagingService.name} requested`
      });

      // Add to patient's daily invoice as an imaging item
      try {
        linkedInvoice = await billingService.addServiceToDailyInvoice(
          patientId,
          'imaging',
          {
            description: imagingService.name,
            totalPrice: imagingService.price,
            amount: imagingService.price,
            serviceName: imagingService.name,
            unitPrice: imagingService.price,
            quantity: 1,
            metadata: {
              serviceId: imagingService._id,
              category: imagingService.category
            }
          },
          req.user._id
        );
        // Link invoice to the service request
        createdServiceRequest.invoice = linkedInvoice._id;
        await createdServiceRequest.save();

        // Create payment notification for reception
        // Fetch patient for notification context (optional)
        let patientDoc = null;
        try {
          patientDoc = await require('../models/Patient').findById(patientId).select('firstName lastName');
        } catch (_) {}

        await new Notification({
          title: 'Service Payment Required',
          message: `Payment required for ${imagingService.name}.`,
          type: 'service_payment_required',
          senderId: req.user._id.toString(),
          senderRole: req.user.role,
          recipientRole: 'reception',
          priority: 'medium',
          data: {
            patientId: patientId,
            patientName: patientDoc ? `${patientDoc.firstName || ''} ${patientDoc.lastName || ''}`.trim() : undefined,
            serviceRequestId: createdServiceRequest._id,
            serviceName: imagingService.name,
            serviceCategory: imagingService.category,
            invoiceId: linkedInvoice._id,
            invoiceNumber: linkedInvoice.invoiceNumber,
            totalAmount: imagingService.price,
            amount: imagingService.price,
            paymentStatus: 'pending'
          }
        }).save();
      } catch (invoiceErr) {
        console.error('Error creating imaging invoice:', invoiceErr);
      }
    }

    // 3) Create ImagingOrder and link to the created ServiceRequest (if any)
    const newImagingOrder = new ImagingOrder({
      patientId,
      orderingDoctorId: req.user.id || req.user._id,
      visitId,
      imagingType,
      bodyPart,
      laterality,
      contrast,
      status: 'Ordered',
      notes,
      priority,
      ...(createdServiceRequest && { serviceRequestId: createdServiceRequest._id }),
      ...(imagingService && { serviceId: imagingService._id, servicePrice: imagingService.price })
    });

    console.log('Attempting to save imaging order:', newImagingOrder);
    const imagingOrder = await newImagingOrder.save();
    console.log('Successfully saved imaging order:', imagingOrder);

    // If visitId provided, link order to visit
    if (visitId) {
      await Visit.findByIdAndUpdate(visitId, {
        $push: { imagingOrderIds: imagingOrder._id }
      });
    }

    res.status(201).json({
      ...imagingOrder.toObject(),
      // Include lightweight billing info so frontend can show payment pending if needed
      billing: createdServiceRequest && linkedInvoice ? {
        serviceRequestId: createdServiceRequest._id,
        invoiceId: linkedInvoice._id,
        invoiceStatus: linkedInvoice.status
      } : undefined
    });
  } catch (err) {
    console.error('Error creating imaging order:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    
    // Return more specific error messages
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validation failed', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// PUT update imaging order (e.g., change status, add results)
router.put('/:id', [auth,
  checkRole('doctor', 'nurse', 'radiologist', 'admin', 'imaging'), // Roles that can update imaging orders
  body('status').optional().isIn(['Ordered', 'Scheduled', 'In Progress', 'Completed', 'Results Available', 'Cancelled']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Updating imaging order:', req.params.id);
    console.log('Update data:', req.body);
    console.log('User making update:', req.user);
    
    const updateData = { ...req.body };
    
    // Backward-compatible behavior: if results are being added via this generic endpoint,
    // treat it as "results available" unless caller explicitly sets status.
    if (updateData.results && !updateData.status) updateData.status = 'Results Available';
    
    if(updateData.status === 'Results Available' && !updateData.completionDateTime) {
        updateData.completionDateTime = Date.now(); // Set completion time if results are available
    }
     if(updateData.status === 'Scheduled' && !updateData.scheduledDateTime && req.body.scheduledDateTime) {
        updateData.scheduledDateTime = req.body.scheduledDateTime; // Allow setting schedule time
    }

    console.log('Final update data:', updateData);

    const imagingOrder = await ImagingOrder.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('patientId');

    console.log('Updated imaging order:', imagingOrder);

    if (!imagingOrder) {
      return res.status(404).json({ msg: 'Imaging order not found' });
    }

    // If results are being added and the report is finalized/sent (or status indicates availability),
    // sync into patient medical history.
    const reportStatus = imagingOrder.reportWorkflow?.status;
    const shouldSyncPatientRecord =
      !!updateData.results &&
      (reportStatus === 'Finalized' || reportStatus === 'Sent' || imagingOrder.status === 'Results Available' || imagingOrder.status === 'Completed');

    if (shouldSyncPatientRecord) {
      await syncPatientImagingRecord({
        imagingOrder,
        user: req.user,
        results: updateData.results,
        notesOverride: updateData.notes || imagingOrder.notes || ''
      });
    }

    res.json(imagingOrder);
  } catch (err) {
    console.error('Error updating imaging order:', err);
    res.status(500).send('Server Error');
  }
});

// DELETE imaging order (use with caution - better to change status to Cancelled)
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const imagingOrder = await ImagingOrder.findById(req.params.id);
    if (!imagingOrder) {
      return res.status(404).json({ msg: 'Imaging order not found' });
    }

    // Instead of deleting, change status to 'Cancelled'
    imagingOrder.status = 'Cancelled';
    await imagingOrder.save();

    // Optionally remove from Visit document?
    // await Visit.findByIdAndUpdate(imagingOrder.visitId, {
    //     $pull: { imagingOrderIds: imagingOrder._id }
    // });

    res.json({ msg: 'Imaging order cancelled' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 
