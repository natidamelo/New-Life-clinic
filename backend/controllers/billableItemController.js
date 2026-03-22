const BillableItem = require('../models/BillableItem');
const InventoryItem = require('../models/InventoryItem');

// List all billable items (with optional filters)
exports.list = async (req, res, next) => {
  try {
    const { type, isActive, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };
    const items = await BillableItem.find(filter).populate('inventoryItem');
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

// Get a single billable item
exports.get = async (req, res, next) => {
  try {
    const item = await BillableItem.findById(req.params.id).populate('inventoryItem');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// Create a new billable item
exports.create = async (req, res, next) => {
  try {
    const { name, type, price, inventoryItem, code } = req.body;
    const item = new BillableItem({ name, type, price, inventoryItem, code });
    await item.save();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// Update a billable item
exports.update = async (req, res, next) => {
  try {
    const { name, type, price, inventoryItem, code, isActive } = req.body;
    const item = await BillableItem.findByIdAndUpdate(
      req.params.id,
      { name, type, price, inventoryItem, code, isActive },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// Deactivate (soft delete) a billable item
exports.deactivate = async (req, res, next) => {
  try {
    const item = await BillableItem.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}; 
