const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Building = require('../models/Building');
const Room = require('../models/Room');
const Department = require('../models/Department');
const Equipment = require('../models/Equipment');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { auth, checkRole } = require('../middleware/auth');
const { cacheMiddleware, clearCache } = require('../middleware/cacheMiddleware');
const { corsMiddleware } = require('../middleware/corsMiddleware');

// Apply CORS middleware to all routes
router.use(corsMiddleware);

// Cache durations
const STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for dashboard stats
const GENERAL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for general data

// @route   GET /api/facility
// @desc    Get basic facility information
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔧 Basic facility route hit');
    
    // Return basic facility information
    const facilityInfo = {
      name: 'Clinic New Life',
      status: 'operational',
      version: '1.0.0',
      endpoints: [
        '/stats',
        '/buildings',
        '/rooms',
        '/departments',
        '/equipment',
        '/maintenance-requests'
      ]
    };

    res.json({
      success: true,
      message: 'Facility API is operational',
      data: facilityInfo
    });
  } catch (error) {
    console.error('Error fetching basic facility info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility information',
      error: error.message
    });
  }
});

// @route   GET /api/facility/stats
// @desc    Get facility statistics for dashboard
// @access  Private
router.get('/stats', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    console.log('🔧 Facility stats route hit');
    
    // Get counts of various items
    const [
      buildingsCount,
      roomsCount,
      departmentsCount,
      equipmentCount,
      pendingRequestsCount
    ] = await Promise.all([
      Building.countDocuments(),
      Room.countDocuments(),
      Department.countDocuments(),
      Equipment.countDocuments(),
      MaintenanceRequest.countDocuments({ status: 'pending' })
    ]);

    // Get room status counts
    const [
      availableRooms,
      occupiedRooms,
      maintenanceRooms
    ] = await Promise.all([
      Room.countDocuments({ status: 'available' }),
      Room.countDocuments({ status: 'occupied' }),
      Room.countDocuments({ status: { $in: ['maintenance', 'cleaning'] } })
    ]);

    // Get equipment status counts
    const [
      activeEquipment,
      maintenanceEquipment
    ] = await Promise.all([
      Equipment.countDocuments({ status: 'operational' }),
      Equipment.countDocuments({ status: { $in: ['maintenance', 'faulty', 'calibration'] } })
    ]);

    const stats = {
      totalBuildings: buildingsCount,
      totalRooms: roomsCount,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      activeEquipment,
      maintenanceEquipment,
      pendingRequests: pendingRequestsCount,
      departments: departmentsCount
    };

    console.log('🔧 Facility stats:', stats);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching facility stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/buildings
// @desc    Get all buildings
// @access  Private
router.get('/buildings', auth, cacheMiddleware(GENERAL_CACHE_DURATION), async (req, res) => {
  try {
    const buildings = await Building.find().sort({ name: 1 });
    
    return res.json({
      success: true,
      data: buildings
    });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/buildings
// @desc    Create a new building
// @access  Private
router.post('/buildings', [auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty(),
    check('floors', 'Floors must be a number greater than 0').isInt({ min: 1 }),
    check('contactPerson', 'Contact person is required').not().isEmpty(),
    check('contactNumber', 'Contact number is required').not().isEmpty(),
    check('status', 'Status is required').isIn(['active', 'maintenance', 'construction'])
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      name,
      address,
      floors,
      status,
      contactPerson,
      contactNumber,
      description,
      dateBuilt,
      lastRenovation
    } = req.body;

    const newBuilding = new Building({
      name,
      address,
      floors,
      status,
      contactPerson,
      contactNumber,
      description,
      dateBuilt,
      lastRenovation
    });

    const building = await newBuilding.save();
    
    // Clear buildings cache when a new building is added
    clearCache('/api/facility/buildings');
    clearCache('/api/facility/stats');

    return res.status(201).json({
      success: true,
      data: building
    });
  } catch (error) {
    console.error('Error creating building:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/buildings/:id
// @desc    Get building by ID
// @access  Private
router.get('/buildings/:id', auth, cacheMiddleware(GENERAL_CACHE_DURATION), async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    return res.json({
      success: true,
      data: building
    });
  } catch (error) {
    console.error('Error fetching building:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/facility/buildings/:id
// @desc    Update a building
// @access  Private
router.put('/buildings/:id', auth, async (req, res) => {
  try {
    const {
      name,
      address,
      floors,
      status,
      contactPerson,
      contactNumber,
      description,
      dateBuilt,
      lastRenovation
    } = req.body;

    // Build update object
    const buildingFields = {};
    if (name) buildingFields.name = name;
    if (address) buildingFields.address = address;
    if (floors) buildingFields.floors = floors;
    if (status) buildingFields.status = status;
    if (contactPerson) buildingFields.contactPerson = contactPerson;
    if (contactNumber) buildingFields.contactNumber = contactNumber;
    if (description) buildingFields.description = description;
    if (dateBuilt) buildingFields.dateBuilt = dateBuilt;
    if (lastRenovation) buildingFields.lastRenovation = lastRenovation;

    let building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    building = await Building.findByIdAndUpdate(
      req.params.id,
      { $set: buildingFields },
      { new: true }
    );

    // Clear related caches
    clearCache(`/api/facility/buildings/${req.params.id}`);
    clearCache('/api/facility/buildings');
    clearCache('/api/facility/stats');

    return res.json({
      success: true,
      data: building
    });
  } catch (error) {
    console.error('Error updating building:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/facility/buildings/:id
// @desc    Delete a building
// @access  Private
router.delete('/buildings/:id', auth, async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    await Building.findByIdAndRemove(req.params.id);

    // Clear related caches
    clearCache(`/api/facility/buildings/${req.params.id}`);
    clearCache('/api/facility/buildings');
    clearCache('/api/facility/stats');

    return res.json({
      success: true,
      message: 'Building deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting building:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/rooms
// @desc    Get all rooms
// @access  Private
router.get('/rooms', auth, cacheMiddleware(GENERAL_CACHE_DURATION), async (req, res) => {
  try {
    console.log('🔧 Facility rooms route hit');
    const rooms = await Room.find().sort({ name: 1 });
    
    return res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/rooms
// @desc    Create a new room
// @access  Private
router.post('/rooms', [auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('type', 'Type is required').not().isEmpty(),
    check('floor', 'Floor is required').not().isEmpty(),
    check('building', 'Building is required').not().isEmpty(),
    check('capacity', 'Capacity must be a number greater than 0').isInt({ min: 1 }),
    check('status', 'Status is required').isIn(['available', 'occupied', 'maintenance', 'cleaning'])
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      name,
      type,
      floor,
      building,
      capacity,
      status,
      equipmentList,
      notes,
      lastCleaned,
      lastMaintenance
    } = req.body;

    const newRoom = new Room({
      name,
      type,
      floor,
      building,
      capacity,
      status,
      equipmentList,
      notes,
      lastCleaned,
      lastMaintenance
    });

    const room = await newRoom.save();

    return res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/rooms/:id
// @desc    Get room by ID
// @access  Private
router.get('/rooms/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    return res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/facility/rooms/:id
// @desc    Update a room
// @access  Private
router.put('/rooms/:id', auth, async (req, res) => {
  try {
    const {
      name,
      type,
      floor,
      building,
      capacity,
      status,
      equipmentList,
      notes,
      lastCleaned,
      lastMaintenance
    } = req.body;

    // Build update object
    const roomFields = {};
    if (name) roomFields.name = name;
    if (type) roomFields.type = type;
    if (floor) roomFields.floor = floor;
    if (building) roomFields.building = building;
    if (capacity) roomFields.capacity = capacity;
    if (status) roomFields.status = status;
    if (equipmentList) roomFields.equipmentList = equipmentList;
    if (notes) roomFields.notes = notes;
    if (lastCleaned) roomFields.lastCleaned = lastCleaned;
    if (lastMaintenance) roomFields.lastMaintenance = lastMaintenance;

    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: roomFields },
      { new: true }
    );

    return res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error updating room:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/facility/rooms/:id
// @desc    Delete a room
// @access  Private
router.delete('/rooms/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    await Room.findByIdAndRemove(req.params.id);

    return res.json({
      success: true,
      message: 'Room removed'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/departments
// @desc    Get all departments
// @access  Private
router.get('/departments', auth, cacheMiddleware(GENERAL_CACHE_DURATION), async (req, res) => {
  try {
    console.log('🔧 Facility departments route hit');
    const departments = await Department.find().sort({ name: 1 });
    
    return res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/departments
// @desc    Create a new department
// @access  Private
router.post('/departments', [auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('building', 'Building is required').not().isEmpty(),
    check('floor', 'Floor is required').not().isEmpty(),
    check('head', 'Department head is required').not().isEmpty(),
    check('staffCount', 'Staff count must be a number').isInt({ min: 0 }),
    check('status', 'Status is required').isIn(['active', 'inactive'])
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      name,
      building,
      floor,
      head,
      staffCount,
      status,
      description,
      contactExtension
    } = req.body;

    const newDepartment = new Department({
      name,
      building,
      floor,
      head,
      staffCount,
      status,
      description,
      contactExtension
    });

    const department = await newDepartment.save();

    return res.status(201).json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/equipment
// @desc    Get all equipment
// @access  Private
router.get('/equipment', auth, cacheMiddleware(GENERAL_CACHE_DURATION), async (req, res) => {
  try {
    console.log('🔧 Facility equipment route hit');
    const equipment = await Equipment.find().sort({ name: 1 });
    
    return res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/equipment
// @desc    Create a new equipment
// @access  Private
router.post('/equipment', [auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('type', 'Type is required').not().isEmpty(),
    check('model', 'Model is required').not().isEmpty(),
    check('serialNumber', 'Serial number is required').not().isEmpty(),
    check('location', 'Location is required').not().isEmpty(),
    check('department', 'Department is required').not().isEmpty(),
    check('status', 'Status is required').isIn(['operational', 'maintenance', 'faulty', 'calibration']),
    check('purchaseDate', 'Purchase date is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      name,
      type,
      model,
      serialNumber,
      location,
      department,
      status,
      purchaseDate,
      lastMaintenance,
      nextMaintenance,
      notes
    } = req.body;

    // Check if equipment with same serial number already exists
    const existingEquipment = await Equipment.findOne({ serialNumber });
    if (existingEquipment) {
      return res.status(400).json({
        success: false,
        message: 'Equipment with this serial number already exists'
      });
    }

    const newEquipment = new Equipment({
      name,
      type,
      model,
      serialNumber,
      location,
      department,
      status,
      purchaseDate,
      lastMaintenance,
      nextMaintenance,
      notes
    });

    const equipment = await newEquipment.save();

    return res.status(201).json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('Error creating equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/facility/equipment/:id
// @desc    Update equipment
// @access  Private
router.put('/equipment/:id', auth, async (req, res) => {
  try {
    const {
      name,
      type,
      model,
      serialNumber,
      location,
      department,
      status,
      purchaseDate,
      lastMaintenance,
      nextMaintenance,
      notes
    } = req.body;

    // Build update object
    const equipmentFields = {};
    if (name) equipmentFields.name = name;
    if (type) equipmentFields.type = type;
    if (model) equipmentFields.model = model;
    if (serialNumber) equipmentFields.serialNumber = serialNumber;
    if (location) equipmentFields.location = location;
    if (department) equipmentFields.department = department;
    if (status) equipmentFields.status = status;
    if (purchaseDate) equipmentFields.purchaseDate = purchaseDate;
    if (lastMaintenance) equipmentFields.lastMaintenance = lastMaintenance;
    if (nextMaintenance) equipmentFields.nextMaintenance = nextMaintenance;
    if (notes) equipmentFields.notes = notes;

    let equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // If serial number is being changed, check if it already exists
    if (serialNumber && serialNumber !== equipment.serialNumber) {
      const existingEquipment = await Equipment.findOne({ serialNumber });
      if (existingEquipment) {
        return res.status(400).json({
          success: false,
          message: 'Equipment with this serial number already exists'
        });
      }
    }

    equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { $set: equipmentFields },
      { new: true }
    );

    return res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/maintenance
// @desc    Get all maintenance requests
// @access  Private
router.get('/maintenance', auth, cacheMiddleware(GENERAL_CACHE_DURATION), async (req, res) => {
  try {
    console.log('🔧 Facility maintenance route hit');
    const maintenanceRequests = await MaintenanceRequest.find().sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      data: maintenanceRequests
    });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/maintenance
// @desc    Create a new maintenance request
// @access  Private
router.post('/maintenance', [auth,
  [
    check('type', 'Type is required').isIn(['room', 'equipment', 'building']),
    check('itemId', 'Item ID is required').not().isEmpty(),
    check('itemName', 'Item name is required').not().isEmpty(),
    check('requestedBy', 'Requester is required').not().isEmpty(),
    check('priority', 'Priority is required').isIn(['low', 'medium', 'high', 'urgent']),
    check('description', 'Description is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      type,
      itemId,
      itemName,
      requestDate,
      requestedBy,
      priority,
      description,
      status,
      assignedTo,
      notes
    } = req.body;

    const newRequest = new MaintenanceRequest({
      type,
      itemId,
      itemName,
      requestDate: requestDate || Date.now(),
      requestedBy,
      priority,
      description,
      status: status || 'pending',
      assignedTo,
      notes
    });

    const request = await newRequest.save();

    // Update item status if it's a room or equipment
    if (type === 'room') {
      await Room.findByIdAndUpdate(
        itemId,
        { status: 'maintenance' }
      );
    } else if (type === 'equipment') {
      await Equipment.findByIdAndUpdate(
        itemId,
        { status: 'maintenance' }
      );
    }

    return res.status(201).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/facility/maintenance/:id
// @desc    Update maintenance request
// @access  Private
router.put('/maintenance/:id', auth, async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      notes,
      completedDate
    } = req.body;

    // Build update object
    const requestFields = {};
    if (status) requestFields.status = status;
    if (priority) requestFields.priority = priority;
    if (assignedTo) requestFields.assignedTo = assignedTo;
    if (notes) requestFields.notes = notes;
    if (completedDate) requestFields.completedDate = completedDate;
    
    // If status is completed and no completedDate is provided, set it
    if (status === 'completed' && !completedDate) {
      requestFields.completedDate = Date.now();
    }

    let request = await MaintenanceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    request = await MaintenanceRequest.findByIdAndUpdate(
      req.params.id,
      { $set: requestFields },
      { new: true }
    );

    // If status changed to completed, update the status of the related item
    if (status === 'completed' && request.status !== 'completed') {
      if (request.type === 'room') {
        await Room.findByIdAndUpdate(
          request.itemId,
          { 
            status: 'available',
            lastMaintenance: Date.now()
          }
        );
      } else if (request.type === 'equipment') {
        await Equipment.findByIdAndUpdate(
          request.itemId,
          { 
            status: 'operational',
            lastMaintenance: Date.now()
          }
        );
      }
    }

    return res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/rooms/:id/occupancy
// @desc    Update room occupancy status
// @access  Private
router.post('/rooms/:id/occupancy', auth, async (req, res) => {
  try {
    const { status, occupiedBy, expectedDuration } = req.body;
    
    // Validate the new status
    if (!['available', 'occupied', 'maintenance', 'cleaning'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Update room status
    const updateData = { status };
    
    // If becoming occupied, add occupancy details
    if (status === 'occupied' && occupiedBy) {
      updateData.notes = `Occupied by: ${occupiedBy}${room.notes ? ' - ' + room.notes : ''}`;
    }
    
    // If becoming available from occupied, update last cleaned if not set
    if (status === 'available' && room.status === 'occupied') {
      updateData.lastCleaned = new Date();
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    return res.json({
      success: true,
      data: updatedRoom
    });
  } catch (error) {
    console.error('Error updating room occupancy:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/equipment/:id/utilization
// @desc    Update equipment utilization data
// @access  Private
router.post('/equipment/:id/utilization', auth, async (req, res) => {
  try {
    const { 
      hoursUsed, 
      operator, 
      isStartingUsage 
    } = req.body;

    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    const utilizationUpdate = {};
    
    // If we're starting usage
    if (isStartingUsage) {
      utilizationUpdate['utilization.lastUsed'] = new Date();
      utilizationUpdate['utilization.currentOperator'] = operator || null;
      
      // Update equipment status to reflect it's being used
      utilizationUpdate.status = 'operational';
    } 
    // If we're ending usage
    else if (hoursUsed > 0) {
      // Increment usage statistics
      utilizationUpdate['utilization.usageCount'] = (equipment.utilization?.usageCount || 0) + 1;
      utilizationUpdate['utilization.totalUsageHours'] = (equipment.utilization?.totalUsageHours || 0) + hoursUsed;
      utilizationUpdate['utilization.currentOperator'] = null;
    }

    const updatedEquipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { $set: utilizationUpdate },
      { new: true }
    );

    return res.json({
      success: true,
      data: updatedEquipment
    });
  } catch (error) {
    console.error('Error updating equipment utilization:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/facility/equipment/:id/maintenance-record
// @desc    Add a maintenance record to equipment history
// @access  Private
router.post('/equipment/:id/maintenance-record', [auth,
  [
    check('date', 'Date is required').not().isEmpty(),
    check('performedBy', 'Performed by is required').not().isEmpty(),
    check('type', 'Type is required').isIn(['routine', 'repair', 'calibration', 'inspection']),
    check('description', 'Description is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      date,
      performedBy,
      type,
      description,
      cost
    } = req.body;

    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Create maintenance record
    const maintenanceRecord = {
      date,
      performedBy,
      type,
      description,
      cost: cost || 0
    };

    // Update equipment with new maintenance record and update last maintenance date
    const updatedEquipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { 
        $push: { maintenanceHistory: maintenanceRecord },
        $set: { 
          lastMaintenance: date,
          status: 'operational' // Reset status to operational after maintenance
        }
      },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      data: updatedEquipment
    });
  } catch (error) {
    console.error('Error adding maintenance record:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/reports/equipment-utilization
// @desc    Get equipment utilization report
// @access  Private
router.get('/reports/equipment-utilization', auth, async (req, res) => {
  try {
    const { department, type, startDate, endDate } = req.query;
    
    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (type) filter.type = type;

    // Get all equipment matching filter
    const equipment = await Equipment.find(filter)
      .select('name type department utilization purchaseDate status');
    
    // Calculate utilization metrics
    const report = {
      totalEquipment: equipment.length,
      totalUsageHours: 0,
      avgUsagePerEquipment: 0,
      utilizationRate: 0,
      equipmentByStatus: {
        operational: 0,
        maintenance: 0,
        faulty: 0,
        calibration: 0
      },
      mostUsedEquipment: [],
      leastUsedEquipment: []
    };

    // Process equipment data
    equipment.forEach(item => {
      // Add to total usage hours
      report.totalUsageHours += item.utilization?.totalUsageHours || 0;
      
      // Count by status
      report.equipmentByStatus[item.status]++;
    });

    // Calculate averages
    if (equipment.length > 0) {
      report.avgUsagePerEquipment = report.totalUsageHours / equipment.length;
    }

    // Sort by usage and get top 5 most used and bottom 5 least used
    const sortedEquipment = [...equipment].sort((a, b) => 
      (b.utilization?.totalUsageHours || 0) - (a.utilization?.totalUsageHours || 0)
    );
    
    report.mostUsedEquipment = sortedEquipment.slice(0, 5).map(e => ({
      id: e._id,
      name: e.name,
      type: e.type,
      department: e.department,
      usageHours: e.utilization?.totalUsageHours || 0,
      usageCount: e.utilization?.usageCount || 0
    }));
    
    report.leastUsedEquipment = sortedEquipment.slice(-5).reverse().map(e => ({
      id: e._id,
      name: e.name,
      type: e.type,
      department: e.department,
      usageHours: e.utilization?.totalUsageHours || 0,
      usageCount: e.utilization?.usageCount || 0
    }));

    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating equipment utilization report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/facility/reports/room-occupancy
// @desc    Get room occupancy report
// @access  Private
router.get('/reports/room-occupancy', auth, async (req, res) => {
  try {
    const { building, floor, type } = req.query;
    
    // Build filter
    const filter = {};
    if (building) filter.building = building;
    if (floor) filter.floor = floor;
    if (type) filter.type = type;

    // Get all rooms matching filter
    const rooms = await Room.find(filter);
    
    // Calculate occupancy metrics
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
    const cleaningRooms = rooms.filter(r => r.status === 'cleaning').length;
    
    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    
    // Group rooms by building and floor
    const roomsByLocation = {};
    rooms.forEach(room => {
      const key = `${room.building}-${room.floor}`;
      if (!roomsByLocation[key]) {
        roomsByLocation[key] = {
          building: room.building,
          floor: room.floor,
          totalRooms: 0,
          occupiedRooms: 0,
          availableRooms: 0,
          occupancyRate: 0
        };
      }
      
      roomsByLocation[key].totalRooms++;
      
      if (room.status === 'occupied') {
        roomsByLocation[key].occupiedRooms++;
      } else if (room.status === 'available') {
        roomsByLocation[key].availableRooms++;
      }
    });
    
    // Calculate occupancy rates for each location
    Object.values(roomsByLocation).forEach(location => {
      location.occupancyRate = location.totalRooms > 0 
        ? (location.occupiedRooms / location.totalRooms) * 100 
        : 0;
    });

    const report = {
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      cleaningRooms,
      occupancyRate,
      roomsByLocation: Object.values(roomsByLocation).sort((a, b) => b.occupancyRate - a.occupancyRate)
    };

    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating room occupancy report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 
