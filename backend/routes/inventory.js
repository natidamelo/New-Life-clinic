const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const inventoryService = require('../services/inventoryService');

// Stock movements (GET all, POST new)
router.get('/movements', auth, async (req, res) => {
  try {
    const { itemId, type, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (itemId) filter.item = itemId;
    if (type) filter.transactionType = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await InventoryTransaction.countDocuments(filter);
    const movements = await InventoryTransaction.find(filter)
      .populate('item', 'name itemCode')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: movements
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/movements', auth, async (req, res) => {
  try {
    const { itemId, type, quantity, reason, reference } = req.body;
    if (!itemId || !type || !quantity || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!['add', 'remove'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be "add" or "remove".' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0.' });
    }
    
    try {
      const item = await InventoryItem.findById(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }

      const previousQuantity = item.quantity;
      const transactionQuantity = type === 'add' ? quantity : -quantity;
      const newQuantity = previousQuantity + transactionQuantity;

      // Check if we have enough stock for removal
      if (type === 'remove' && item.quantity < quantity) {
        return res.status(400).json({ message: 'Not enough stock to remove' });
      }

      // Prevent negative stock just in case
      if (newQuantity < 0) {
        return res.status(400).json({ message: 'Resulting stock cannot be negative' });
      }

      // Update item quantity
      item.quantity = newQuantity;
      item.updatedBy = req.user.id || req.user._id;
      await item.save();

      // Create movement transaction (skip hook-based quantity update since we already adjusted it)
      const transaction = new InventoryTransaction({
        item: item._id,
        transactionType: type === 'add' ? 'purchase' : 'medical-use',
        quantity: transactionQuantity,
        previousQuantity,
        newQuantity,
        reason,
        documentReference: reference,
        performedBy: req.user.id || req.user._id,
        status: 'completed',
        _skipInventoryUpdate: true,
      });

      await transaction.save();

      res.status(201).json({
        message: 'Stock movement recorded',
        item,
        transaction,
      });
    } catch (err) {
      console.error('Error recording stock movement:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  } catch (error) {
    console.error('Error in stock movement endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public route: Get medications for prescription use (no auth required)
router.get('/medications-for-prescription', async (req, res) => {
  try {
    const medications = await InventoryItem.find({
      category: 'medication',
      isActive: { $ne: false },
      quantity: { $gt: 0 }
    }).select('_id name description sellingPrice costPrice quantity unit category');
    
    console.log(`🔍 [PUBLIC] Returning ${medications.length} medications for prescription use`);
    res.json(medications);
  } catch (error) {
    console.error('Error fetching medications for prescription:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all inventory items with optional filters
router.get('/', auth, async (req, res) => {
  try {
    const { category, lowStock, search, withServices } = req.query;
    const filter = {};
    
    // Apply filters if provided
    if (category) filter.category = category;
    if (lowStock === 'true') filter.quantity = { $lte: '$minimumStockLevel' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Fetch inventory items with filters
    let items = await InventoryItem.find(filter)
      .populate('updatedBy', 'firstName lastName')
      .sort({ name: 1 });
    
    // ✅ ENHANCEMENT: If withServices=true, populate service information
    if (withServices === 'true') {
      const Service = require('../models/Service');
      items = await Promise.all(items.map(async (item) => {
        const itemObj = item.toObject({ virtuals: true });
        itemObj.isLowStock = item.isLowStock;
        itemObj.needsReorder = item.needsReorder;
        
        // Find services linked to this inventory item
        const linkedServices = await Service.find({
          linkedInventoryItems: item._id,
          isActive: true
        }).select('name category price');
        
        if (linkedServices.length > 0) {
          itemObj.serviceStatus = {
            linked: true,
            services: linkedServices.map(s => ({
              id: s._id,
              name: s.name,
              category: s.category,
              price: s.price
            }))
          };
        } else {
          // Check if matching service exists (for suggestion)
          const matchingService = await Service.findOne({
            name: { $regex: new RegExp(item.name, 'i') },
            isActive: true
          });
          
          if (matchingService) {
            itemObj.serviceStatus = {
              linked: false,
              suggestion: {
                available: true,
                serviceId: matchingService._id,
                serviceName: matchingService.name,
                message: `Found matching service: ${matchingService.name}`
              }
            };
          } else {
            itemObj.serviceStatus = {
              linked: false,
              suggestion: { available: false }
            };
          }
        }
        
        return itemObj;
      }));
    } else {
      // Add virtual properties that aren't automatically included in the response
      items = items.map(item => {
        const itemObj = item.toObject({ virtuals: true });
        itemObj.isLowStock = item.isLowStock;
        itemObj.needsReorder = item.needsReorder;
        return itemObj;
      });
    }
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single inventory item
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate('updatedBy', 'firstName lastName');
    
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    // Include virtual properties
    const itemObj = item.toObject({ virtuals: true });
    itemObj.isLowStock = item.isLowStock;
    itemObj.needsReorder = item.needsReorder;
    
    res.json(itemObj);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new inventory item
router.post('/', [auth,
  // checkRole(['admin']), // Temporarily disabled for testing
  body('itemCode').optional(),
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').optional(),
  body('unit').optional(),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
  body('minimumStockLevel').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be a positive integer'),
  body('reorderPoint').optional().isInt({ min: 0 }).withMessage('Reorder point must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    console.log('Creating inventory item with data:', req.body);
    
    // Generate itemCode if not provided
    let itemCode = req.body.barcode || req.body.itemCode;
    if (!itemCode) {
      // Generate item code based on category and name
      const namePrefix = req.body.name.substring(0, 3).toUpperCase();
      const categoryPrefix = (req.body.category || 'GEN').substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().slice(-6);
      itemCode = `${categoryPrefix}-${namePrefix}-${timestamp}`;
    }
    
    // Check if item code already exists
    const existingItem = await InventoryItem.findOne({ itemCode: itemCode });
    if (existingItem) {
      // If auto-generated code exists, try with random suffix
      itemCode = itemCode + '-' + Math.floor(Math.random() * 1000);
    }
    
    // Capture initial quantity separately to avoid double-counting with transaction hook
    const initialQuantity = parseInt(req.body.quantity) || 0;

    // Map category - handle imaging subcategories (ultrasound, xray, etc.) -> 'imaging'
    let mappedCategory = req.body.category;
    if (req.body.itemType === 'imaging' || ['imaging', 'ultrasound', 'xray', 'x-ray', 'ct', 'mri', 'mammography'].includes(req.body.category?.toLowerCase())) {
      mappedCategory = 'imaging';
    } else if (req.body.itemType === 'lab' || req.body.category === 'laboratory') {
      mappedCategory = 'laboratory';
    } else if (req.body.itemType === 'medication') {
      mappedCategory = 'medication';
    } else if (req.body.itemType === 'equipment') {
      mappedCategory = 'equipment';
    } else if (req.body.itemType === 'supplies') {
      mappedCategory = 'supplies';
    } else if (req.body.itemType === 'service') {
      mappedCategory = 'service';
    } else {
      mappedCategory = mappedCategory || req.body.itemType || 'other';
    }

    // Map frontend form data to backend fields
    const itemData = {
      itemCode: itemCode,
      name: req.body.name,
      description: req.body.description || '',
      category: mappedCategory,
      unit: req.body.unit || 'pieces',
      // Start with zero so the initial stock transaction (below) sets the real quantity once
      quantity: 0,
      location: req.body.location || '',
      minimumStockLevel: parseInt(req.body.reorderLevel) || 10,
      reorderPoint: parseInt(req.body.reorderLevel) || 20,
      costPrice: req.body.costPrice !== undefined ? parseFloat(req.body.costPrice) : parseFloat(req.body.unitPrice) || 0,
      sellingPrice: req.body.sellingPrice !== undefined ? parseFloat(req.body.sellingPrice) : parseFloat(req.body.unitPrice) || 0,
      expiryDate: req.body.expiryDate || null,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };
    
    // Add medication-specific fields if it's a medication
    if (req.body.itemType === 'medication' || req.body.category === 'medication') {
      itemData.dosage = req.body.dosage || req.body.dosageCustom || '';
      itemData.administrationRoute = req.body.administrationRoute || req.body.adminRouteCustom || '';
      itemData.activeIngredient = req.body.activeIngredient || '';
      itemData.prescriptionRequired = req.body.prescriptionRequired || false;
      itemData.manufacturer = req.body.manufacturer || '';
      itemData.batchNumber = req.body.batchNumber || '';
    }
    
    // Add lab-specific fields if it's a lab item
    if (req.body.itemType === 'lab' || req.body.category === 'laboratory') {
      itemData.storageTemperature = req.body.storageTemperature || '';
      itemData.specimenType = req.body.specimenType || '';
      itemData.testType = req.body.testType || '';
      itemData.processTime = req.body.processTime || '';
    }
    
    // Add supplier information
    if (req.body.supplier) {
      itemData.supplier = req.body.supplier;
    }
    if (req.body.purchaseDate) {
      itemData.purchaseDate = req.body.purchaseDate;
    }
    if (req.body.expiryReminder !== undefined) {
      itemData.expiryReminder = parseInt(req.body.expiryReminder) || 30;
    }
    if (req.body.minOrderQuantity !== undefined) {
      itemData.minOrderQuantity = parseInt(req.body.minOrderQuantity) || 1;
    }
    
    console.log('Final item data:', itemData);
    
    // Create new inventory item
    const newItem = new InventoryItem(itemData);
    
    await newItem.save();
    
    // Create initial stock transaction if quantity > 0
    if (initialQuantity > 0) {
      const transaction = new InventoryTransaction({
        item: newItem._id,
        transactionType: 'purchase',
        quantity: initialQuantity,
        previousQuantity: 0,
        newQuantity: initialQuantity,
        reason: 'Initial stock',
        performedBy: req.user._id
      });
      
      await transaction.save();
      
      // Update item quantity after transaction
      newItem.quantity = initialQuantity;
      await newItem.save();
    }
    
    // If it's a laboratory item, automatically create a corresponding lab service
    if (req.body.itemType === 'lab' || req.body.category === 'laboratory') {
      try {
        const Service = require('../models/Service');
        
        // Check if a service with this name already exists
        const existingService = await Service.findOne({ 
          name: newItem.name,
          category: 'lab'
        });
        
        if (!existingService) {
          const serviceData = {
            name: newItem.name,
            description: newItem.description || `Laboratory test for ${newItem.name}`,
            category: 'lab',
            price: newItem.sellingPrice || newItem.costPrice || 0,
            duration: newItem.processTime || '30 minutes',
            isActive: true,
            inventoryItem: newItem._id,
            createdBy: req.user._id,
            // Lab-specific service fields
            serviceRequirements: newItem.specimenType ? `Specimen type: ${newItem.specimenType}` : '',
            servicePreparation: newItem.storageTemperature ? `Storage: ${newItem.storageTemperature}` : '',
            serviceTestType: newItem.testType || '',
            serviceStorageTemperature: newItem.storageTemperature || '',
            serviceSpecimenType: newItem.specimenType || ''
          };
          
          const newService = new Service(serviceData);
          await newService.save();
          
          console.log(`✅ Created corresponding lab service: ${newService.name}`);
        } else {
          console.log(`ℹ️ Lab service already exists for: ${newItem.name}`);
        }
      } catch (serviceError) {
        console.error('Error creating lab service:', serviceError);
        // Don't fail the inventory creation if service creation fails
      }
    }
    
    // If it's an imaging item, automatically create a corresponding imaging service
    if (req.body.itemType === 'imaging' || mappedCategory === 'imaging') {
      try {
        const Service = require('../models/Service');
        
        // Determine imaging service category from original category or item name
        const imagingCategories = ['imaging', 'ultrasound', 'xray', 'x-ray', 'ct', 'mri', 'mammography'];
        let serviceCategory = 'imaging';
        const originalCategory = (req.body.category || '').toLowerCase();
        if (imagingCategories.includes(originalCategory)) {
          serviceCategory = originalCategory === 'x-ray' ? 'xray' : originalCategory;
        } else if (newItem.name.toLowerCase().includes('ultrasound')) {
          serviceCategory = 'ultrasound';
        } else if (newItem.name.toLowerCase().includes('x-ray') || newItem.name.toLowerCase().includes('xray')) {
          serviceCategory = 'xray';
        } else if (newItem.name.toLowerCase().includes('ct')) {
          serviceCategory = 'ct';
        } else if (newItem.name.toLowerCase().includes('mri')) {
          serviceCategory = 'mri';
        }
        
        // Check if a service with this name already exists
        const existingService = await Service.findOne({ 
          name: newItem.name,
          category: { $in: imagingCategories }
        });
        
        if (!existingService) {
          const serviceData = {
            name: newItem.name,
            description: newItem.description || `Imaging service for ${newItem.name}`,
            category: serviceCategory,
            price: newItem.sellingPrice || newItem.costPrice || 0,
            unit: 'service',
            isActive: true,
            linkedInventoryItems: [newItem._id],
            createdBy: req.user._id
          };
          
          const newService = new Service(serviceData);
          await newService.save();
          
          console.log(`✅ Created corresponding imaging service: ${newService.name} (category: ${serviceCategory})`);
        } else {
          console.log(`ℹ️ Imaging service already exists for: ${newItem.name}`);
          // Link existing service to inventory item if not already linked
          if (!existingService.linkedInventoryItems || !existingService.linkedInventoryItems.includes(newItem._id)) {
            existingService.linkedInventoryItems = existingService.linkedInventoryItems || [];
            existingService.linkedInventoryItems.push(newItem._id);
            await existingService.save();
            console.log(`✅ Linked existing imaging service to inventory item`);
          }
        }
      } catch (serviceError) {
        console.error('Error creating imaging service:', serviceError);
        // Don't fail the inventory creation if service creation fails
      }
    }
    
    // Return the created item with virtuals
    const item = await InventoryItem.findById(newItem._id)
      .populate('updatedBy', 'firstName lastName');
    
    const itemObj = item.toObject({ virtuals: true });
    itemObj.isLowStock = item.isLowStock;
    itemObj.needsReorder = item.needsReorder;
    
    res.status(201).json(itemObj);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update an inventory item
router.put('/:id', [auth,
  // checkRole(['admin']), // Temporarily disabled for testing
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').isIn(['medication', 'supplies', 'equipment', 'laboratory', 'imaging', 'office', 'service', 'other', 'chemistry', 'hematology', 'parasitology', 'mycology', 'immunology', 'urinalysis', 'endocrinology', 'cardiology', 'tumor-markers']).withMessage('Invalid category'),
  body('unit').notEmpty().withMessage('Unit is required'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    // Store old quantity for potential stock transaction recording
    const oldQuantity = item.quantity;
    
    // Map category: lab subcategories (parasitology, chemistry, etc.) must be stored as 'laboratory'
    // so lab pricing and billing always find the item by category.
    const labSubcategories = ['chemistry', 'hematology', 'parasitology', 'mycology', 'immunology', 'urinalysis', 'endocrinology', 'cardiology', 'tumor-markers'];
    let categoryToSave = req.body.category;
    if (labSubcategories.includes((req.body.category || '').toLowerCase())) {
      categoryToSave = 'laboratory';
    }
    
    // Update item properties
    if (req.body.name) item.name = req.body.name;
    if (req.body.description) item.description = req.body.description;
    if (categoryToSave) item.category = categoryToSave;
    if (req.body.unit) item.unit = req.body.unit;
    if (req.body.quantity !== undefined) item.quantity = req.body.quantity; // Allow quantity updates in edit mode
    if (req.body.minimumStockLevel) item.minimumStockLevel = req.body.minimumStockLevel;
    if (req.body.reorderPoint) item.reorderPoint = req.body.reorderPoint;
    if (req.body.costPrice) item.costPrice = req.body.costPrice;
    if (req.body.sellingPrice) item.sellingPrice = req.body.sellingPrice;
    if (req.body.location) item.location = req.body.location;
    
    // Add medication-specific fields if provided
    if (req.body.dosage !== undefined) item.dosage = req.body.dosage;
    if (req.body.administrationRoute !== undefined) item.administrationRoute = req.body.administrationRoute;
    if (req.body.activeIngredient !== undefined) item.activeIngredient = req.body.activeIngredient;
    if (req.body.prescriptionRequired !== undefined) item.prescriptionRequired = req.body.prescriptionRequired;
    if (req.body.manufacturer !== undefined) item.manufacturer = req.body.manufacturer;
    if (req.body.batchNumber !== undefined) item.batchNumber = req.body.batchNumber;
    
    // Add lab-specific fields if provided
    if (req.body.storageTemperature !== undefined) item.storageTemperature = req.body.storageTemperature;
    if (req.body.specimenType !== undefined) item.specimenType = req.body.specimenType;
    if (req.body.testType !== undefined) item.testType = req.body.testType;
    if (req.body.processTime !== undefined) item.processTime = req.body.processTime;
    
    // Add general fields
    if (req.body.supplier !== undefined) item.supplier = req.body.supplier;
    if (req.body.purchaseDate !== undefined) item.purchaseDate = req.body.purchaseDate;
    if (req.body.expiryReminder !== undefined) item.expiryReminder = parseInt(req.body.expiryReminder) || 30;
    if (req.body.minOrderQuantity !== undefined) item.minOrderQuantity = parseInt(req.body.minOrderQuantity) || 1;
    if (req.body.notes !== undefined) item.notes = req.body.notes;
    
    item.expiryDate = req.body.expiryDate;
    item.isActive = req.body.isActive !== undefined ? req.body.isActive : item.isActive;
    item.updatedBy = req.user.id;
    
    await item.save();
    
    // Return the updated item with virtuals
    const updatedItem = await InventoryItem.findById(req.params.id)
      .populate('updatedBy', 'firstName lastName');
    
    const itemObj = updatedItem.toObject({ virtuals: true });
    itemObj.isLowStock = updatedItem.isLowStock;
    itemObj.needsReorder = updatedItem.needsReorder;
    
    res.json(itemObj);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inventory stock
router.post('/:id/stock', [auth,
  checkRole(['admin']),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('type').isIn(['add', 'remove', 'set']).withMessage('Invalid stock update type'),
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    const { quantity, type, reason, reference } = req.body;
    const previousQuantity = item.quantity;
    
    try {
      // Update stock using the model method
      await item.updateStock(quantity, type, req.user._id);
      
      // Create transaction record
      const transaction = new InventoryTransaction({
        item: item._id,
        transactionType: type === 'add' ? 'purchase' : type === 'remove' ? 'medical-use' : 'adjustment',
        quantity,
        previousQuantity,
        newQuantity: item.quantity,
        reason,
        documentReference: reference,
        performedBy: req.user._id
      });
      
      await transaction.save();
      
      // Return the updated item with virtuals
      const updatedItem = await InventoryItem.findById(req.params.id)
        .populate('updatedBy', 'firstName lastName');
      
      const itemObj = updatedItem.toObject({ virtuals: true });
      itemObj.isLowStock = updatedItem.isLowStock;
      itemObj.needsReorder = updatedItem.needsReorder;
      
      res.json(itemObj);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } catch (error) {
    console.error('Error updating inventory stock:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get stock transaction history for an item
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Find the inventory item first
    const item = await InventoryItem.findById(req.params.id).select('transactions transactions.performedBy'); // Select only transactions field

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    let transactions = item.transactions;

    // Apply date filters if provided (filtering the embedded array)
    if (startDate) {
      transactions = transactions.filter(t => t.createdAt >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      transactions = transactions.filter(t => t.createdAt <= end);
    }

    // Sort transactions (descending by date)
    transactions.sort((a, b) => b.createdAt - a.createdAt);

    // Populate performedBy manually if needed (Mongoose doesn't populate embedded arrays automatically like this)
    // This is a simplified example; a more robust population might be needed depending on requirements.
    // For now, let's return IDs.
    // const populatedTransactions = await Promise.all(transactions.map(async (t) => {
    //   const user = await User.findById(t.performedBy).select('firstName lastName');
    //   return { ...t.toObject(), performedBy: user }; // Combine transaction data with populated user
    // }));

    res.json(transactions); 
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate inventory reports
router.get('/reports/low-stock', [auth, checkRole(['admin'])], async (req, res) => {
  try {
    // Find all items where quantity is less than or equal to minimumStockLevel
    const items = await InventoryItem.find({
      $expr: { $lte: ['$quantity', '$minimumStockLevel'] }
    }).populate('updatedBy', 'firstName lastName');
    
    // Add virtual properties
    const formattedItems = items.map(item => {
      const itemObj = item.toObject({ virtuals: true });
      itemObj.isLowStock = item.isLowStock;
      itemObj.needsReorder = item.needsReorder;
      return itemObj;
    });
    
    res.json({
      count: formattedItems.length,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error generating low stock report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete an inventory item by ID
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete an inventory item by name
router.delete('/delete-by-name', [auth, checkRole(['admin'])], async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    
    console.log(`🗑️ Attempting to delete inventory item: ${name}`);
    
    // Find and delete the item by name
    const item = await InventoryItem.findOneAndDelete({ 
      name: { $regex: new RegExp(name, 'i') },
      category: 'laboratory' // Only delete from laboratory category
    });
    
    if (!item) {
      return res.status(404).json({ 
        message: `Inventory item "${name}" not found in laboratory category` 
      });
    }
    
    console.log(`✅ Successfully deleted inventory item: ${item.name} (ID: ${item._id})`);
    
    res.json({ 
      success: true,
      message: `"${item.name}" deleted successfully from inventory`,
      deletedItem: {
        id: item._id,
        name: item.name,
        category: item.category
      }
    });
  } catch (error) {
    console.error('Error deleting inventory item by name:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// --- Cross-module inventory integration endpoints ---

// 1. GET /stock-value: Returns total inventory value
router.get('/stock-value', auth, async (req, res) => {
  try {
    const items = await InventoryItem.find();
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
    res.json({ totalValue });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating stock value', error: error.message });
  }
});

// 2. POST /dispense: Dispense items, update inventory, and log for billing
router.post('/dispense', auth, [
          checkRole(['admin', 'nurse']),
    body('items').isArray({ min: 1 }).withMessage('Items array cannot be empty.'),
    body('items.*.itemId').isMongoId().withMessage('Invalid Item ID format for one or more items.'),
    body('items.*.quantity').isInt({ gt: 0 }).withMessage('Quantity must be a positive integer for each item.'),
    body('patientId').isMongoId().withMessage('Valid Patient ID is required.'),
    body('reference').optional().isString().withMessage('Reference must be a string if provided.'),
    body('notes').optional().isString().withMessage('Notes must be a string if provided.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { items, patientId, reference, notes } = req.body;
    const userId = req.user.id;

    try {
        const result = await inventoryService.consumeInventory(
            items, 
            'pharmacy_dispense',
            reference, 
            userId, 
            patientId,
            notes
        );

        res.status(200).json({
            message: 'Items dispensed successfully and charges logged for billing.',
            updatedItems: result.updatedItems,
            createdCharges: result.createdCharges
        });

    } catch (error) {
        console.error('Error dispensing items:', error);
        if (error.message.includes('does not have a valid selling price') || error.message.includes('Not enough') || error.message.includes('not found')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error during dispensing.', error: error.message });
    }
});

// 3. POST /check-availability: Check if items are in stock
router.post('/check-availability', auth, async (req, res) => {
  // Expects: { items: [{ itemId, quantity }] }
  try {
    const { items } = req.body;
    // Use inventoryService.checkInventoryAvailability
    // TODO: Implement actual check
    res.status(501).json({ message: 'Not implemented: Check availability' });
  } catch (error) {
    res.status(500).json({ message: 'Error checking availability', error: error.message });
  }
});

// 4. POST /usage: Record supply usage, update inventory
router.post('/usage', auth, async (req, res) => {
  // Expects: { items: [{ itemId, quantity }], department, reference }
  try {
    const { items, department, reference } = req.body;
    // Use inventoryService.consumeInventory
    // TODO: Implement actual usage logic
    res.status(501).json({ message: 'Not implemented: Usage recording' });
  } catch (error) {
    res.status(500).json({ message: 'Error recording usage', error: error.message });
  }
});

// 5. GET /reports/summary: Inventory analytics for admin dashboard
router.get('/reports/summary', auth, async (req, res) => {
  try {
    const items = await InventoryItem.find();
    const lowStockCount = items.filter(item => item.quantity <= item.minimumStockLevel).length;
    const reorderCount = items.filter(item => item.quantity <= item.reorderPoint).length;
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
    res.json({ lowStockCount, reorderCount, totalValue });
  } catch (error) {
    res.status(500).json({ message: 'Error generating summary report', error: error.message });
  }
});

// Note: Dispense route is already defined above with proper validation and billing integration

// Check prescriptions in inventory for billing (PUBLIC - no auth required)
router.get('/check-prescriptions', async (req, res) => {
  try {
    console.log('🔍 Checking prescriptions linked to inventory items...');
    
    const Prescription = require('../models/Prescription');
    
    // Find prescriptions that are linked to inventory items and need payment
    const inventoryPrescriptions = await Prescription.find({
      $and: [
        // Must have inventory item (clinic has this medication in stock)
        { medicationItem: { $exists: true, $ne: null } },
        // Must be pending payment or active
        {
          $or: [
            { paymentStatus: { $in: ['pending', 'unpaid'] } },
            { paymentStatus: { $exists: false } },
            { 
              $and: [
                { status: { $in: ['PENDING', 'Pending', 'Active'] } },
                { paymentStatus: { $ne: 'paid' } }
              ]
            }
          ]
        }
      ]
    })
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'firstName lastName')
    .populate('medicationItem', 'name sellingPrice quantity')
    .sort({ createdAt: -1 })
    .lean();
    
    console.log(`Found ${inventoryPrescriptions.length} prescriptions linked to inventory items`);
    
    // Format the response for easier frontend consumption
    const formattedPrescriptions = inventoryPrescriptions.map(prescription => ({
      id: prescription._id,
      patientName: `${prescription.patient?.firstName || ''} ${prescription.patient?.lastName || ''}`.trim(),
      patientId: prescription.patient?.patientId || prescription.patient?._id,
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      route: prescription.route,
      status: prescription.status,
      paymentStatus: prescription.paymentStatus,
      totalCost: prescription.totalCost || 0,
      inventoryItem: {
        id: prescription.medicationItem?._id,
        name: prescription.medicationItem?.name,
        price: prescription.medicationItem?.sellingPrice || 0,
        availableQuantity: prescription.medicationItem?.quantity || 0
      },
      createdAt: prescription.createdAt,
      notes: prescription.instructions || prescription.notes || ''
    }));
    
    res.json({
      success: true,
      count: formattedPrescriptions.length,
      prescriptions: formattedPrescriptions,
      message: `Found ${formattedPrescriptions.length} prescriptions linked to inventory items`
    });
    
  } catch (error) {
    console.error('Error checking inventory prescriptions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking inventory prescriptions', 
      error: error.message 
    });
  }
});

// Comprehensive inventory check with prescriptions (PUBLIC - no auth required)
router.get('/inventory-check', async (req, res) => {
  try {
    console.log('🔍 Running comprehensive inventory check...');
    
    const Prescription = require('../models/Prescription');
    
    // Get all inventory items
    const inventoryItems = await InventoryItem.find({ isActive: { $ne: false } })
      .sort({ category: 1, name: 1 })
      .lean();
    
    // Get prescriptions linked to inventory items
    const inventoryPrescriptions = await Prescription.find({
      medicationItem: { $exists: true, $ne: null }
    })
    .populate('patient', 'firstName lastName patientId')
    .populate('medicationItem', 'name sellingPrice quantity category')
    .sort({ createdAt: -1 })
    .lean();
    
    // Group prescriptions by inventory item
    const prescriptionsByItem = {};
    inventoryPrescriptions.forEach(prescription => {
      const itemId = prescription.medicationItem?._id?.toString();
      if (itemId) {
        if (!prescriptionsByItem[itemId]) {
          prescriptionsByItem[itemId] = [];
        }
        prescriptionsByItem[itemId].push(prescription);
      }
    });
    
    // Create comprehensive inventory report
    const inventoryReport = inventoryItems.map(item => {
      const itemPrescriptions = prescriptionsByItem[item._id.toString()] || [];
      const pendingPrescriptions = itemPrescriptions.filter(p => 
        p.paymentStatus === 'pending' || p.paymentStatus === 'unpaid' || !p.paymentStatus
      );
      const activePrescriptions = itemPrescriptions.filter(p => 
        p.status === 'Active' || p.status === 'Pending'
      );
      
      return {
        item: {
          id: item._id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          sellingPrice: item.sellingPrice || 0,
          reorderLevel: item.reorderLevel || 0,
          status: item.quantity <= 0 ? 'out-of-stock' : 
                  item.quantity <= (item.reorderLevel || 0) ? 'low-stock' : 'in-stock'
        },
        prescriptions: {
          total: itemPrescriptions.length,
          pending: pendingPrescriptions.length,
          active: activePrescriptions.length,
          totalValue: pendingPrescriptions.reduce((sum, p) => sum + (p.totalCost || 0), 0)
        },
        linkedPrescriptions: itemPrescriptions.slice(0, 5).map(p => ({
          id: p._id,
          patientName: `${p.patient?.firstName || ''} ${p.patient?.lastName || ''}`.trim(),
          patientId: p.patient?.patientId || p.patient?._id,
          status: p.status,
          paymentStatus: p.paymentStatus,
          totalCost: p.totalCost || 0,
          createdAt: p.createdAt
        }))
      };
    });
    
    // Summary statistics
    const summary = {
      totalItems: inventoryItems.length,
      totalPrescriptions: inventoryPrescriptions.length,
      pendingPrescriptions: inventoryPrescriptions.filter(p => 
        p.paymentStatus === 'pending' || p.paymentStatus === 'unpaid' || !p.paymentStatus
      ).length,
      totalPendingValue: inventoryPrescriptions
        .filter(p => p.paymentStatus === 'pending' || p.paymentStatus === 'unpaid' || !p.paymentStatus)
        .reduce((sum, p) => sum + (p.totalCost || 0), 0),
      categories: [...new Set(inventoryItems.map(item => item.category))]
    };
    
    res.json({
      success: true,
      summary,
      inventory: inventoryReport,
      message: `Inventory check completed. Found ${inventoryItems.length} items and ${inventoryPrescriptions.length} linked prescriptions.`
    });
    
  } catch (error) {
    console.error('Error running inventory check:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error running inventory check', 
      error: error.message 
    });
  }
});

module.exports = router; 
