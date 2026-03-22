const express = require('express');
const router = express.Router();
const { auth, checkRole, checkPermission } = require('../middleware/auth');
const DispensedItemCharge = require('../models/DispensedItemCharge');
const { param, body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// GET /api/dispensed-charges/pending/:patientId - Fetch pending charges for a patient
router.get('/pending/:patientId', [auth,
    checkPermission('billing.view'), // Or a suitable permission
    param('patientId').isMongoId().withMessage('Invalid Patient ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const pendingCharges = await DispensedItemCharge.find({
            patient: req.params.patientId,
            status: 'pending_billing'
        })
        .populate('inventoryItem', 'name unit itemCode') // Populate details from InventoryItem
        .populate('dispensedBy', 'firstName lastName')   // Populate user who dispensed
        .sort({ dispenseDate: -1 }); // Show most recent first

        res.json(pendingCharges);
    } catch (error) {
        console.error('Error fetching pending dispensed charges:', error);
        res.status(500).json({ message: 'Server error fetching pending charges.', error: error.message });
    }
});

// PUT /api/dispensed-charges/:chargeId/mark-billed - Mark a charge as billed and link to invoice
router.put('/:chargeId/mark-billed', [auth,
    checkPermission('billing.update'), // Or a suitable permission
    param('chargeId').isMongoId().withMessage('Invalid Charge ID'),
    body('invoiceId').isMongoId().withMessage('Valid Invoice ID is required to mark charge as billed.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { chargeId } = req.params;
    const { invoiceId } = req.body;

    try {
        const charge = await DispensedItemCharge.findById(chargeId);

        if (!charge) {
            return res.status(404).json({ message: 'Dispensed charge not found.' });
        }

        if (charge.status === 'billed') {
            return res.status(400).json({ message: 'Charge is already marked as billed.', charge });
        }

        charge.status = 'billed';
        charge.invoice = invoiceId;
        charge.updatedAt = Date.now(); // Manually update if not using default schema timestamps for this field only

        await charge.save();

        res.json({ message: 'Dispensed charge successfully marked as billed.', charge });
    } catch (error) {
        console.error('Error marking charge as billed:', error);
        res.status(500).json({ message: 'Server error marking charge as billed.', error: error.message });
    }
});

// PUT /api/dispensed-charges/:chargeId/cancel - Cancel a pending charge
router.put('/:chargeId/cancel', [auth,
    checkPermission('billing.update'), // Or a suitable permission, maybe more restrictive
    param('chargeId').isMongoId().withMessage('Invalid Charge ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { chargeId } = req.params;

    try {
        const charge = await DispensedItemCharge.findById(chargeId);

        if (!charge) {
            return res.status(404).json({ message: 'Dispensed charge not found.' });
        }

        if (charge.status === 'billed') {
            return res.status(400).json({ message: 'Cannot cancel a charge that has already been billed.' });
        }
        if (charge.status === 'cancelled') {
            return res.status(400).json({ message: 'Charge is already cancelled.' });
        }

        charge.status = 'cancelled';
        // Optionally, add a reason for cancellation from req.body.notes or similar
        // charge.notes = req.body.cancellationReason || charge.notes;
        charge.updatedAt = Date.now(); 

        await charge.save();

        res.json({ message: 'Dispensed charge successfully cancelled.', charge });
    } catch (error) {
        console.error('Error cancelling charge:', error);
        res.status(500).json({ message: 'Server error cancelling charge.', error: error.message });
    }
});


module.exports = router; 
