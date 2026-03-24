const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { body, param, validationResult } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const InventoryItem = require('../models/InventoryItem');

const LAB_SERVICE_CATEGORIES = [
  'lab',
  'chemistry',
  'hematology',
  'lab',
  'immunology',
  'urinalysis',
  'endocrinology',
  'cardiology',
  'tumor-markers'
];

const IMAGING_SERVICE_CATEGORIES = ['imaging', 'ultrasound', 'xray'];

// GET /api/services - List all services (with optional filters)
router.get('/', auth, async (req, res) => {
  try {
    const { active, category, search, withInventory } = req.query;
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
    
    let services = await Service.find(filter).sort({ name: 1 }).limit(limit).lean();
    
    if (withInventory === 'true') {
      const linkedItemIds = services
        .filter(s => s.linkedInventoryItems?.length > 0)
        .map(s => s.linkedInventoryItems[0]);
      
      const linkedItems = linkedItemIds.length > 0
        ? await InventoryItem.find({ _id: { $in: linkedItemIds } }).lean()
        : [];
      const linkedItemMap = new Map(linkedItems.map(item => [item._id.toString(), item]));

      services = services.map(service => {
        const serviceObj = { ...service };
        
        if (service.linkedInventoryItems?.length > 0) {
          const inventoryItem = linkedItemMap.get(service.linkedInventoryItems[0].toString());
          if (inventoryItem) {
            serviceObj.inventoryStatus = {
              linked: true,
              inventoryItemId: inventoryItem._id,
              inventoryItemName: inventoryItem.name,
              quantity: inventoryItem.quantity,
              category: inventoryItem.category,
              isActive: inventoryItem.isActive
            };
          } else {
            serviceObj.inventoryStatus = { linked: false, reason: 'Linked inventory item not found' };
          }
        } else {
          serviceObj.inventoryStatus = { linked: false, suggestion: { available: false } };
        }
        
        return serviceObj;
      });
    }
    
    res.json(services);
  } catch (err) {
    console.error('🔍 [DEBUG] Services API - Error:', err);
    res.status(500).json({ message: 'Failed to fetch services', error: err.message });
  }
});

// GET /api/services/:id - Get single service
router.get('/:id', auth, param('id').isMongoId(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch service', error: err.message });
  }
});

// POST /api/services - Create service
router.post('/', auth, // Allow all authenticated users to create services
  body('name').notEmpty(),
  body('category').notEmpty(),
  body('price').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const service = new Service(req.body);
      await service.save();

      // ✅ FIX: Always check for existing specialized inventory items first
      if (LAB_SERVICE_CATEGORIES.includes(service.category)) {
        const existingLabItem = await InventoryItem.findOne({
          name: { $regex: new RegExp(service.name, 'i') },
          category: 'laboratory',
          isActive: true
        });

        if (existingLabItem) {
          console.log(`✅ Found existing laboratory inventory item for ${service.category} service: ${service.name}`);
          // Link to existing laboratory item instead of creating new service item
          service.linkedInventoryItems = [existingLabItem._id];
          await service.save();
          console.log(`✅ Service linked to existing lab inventory item. Stock will deduct from lab inventory.`);
          return res.status(201).json(service); // Exit early since we found and linked the existing item
        } else {
          console.log(`ℹ️ No existing laboratory inventory item found for ${service.name}. Will create new inventory item if needed.`);
        }
      }

      if (IMAGING_SERVICE_CATEGORIES.includes(service.category)) {
        const existingImagingItem = await InventoryItem.findOne({
          name: { $regex: new RegExp(service.name, 'i') },
          category: 'imaging',
          isActive: true
        });

        if (existingImagingItem) {
          console.log(`✅ Found existing imaging inventory item for ${service.category} service: ${service.name}`);
          service.linkedInventoryItems = [existingImagingItem._id];
          await service.save();
          console.log(`✅ Service linked to existing imaging inventory item. Stock will deduct from imaging inventory.`);
          return res.status(201).json(service);
        } else {
          console.log(`ℹ️ No existing imaging inventory item found for ${service.name}. Will create new inventory item if needed.`);
        }
      }

      // Create inventory item if inventory settings are provided
      if (req.body.initialQuantity !== undefined || req.body.costPrice !== undefined || req.body.sellingPrice !== undefined) {
        try {
          // Determine the appropriate category for the inventory item
          let inventoryCategory = 'service'; // Default category

          if (LAB_SERVICE_CATEGORIES.includes(service.category)) {
            inventoryCategory = 'laboratory';
          } else if (IMAGING_SERVICE_CATEGORIES.includes(service.category)) {
            inventoryCategory = 'imaging';
          }

          // Check if inventory item already exists
          let existingInv = null;
          if (LAB_SERVICE_CATEGORIES.includes(service.category)) {
            existingInv = await InventoryItem.findOne({ 
              name: service.name,
              category: 'laboratory',
              isActive: true
            });
          } else if (IMAGING_SERVICE_CATEGORIES.includes(service.category)) {
            existingInv = await InventoryItem.findOne({
              name: service.name,
              category: 'imaging',
              isActive: true
            });
          }
          // Fallback to any category if not found
          if (!existingInv) {
            existingInv = await InventoryItem.findOne({ name: service.name });
          }
          
          if (!existingInv) {
            const newInv = new InventoryItem({
              itemCode: service.code || `SVC-${Date.now()}`,
              name: service.name,
              description: service.description || `${service.category} service`,
              category: inventoryCategory,
              unit: service.unit || 'service',
              quantity: req.body.initialQuantity || 0,
              costPrice: req.body.costPrice || 0,
              sellingPrice: req.body.sellingPrice || service.price,
              minimumStockLevel: 0, // Services don't typically need reorder levels
              reorderPoint: 0,
              isActive: service.isActive,
              createdBy: req.user?._id,
              updatedBy: req.user?._id,
            });
            await newInv.save();
            console.log(`✅ Created ${inventoryCategory} inventory item for service: ${service.name}`);

            // Link the inventory item to the service
            service.linkedInventoryItems = [newInv._id];
            await service.save();
          } else {
            console.log(`⚠️ Inventory item already exists for service: ${service.name}`);
            // Link to existing item if not already linked
            if (!service.linkedInventoryItems || service.linkedInventoryItems.length === 0) {
              service.linkedInventoryItems = [existingInv._id];
              await service.save();
            }
          }
        } catch(errInv) {
          console.error('❌ Failed to create inventory item for service:', errInv.message);
          // Don't fail the service creation if inventory creation fails
        }
      }
      
      console.log(`✅ Created service: ${service.name} in Service collection`);
      res.status(201).json(service);
    } catch (err) {
      res.status(500).json({ message: 'Failed to create service', error: err.message });
    }
  }
);

// POST /api/services/:id/link-inventory/:inventoryId - Link service to inventory item
router.post('/:id/link-inventory/:inventoryId', auth, checkRole('admin'),
  param('id').isMongoId(),
  param('inventoryId').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const service = await Service.findById(req.params.id);
      if (!service) return res.status(404).json({ message: 'Service not found' });

      const inventoryItem = await InventoryItem.findById(req.params.inventoryId);
      if (!inventoryItem) return res.status(404).json({ message: 'Inventory item not found' });

      // Link service to inventory item
      service.linkedInventoryItems = [inventoryItem._id];
      await service.save();

      console.log(`✅ Linked service ${service.name} to inventory item ${inventoryItem.name}`);
      res.json({ 
        success: true, 
        message: 'Service linked to inventory item successfully',
        service: service,
        inventoryItem: {
          id: inventoryItem._id,
          name: inventoryItem.name,
          quantity: inventoryItem.quantity
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to link service to inventory', error: err.message });
    }
  }
);

// PUT /api/services/:id - Update service
router.put('/:id', auth, checkRole('admin'),
  param('id').isMongoId(),
  body('name').optional().notEmpty(),
  body('category').optional().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!service) return res.status(404).json({ message: 'Service not found' });

      // ✅ FIX: Always check for existing specialized inventory items first
      const needsLink = !service.linkedInventoryItems || service.linkedInventoryItems.length === 0;

      if (LAB_SERVICE_CATEGORIES.includes(service.category) && needsLink) {
        try {
          const existingLabItem = await InventoryItem.findOne({
            name: { $regex: new RegExp(service.name, 'i') },
            category: 'laboratory',
            isActive: true
          });

          if (existingLabItem) {
            console.log(`✅ Found existing laboratory inventory item for ${service.category} service: ${service.name}`);
            service.linkedInventoryItems = [existingLabItem._id];
            await service.save();
            console.log(`✅ Service linked to existing lab inventory item. Stock will deduct from lab inventory.`);
            return res.json(service); // Exit early since we found and linked the existing item
          } else {
            console.log(`ℹ️ No existing laboratory inventory item found for ${service.name}.`);
          }
        } catch(errInv) {
          console.error('❌ Failed to find laboratory inventory item for service:', errInv.message);
        }
      }

      if (IMAGING_SERVICE_CATEGORIES.includes(service.category) && needsLink) {
        try {
          const existingImagingItem = await InventoryItem.findOne({
            name: { $regex: new RegExp(service.name, 'i') },
            category: 'imaging',
            isActive: true
          });

          if (existingImagingItem) {
            console.log(`✅ Found existing imaging inventory item for ${service.category} service: ${service.name}`);
            service.linkedInventoryItems = [existingImagingItem._id];
            await service.save();
            console.log(`✅ Service linked to existing imaging inventory item. Stock will deduct from imaging inventory.`);
            return res.json(service);
          } else {
            console.log(`ℹ️ No existing imaging inventory item found for ${service.name}.`);
          }
        } catch(errInv) {
          console.error('❌ Failed to find imaging inventory item for service:', errInv.message);
        }
      }

      // Handle inventory updates
      if (req.body.initialQuantity !== undefined || req.body.costPrice !== undefined || req.body.sellingPrice !== undefined) {
        // Create inventory item if it doesn't exist and isn't a lab service with existing lab item
        if (!service.linkedInventoryItems || service.linkedInventoryItems.length === 0) {
          try {
            // Determine the appropriate category for the inventory item
            let inventoryCategory = 'service'; // Default category

            if (LAB_SERVICE_CATEGORIES.includes(service.category)) {
              inventoryCategory = 'laboratory';
            } else if (IMAGING_SERVICE_CATEGORIES.includes(service.category)) {
              inventoryCategory = 'imaging';
            }

            const newInv = new InventoryItem({
              itemCode: service.code || `SVC-${Date.now()}`,
              name: service.name,
              description: service.description || `${service.category} service`,
              category: inventoryCategory,
              unit: service.unit || 'service',
              quantity: req.body.initialQuantity || 0,
              costPrice: req.body.costPrice || 0,
              sellingPrice: req.body.sellingPrice || service.price,
              minimumStockLevel: 0,
              reorderPoint: 0,
              isActive: service.isActive,
              createdBy: req.user?._id,
              updatedBy: req.user?._id,
            });
            await newInv.save();
            console.log(`✅ Created ${inventoryCategory} inventory item for service: ${service.name}`);

            // Link the inventory item to the service
            service.linkedInventoryItems = [newInv._id];
            await service.save();
          } catch(errInv) {
            console.error('❌ Failed to create inventory item for service:', errInv.message);
          }
        }
      }

      // Update linked inventory items if inventory settings changed
      if (service.linkedInventoryItems && service.linkedInventoryItems.length > 0) {
        try {
          const inventoryItem = await InventoryItem.findById(service.linkedInventoryItems[0]);
          if (inventoryItem) {
            // Update inventory item with new service data
            const updates = {};
            if (req.body.name && inventoryItem.name !== req.body.name) {
              updates.name = req.body.name;
            }
            if (req.body.description && inventoryItem.description !== req.body.description) {
              updates.description = req.body.description;
            }
            if (req.body.unit && inventoryItem.unit !== req.body.unit) {
              updates.unit = req.body.unit;
            }
            if (req.body.price && inventoryItem.sellingPrice !== req.body.price) {
              updates.sellingPrice = req.body.price;
            }
            if (req.body.costPrice !== undefined && inventoryItem.costPrice !== req.body.costPrice) {
              updates.costPrice = req.body.costPrice;
            }
            if (req.body.sellingPrice !== undefined && inventoryItem.sellingPrice !== req.body.sellingPrice) {
              updates.sellingPrice = req.body.sellingPrice;
            }
            if (req.body.quantity !== undefined && inventoryItem.quantity !== req.body.quantity) {
              updates.quantity = req.body.quantity;
            }
            if (req.body.isActive !== undefined && inventoryItem.isActive !== req.body.isActive) {
              updates.isActive = req.body.isActive;
            }
            
            if (Object.keys(updates).length > 0) {
              updates.updatedBy = req.user?._id;
              await InventoryItem.findByIdAndUpdate(inventoryItem._id, updates);
              console.log(`✅ Updated inventory item for service: ${service.name}`, updates);
            }
          }
        } catch (errInv) {
          console.error('❌ Failed to update inventory item for service:', errInv.message);
        }
      }

      res.json(service);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update service', error: err.message });
    }
  }
);

// PATCH /api/services/:id/activate - Activate service
router.patch('/:id/activate', auth, checkRole('admin'), param('id').isMongoId(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Failed to activate service', error: err.message });
  }
});

// PATCH /api/services/:id/deactivate - Deactivate service
router.patch('/:id/deactivate', auth, checkRole('admin'), param('id').isMongoId(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Failed to deactivate service', error: err.message });
  }
});

module.exports = router; 
