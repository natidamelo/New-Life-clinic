const express = require('express');
const router = express.Router();
const labOrderController = require('../controllers/labOrderController');
const { authenticate, authorize } = require('../src/middleware/auth');

// Get all lab orders
router.get('/', authenticate, authorize('admin', 'lab'), labOrderController.getLabOrders);

// Create a new lab order
router.post('/', authenticate, authorize('admin', 'doctor'), labOrderController.createLabOrder);

// Update a lab order
router.put('/:id', authenticate, authorize('admin', 'lab'), labOrderController.updateLabOrder);

// Delete a lab order
router.delete('/:id', authenticate, authorize('admin'), labOrderController.deleteLabOrder);

module.exports = router; 