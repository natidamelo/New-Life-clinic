const express = require('express');
const router = express.Router();
const billableItemController = require('../controllers/billableItemController');
const BillableItem = require('../models/BillableItem');

// List all billable items
router.get('/', billableItemController.list);
// Get a single billable item
router.get('/:id', billableItemController.get);
// Create a new billable item
router.post('/', billableItemController.create);
// Update a billable item
router.put('/:id', billableItemController.update);
// Deactivate (soft delete) a billable item
router.delete('/:id', billableItemController.deactivate);

// GET /billable-items?isActive=true
router.get('/active', async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }
    const items = await BillableItem.find(filter);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch billable items' });
  }
});

module.exports = router; 
