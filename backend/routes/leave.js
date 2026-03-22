const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { auth } = require('../middleware/auth');

// Import models with error handling
let Leave, LeaveBalance, User;
try {
  Leave = require('../models/Leave');
  LeaveBalance = require('../models/LeaveBalance');
  User = require('../models/User');
  console.log('✅ [LEAVE ROUTES] Models imported successfully');
} catch (error) {
  console.error('❌ [LEAVE ROUTES] Error importing models:', error);
}

const ethiopianCalendar = require('../utils/ethiopianCalendar');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// @route   GET /api/leave
// @desc    Get all leave requests with pagination and filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, department, year, search, leaveType, startDate, endDate } = req.query;
    
    // Build query filters
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (department && department !== 'all') {
      query.department = department;
    }

    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }

    // Handle date range filters first, then apply year filtering if needed
    if (startDate || endDate) {
      if (startDate && endDate) {
        const filterStartDate = new Date(startDate);
        const filterEndDate = new Date(endDate);

        // Find leaves where the leave period overlaps with the filter period
        // A leave overlaps if: leave.start <= filter.end AND leave.end >= filter.start
        query.startDate = { $lte: filterEndDate };
        query.endDate = { $gte: filterStartDate };
      } else if (startDate) {
        // Only start date specified - include leaves that end on or after this date
        query.endDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        // Only end date specified - include leaves that start on or before this date
        query.startDate = { $lte: new Date(endDate) };
      }

      // When date range is specified, don't apply the year filter to avoid conflicts
      // The date range will naturally filter by the appropriate years
    } else if (year) {
      // Only apply year filter when no date range is specified
      query.year = parseInt(year);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build match conditions including search if provided
    const matchConditions = { ...query };

    if (search) {
      // For search, we need to do the lookup first, then match
      const searchPipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffDetails'
          }
        },
        { $unwind: '$staffDetails' },
        {
          $match: {
            ...query,
            $or: [
              { 'staffDetails.firstName': { $regex: search, $options: 'i' } },
              { 'staffDetails.lastName': { $regex: search, $options: 'i' } },
              { 'staffDetails.email': { $regex: search, $options: 'i' } }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'approvedBy',
            foreignField: '_id',
            as: 'approverDetails'
          }
        },
        {
          $addFields: {
            approvedBy: { $arrayElemAt: ['$approverDetails', 0] }
          }
        },
        {
          $project: {
            _id: 1,
            leaveType: 1,
            startDate: 1,
            endDate: 1,
            numberOfDays: 1,
            reason: 1,
            status: 1,
            requestedAt: 1,
            approvedAt: 1,
            rejectionReason: 1,
            isHalfDay: 1,
            halfDayType: 1,
            emergencyContact: 1,
            department: 1,
            year: 1,
            attachments: 1,
            notes: 1,
            staffId: {
              _id: '$staffDetails._id',
              firstName: '$staffDetails.firstName',
              lastName: '$staffDetails.lastName',
              email: '$staffDetails.email',
              role: '$staffDetails.role',
              department: '$staffDetails.department'
            },
            approvedBy: {
              firstName: '$approvedBy.firstName',
              lastName: '$approvedBy.lastName'
            }
          }
        }
      ];

      var pipeline = searchPipeline;
    } else {
      // Normal pipeline without search
      var pipeline = [
        { $match: matchConditions },
        {
          $lookup: {
            from: 'users',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffDetails'
          }
        },
        { $unwind: '$staffDetails' },
        {
          $lookup: {
            from: 'users',
            localField: 'approvedBy',
            foreignField: '_id',
            as: 'approverDetails'
          }
        },
        {
          $addFields: {
            approvedBy: { $arrayElemAt: ['$approverDetails', 0] }
          }
        },
        {
          $project: {
            _id: 1,
            leaveType: 1,
            startDate: 1,
            endDate: 1,
            numberOfDays: 1,
            reason: 1,
            status: 1,
            requestedAt: 1,
            approvedAt: 1,
            rejectionReason: 1,
            isHalfDay: 1,
            halfDayType: 1,
            emergencyContact: 1,
            department: 1,
            year: 1,
            attachments: 1,
            notes: 1,
            staffId: {
              _id: '$staffDetails._id',
              firstName: '$staffDetails.firstName',
              lastName: '$staffDetails.lastName',
              email: '$staffDetails.email',
              role: '$staffDetails.role',
              department: '$staffDetails.department'
            },
            approvedBy: {
              firstName: '$approvedBy.firstName',
              lastName: '$approvedBy.lastName'
            }
          }
        }
      ];
    }

    // Get total count for pagination
    let totalRecords;
    if (search) {
      // For search, count from the pipeline up to the match stage
      const countPipeline = [
        { $lookup: { from: 'users', localField: 'staffId', foreignField: '_id', as: 'staffDetails' } },
        { $unwind: '$staffDetails' },
        { $match: {
          ...query,
          $or: [
            { 'staffDetails.firstName': { $regex: search, $options: 'i' } },
            { 'staffDetails.lastName': { $regex: search, $options: 'i' } },
            { 'staffDetails.email': { $regex: search, $options: 'i' } }
          ]
        }},
        { $count: 'total' }
      ];
      const countResult = await Leave.aggregate(countPipeline);
      totalRecords = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      // For non-search, use the regular count approach
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await Leave.aggregate(countPipeline);
      totalRecords = countResult.length > 0 ? countResult[0].total : 0;
    }

    // Add pagination and sorting
    if (search) {
      // For search, insert sort/skip/limit before the project stage
      pipeline.splice(pipeline.length - 1, 0,
        { $sort: { requestedAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      );
    } else {
      pipeline.push(
        { $sort: { requestedAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      );
    }

    const leaveRequests = await Leave.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    const pagination = {
      current: parseInt(page),
      total: totalPages,
      totalRecords: totalRecords,
      itemsPerPage: parseInt(limit)
    };

    res.json({
      success: true,
      leaves: leaveRequests,
      pagination: pagination
    });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/notifications/count
// @desc    Get leave notification count
// @access  Private
router.get('/notifications/count', auth, async (req, res) => {
  try {
    // Get counts for different statuses
    const [pending, approved, rejected] = await Promise.all([
      Leave.countDocuments({ status: 'pending' }),
      Leave.countDocuments({ status: 'approved' }),
      Leave.countDocuments({ status: 'rejected' })
    ]);

    const notificationCount = {
      count: pending, // Only pending requests count as notifications
      pending: pending,
      approved: approved,
      rejected: rejected
    };

    res.json({
      success: true,
      ...notificationCount
    });
  } catch (error) {
    console.error('Error fetching leave notification count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PATCH /api/leave/notifications/mark-read
// @desc    Mark leave notifications as read
// @access  Private
router.patch('/notifications/mark-read', auth, async (req, res) => {
  try {
    // In a real implementation, you might have a separate notifications collection
    // For now, we'll just return success since the notification count is calculated dynamically
    res.json({
      success: true,
      message: 'Notifications marked as read',
      data: {
        markedCount: 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/leave
// @desc    Create new leave request
// @access  Private
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('📝 [LEAVE REQUEST] Received request body:', req.body);
    console.log('📎 [LEAVE REQUEST] Received files:', req.files?.length || 0);
    
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      isHalfDay = false,
      halfDayType,
      emergencyContact,
      notes
    } = req.body;

    // Parse emergency contact if it's a JSON string
    let parsedEmergencyContact = {};
    if (emergencyContact) {
      try {
        parsedEmergencyContact = typeof emergencyContact === 'string' 
          ? JSON.parse(emergencyContact) 
          : emergencyContact;
      } catch (error) {
        console.error('Error parsing emergency contact:', error);
        parsedEmergencyContact = {};
      }
    }

    // Get staff member details
    const staffMember = await User.findById(req.user.id);
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Convert to Ethiopian dates
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const ethiopianStartDate = ethiopianCalendar.gregorianToEthiopian(startDateObj);
    const ethiopianEndDate = ethiopianCalendar.gregorianToEthiopian(endDateObj);

    // Calculate number of days
    const timeDiff = endDateObj.getTime() - startDateObj.getTime();
    const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end days

    // Process file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.originalname,
          path: `uploads/leave-attachments/${file.originalname}`, // In a real app, you'd save the file and get the actual path
          uploadedAt: new Date()
        });
      });
    }

    // Create new leave request
    const leaveRequest = new Leave({
      staffId: req.user.id,
      leaveType,
      startDate: startDateObj,
      endDate: endDateObj,
      ethiopianStartDate: {
        year: ethiopianStartDate.year,
        month: ethiopianStartDate.month,
        day: ethiopianStartDate.day,
        formatted: ethiopianStartDate.formatted
      },
      ethiopianEndDate: {
        year: ethiopianEndDate.year,
        month: ethiopianEndDate.month,
        day: ethiopianEndDate.day,
        formatted: ethiopianEndDate.formatted
      },
      numberOfDays: isHalfDay ? 0.5 : numberOfDays,
      reason,
      isHalfDay: isHalfDay === 'true' || isHalfDay === true,
      halfDayType,
      emergencyContact: parsedEmergencyContact,
      notes,
      attachments,
      department: staffMember.department,
      year: new Date().getFullYear(),
      ethiopianYear: ethiopianStartDate.year
    });

    await leaveRequest.save();

    // Update leave balance to add pending days
    try {
      // Get or create leave balance for the staff member
      let leaveBalance = await LeaveBalance.findOne({
        staffId: req.user.id,
        year: new Date().getFullYear()
      });

      if (!leaveBalance) {
        leaveBalance = new LeaveBalance({
          staffId: req.user.id,
          year: new Date().getFullYear(),
          lastUpdatedBy: req.user.id
        });
      }

      // Add to pending balance
      leaveBalance.updateBalance(leaveType, leaveRequest.numberOfDays, 'request');
      await leaveBalance.save();
      
      console.log(`📝 [LEAVE REQUEST] Added ${leaveRequest.numberOfDays} days of ${leaveType} leave to pending for staff ${req.user.id}`);
    } catch (balanceError) {
      console.error('❌ [LEAVE BALANCE] Error updating pending balance:', balanceError);
      // Don't fail the request creation if balance update fails
    }

    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }
    
    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/my-balance
// @desc    Get current user's leave balance
// @access  Private
router.get('/my-balance', auth, async (req, res) => {
  try {
    console.log('🔍 [LEAVE BALANCE] Starting request for user:', req.user.id);
    
    // Check if models are available
    if (!User || !LeaveBalance) {
      console.error('❌ [LEAVE BALANCE] Models not available');
      return res.status(500).json({
        success: false,
        message: 'Models not available',
        error: 'User or LeaveBalance model not loaded'
      });
    }
    
    const { year = new Date().getFullYear() } = req.query;
    
    // Get current user details
    console.log('🔍 [LEAVE BALANCE] Fetching user details...');
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      console.log('❌ [LEAVE BALANCE] User not found:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    console.log('✅ [LEAVE BALANCE] User found:', currentUser.firstName, currentUser.lastName);

    // Try to get or create leave balance for the current user
    console.log('🔍 [LEAVE BALANCE] Looking for existing balance...');
    let leaveBalance;
    let defaultBalance = {
      annual: { allocated: 21, used: 0, pending: 0 },
      sick: { allocated: 10, used: 0, pending: 0 },
      personal: { allocated: 5, used: 0, pending: 0 },
      maternity: { allocated: 90, used: 0, pending: 0 },
      paternity: { allocated: 10, used: 0, pending: 0 },
      bereavement: { allocated: 5, used: 0, pending: 0 },
      other: { allocated: 0, used: 0, pending: 0 }
    };

    try {
      leaveBalance = await LeaveBalance.findOne({
        staffId: req.user.id,
        year: parseInt(year)
      });

      if (!leaveBalance) {
        console.log('🔍 [LEAVE BALANCE] No existing balance found, creating new one...');
        // Create default leave balance if it doesn't exist
        leaveBalance = new LeaveBalance({
          staffId: req.user.id,
          year: parseInt(year),
          lastUpdatedBy: req.user.id
        });
        await leaveBalance.save();
        console.log('✅ [LEAVE BALANCE] New balance created');
      } else {
        console.log('✅ [LEAVE BALANCE] Existing balance found');
      }
    } catch (balanceError) {
      console.log('⚠️ [LEAVE BALANCE] Error with LeaveBalance model, using defaults:', balanceError.message);
      leaveBalance = { leaveTypes: defaultBalance };
    }

    // Simple response without complex aggregation
    const response = {
      success: true,
      data: {
        staff: {
          _id: currentUser._id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
          role: currentUser.role,
          department: currentUser.department
        },
        balance: leaveBalance.leaveTypes || defaultBalance,
        year: parseInt(year)
      }
    };

    console.log('✅ [LEAVE BALANCE] Sending response');
    res.json(response);
  } catch (error) {
    console.error('❌ [LEAVE BALANCE] Error fetching my leave balance:', error);
    console.error('❌ [LEAVE BALANCE] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/test-balance
// @desc    Test leave balance endpoint (for debugging)
// @access  Private
router.get('/test-balance', auth, async (req, res) => {
  try {
    console.log('🧪 [TEST BALANCE] Testing leave balance endpoint');
    
    // Test basic response
    res.json({
      success: true,
      message: 'Leave balance test endpoint working',
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST BALANCE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/health
// @desc    Health check for leave routes (no auth required)
// @access  Public
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 [LEAVE HEALTH] Health check requested');
    
    res.json({
      success: true,
      message: 'Leave routes are healthy',
      timestamp: new Date().toISOString(),
      models: {
        User: !!User,
        Leave: !!Leave,
        LeaveBalance: !!LeaveBalance
      }
    });
  } catch (error) {
    console.error('❌ [LEAVE HEALTH] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// @route   GET /api/leave/my-leaves
// @desc    Get current user's leave requests
// @access  Private
router.get('/my-leaves', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), status, page = 1, limit = 20 } = req.query;
    
    // Build query filters
    const query = {
      staffId: req.user.id,
      year: parseInt(year)
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get leave requests with pagination
    const leaveRequests = await Leave.find(query)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('staffId', 'firstName lastName email department')
      .populate('approvedBy', 'firstName lastName')
      .lean();
    
    // Get total count for pagination
    const totalCount = await Leave.countDocuments(query);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.json({
      success: true,
      data: {
        leaveRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/all-balances
// @desc    Get all staff leave balances
// @access  Private
router.get('/all-balances', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    console.log(`🔍 [LEAVE BALANCES] Fetching all balances for year: ${year}`);
    
    // Get all staff members (excluding admins)
    const staffMembers = await User.find({ role: { $ne: 'admin' } });
    console.log(`👥 [LEAVE BALANCES] Found ${staffMembers.length} staff members`);
    
    // Get leave balances for all staff
    const leaveBalances = await Promise.all(
      staffMembers.map(async (staff) => {
        try {
          console.log(`👤 [LEAVE BALANCES] Processing staff: ${staff.firstName} ${staff.lastName} (${staff._id})`);
          
          // Get or create leave balance for the staff member
          let leaveBalance = await LeaveBalance.findOne({
            staffId: staff._id,
            year: parseInt(year)
          });

        if (!leaveBalance) {
          // Create default leave balance if it doesn't exist
          leaveBalance = new LeaveBalance({
            staffId: staff._id,
            year: parseInt(year),
            lastUpdatedBy: req.user.id
          });
          await leaveBalance.save();
        }

        // Get actual leave usage from Leave collection
        const leaveUsage = await Leave.aggregate([
          {
            $match: {
              staffId: new mongoose.Types.ObjectId(staff._id),
              year: parseInt(year),
              status: { $in: ['approved', 'pending'] }
            }
          },
          {
            $group: {
              _id: '$leaveType',
              used: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'approved'] }, '$numberOfDays', 0]
                }
              },
              pending: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'pending'] }, '$numberOfDays', 0]
                }
              }
            }
          }
        ]);

        // Update leave balance with actual usage
        const usageMap = {};
        leaveUsage.forEach(usage => {
          usageMap[usage._id] = {
            used: usage.used,
            pending: usage.pending
          };
        });

        // Calculate remaining days
        const remaining = {};
        const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'other'];
        let totalRemaining = 0;

        leaveTypes.forEach(type => {
          const allocated = leaveBalance.leaveTypes[type]?.allocated || 0;
          const used = usageMap[type]?.used || 0;
          const pending = usageMap[type]?.pending || 0;
          
          remaining[type] = allocated - used;
          totalRemaining += remaining[type];

          // Update the balance with actual usage
          if (leaveBalance.leaveTypes[type]) {
            leaveBalance.leaveTypes[type].used = used;
            leaveBalance.leaveTypes[type].pending = pending;
          }
        });

        // Save updated balance
        await leaveBalance.save();

          return {
            staff: {
              _id: staff._id,
              firstName: staff.firstName,
              lastName: staff.lastName,
              email: staff.email,
              role: staff.role,
              department: staff.department
            },
            balance: leaveBalance.leaveTypes,
            remaining,
            totalRemaining
          };
        } catch (staffError) {
          console.error(`❌ [LEAVE BALANCES] Error processing staff ${staff._id}:`, staffError);
          // Return a default structure for failed staff
          return {
            staff: {
              _id: staff._id,
              firstName: staff.firstName,
              lastName: staff.lastName,
              email: staff.email,
              role: staff.role,
              department: staff.department
            },
            balance: {},
            remaining: {},
            totalRemaining: 0,
            error: 'Failed to load balance data'
          };
        }
      })
    );

    res.json({
      success: true,
      data: leaveBalances
    });
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/statistics
// @desc    Get leave statistics
// @access  Private
router.get('/statistics', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    // Get status statistics
    const statusStats = await Leave.aggregate([
      {
        $match: { year: parseInt(year) }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$numberOfDays' }
        }
      }
    ]);

    // Get leave type statistics
    const leaveTypeStats = await Leave.aggregate([
      {
        $match: { year: parseInt(year) }
      },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          totalDays: { $sum: '$numberOfDays' },
          approvedDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$numberOfDays', 0]
            }
          }
        }
      }
    ]);

    // Get department statistics
    const departmentStats = await Leave.aggregate([
      {
        $match: { year: parseInt(year) }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          totalDays: { $sum: '$numberOfDays' }
        }
      }
    ]);

    const statistics = {
      statusStats,
      leaveTypeStats,
      departmentStats
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching leave statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PATCH /api/leave/:id/status
// @desc    Update leave request status
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    const leaveRequest = await Leave.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Store previous status for balance update logic
    const previousStatus = leaveRequest.status;

    // Update status
    leaveRequest.status = status;
    if (status === 'approved') {
      leaveRequest.approvedBy = req.user.id;
      leaveRequest.approvedAt = new Date();
    } else if (status === 'rejected') {
      leaveRequest.rejectionReason = rejectionReason;
    }

    await leaveRequest.save();

    // Update leave balance based on status change
    if (status !== previousStatus) {
      try {
        // Get or create leave balance for the staff member
        let leaveBalance = await LeaveBalance.findOne({
          staffId: leaveRequest.staffId,
          year: leaveRequest.year
        });

        if (!leaveBalance) {
          leaveBalance = new LeaveBalance({
            staffId: leaveRequest.staffId,
            year: leaveRequest.year,
            lastUpdatedBy: req.user.id
          });
        }

        // Update balance based on status change
        if (status === 'approved' && previousStatus === 'pending') {
          // Deduct from balance when approved
          leaveBalance.updateBalance(leaveRequest.leaveType, leaveRequest.numberOfDays, 'approve');
          console.log(`✅ [LEAVE BALANCE] Deducted ${leaveRequest.numberOfDays} days of ${leaveRequest.leaveType} leave for staff ${leaveRequest.staffId}`);
        } else if (status === 'rejected' && previousStatus === 'pending') {
          // Remove from pending when rejected
          leaveBalance.updateBalance(leaveRequest.leaveType, leaveRequest.numberOfDays, 'reject');
          console.log(`❌ [LEAVE BALANCE] Removed ${leaveRequest.numberOfDays} days of ${leaveRequest.leaveType} leave from pending for staff ${leaveRequest.staffId}`);
        } else if (status === 'pending' && previousStatus === 'rejected') {
          // Add back to pending when re-submitted
          leaveBalance.updateBalance(leaveRequest.leaveType, leaveRequest.numberOfDays, 'request');
          console.log(`🔄 [LEAVE BALANCE] Added ${leaveRequest.numberOfDays} days of ${leaveRequest.leaveType} leave back to pending for staff ${leaveRequest.staffId}`);
        }

        await leaveBalance.save();
        console.log(`💾 [LEAVE BALANCE] Updated leave balance for staff ${leaveRequest.staffId}`);
      } catch (balanceError) {
        console.error('❌ [LEAVE BALANCE] Error updating leave balance:', balanceError);
        // Don't fail the entire request if balance update fails
        // The leave request was already updated successfully
      }
    }

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: {
        id: leaveRequest._id,
        status: leaveRequest.status,
        rejectionReason: leaveRequest.rejectionReason,
        updatedAt: leaveRequest.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/balance/:staffId
// @desc    Get staff leave balance by ID
// @access  Private
router.get('/balance/:staffId', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    
    // Get staff member details
    const staffMember = await User.findById(staffId);
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Get or create leave balance for the staff member
    let leaveBalance = await LeaveBalance.findOne({
      staffId,
      year: parseInt(year)
    });

    if (!leaveBalance) {
      // Create default leave balance if it doesn't exist
      leaveBalance = new LeaveBalance({
        staffId,
        year: parseInt(year),
        lastUpdatedBy: req.user.id
      });
      await leaveBalance.save();
    }

    // Get actual leave usage from Leave collection
    const leaveUsage = await Leave.aggregate([
      {
        $match: {
          staffId: new mongoose.Types.ObjectId(staffId),
          year: parseInt(year),
          status: { $in: ['approved', 'pending'] }
        }
      },
      {
        $group: {
          _id: '$leaveType',
          used: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$numberOfDays', 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$numberOfDays', 0]
            }
          }
        }
      }
    ]);

    // Update leave balance with actual usage
    const usageMap = {};
    leaveUsage.forEach(usage => {
      usageMap[usage._id] = {
        used: usage.used,
        pending: usage.pending
      };
    });

    // Calculate remaining days
    const remaining = {};
    const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'other'];
    let totalRemaining = 0;

    leaveTypes.forEach(type => {
      const allocated = leaveBalance.leaveTypes[type]?.allocated || 0;
      const used = usageMap[type]?.used || 0;
      const pending = usageMap[type]?.pending || 0;
      
      remaining[type] = allocated - used;
      totalRemaining += remaining[type];

      // Update the balance with actual usage
      if (leaveBalance.leaveTypes[type]) {
        leaveBalance.leaveTypes[type].used = used;
        leaveBalance.leaveTypes[type].pending = pending;
      }
    });

    // Save updated balance
    await leaveBalance.save();

    res.json({
      success: true,
      data: {
        staff: {
          _id: staffMember._id,
          firstName: staffMember.firstName,
          lastName: staffMember.lastName,
          email: staffMember.email,
          role: staffMember.role,
          department: staffMember.department
        },
        balance: leaveBalance.leaveTypes,
        remaining,
        totalRemaining,
        year: parseInt(year)
      }
    });
  } catch (error) {
    console.error('Error fetching staff leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/leave/balance/:staffId
// @desc    Update staff leave balance
// @access  Private
router.put('/balance/:staffId', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { leaveTypes } = req.body;
    
    // Find or create leave balance for the staff member
    let leaveBalance = await LeaveBalance.findOne({
      staffId,
      year: new Date().getFullYear()
    });

    if (!leaveBalance) {
      leaveBalance = new LeaveBalance({
        staffId,
        year: new Date().getFullYear(),
        lastUpdatedBy: req.user.id
      });
    }

    // Update leave types allocation
    Object.keys(leaveTypes).forEach(type => {
      if (leaveBalance.leaveTypes[type]) {
        leaveBalance.leaveTypes[type].allocated = leaveTypes[type];
      }
    });

    await leaveBalance.save();

    res.json({
      success: true,
      message: 'Leave balance updated successfully',
      data: {
        staffId,
        leaveTypes: leaveBalance.leaveTypes,
        updatedAt: leaveBalance.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/ethiopian-calendar
// @desc    Get Ethiopian calendar information and utilities
// @access  Private
router.get('/ethiopian-calendar', auth, async (req, res) => {
  try {
    const currentEthiopian = ethiopianCalendar.getCurrentEthiopianDate();
    const months = ethiopianCalendar.getEthiopianMonths();
    const years = [];
    
    // Generate year range (current -5 to current +2)
    for (let i = currentEthiopian.year - 5; i <= currentEthiopian.year + 2; i++) {
      years.push(i);
    }

    res.json({
      success: true,
      data: {
        currentDate: currentEthiopian,
        months: months,
        years: years,
        monthNames: ethiopianCalendar.ETHIOPIAN_MONTHS,
        dayNames: ethiopianCalendar.ETHIOPIAN_DAYS
      }
    });
  } catch (error) {
    console.error('Error fetching Ethiopian calendar info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/leave/convert-date
// @desc    Convert between Gregorian and Ethiopian dates
// @access  Private
router.post('/convert-date', auth, async (req, res) => {
  try {
    const { type, date, year, month, day } = req.body;
    
    if (type === 'gregorian-to-ethiopian') {
      const gregorianDate = new Date(date);
      const ethiopianDate = ethiopianCalendar.gregorianToEthiopian(gregorianDate);
      
      res.json({
        success: true,
        data: {
          original: {
            date: date,
            formatted: gregorianDate.toLocaleDateString()
          },
          converted: ethiopianDate
        }
      });
    } else if (type === 'ethiopian-to-gregorian') {
      const gregorianDate = ethiopianCalendar.ethiopianToGregorian(year, month, day);
      const ethiopianDate = { year, month, day };
      
      res.json({
        success: true,
        data: {
          original: ethiopianDate,
          converted: {
            date: gregorianDate.toISOString(),
            formatted: gregorianDate.toLocaleDateString()
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid conversion type. Use "gregorian-to-ethiopian" or "ethiopian-to-gregorian"'
      });
    }
  } catch (error) {
    console.error('Error converting date:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/leave/:id
// @desc    Delete leave request
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin (you might want to add role checking)
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const leaveRequest = await Leave.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // If the leave request was pending, we need to remove it from the balance
    if (leaveRequest.status === 'pending') {
      try {
        let leaveBalance = await LeaveBalance.findOne({
          staffId: leaveRequest.staffId,
          year: leaveRequest.year
        });

        if (leaveBalance) {
          // Remove the pending leave from balance
          leaveBalance.updateBalance(leaveRequest.leaveType, leaveRequest.numberOfDays, 'delete');
          await leaveBalance.save();
          console.log(`🗑️ [LEAVE BALANCE] Removed ${leaveRequest.numberOfDays} days of ${leaveRequest.leaveType} pending leave for staff ${leaveRequest.staffId}`);
        }
      } catch (balanceError) {
        console.error('❌ [LEAVE BALANCE] Error updating balance on delete:', balanceError);
        // Don't fail the delete operation if balance update fails
      }
    }

    // Delete the leave request
    await Leave.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/leave/export/csv
// @desc    Export leave requests to CSV format
// @access  Private
router.get('/export/csv', auth, async (req, res) => {
  try {
    console.log('🔄 [CSV EXPORT] Starting export with params:', req.query);

    const { page = 1, limit = 1000, status, department, year, search, leaveType, startDate, endDate } = req.query;

    // Build query filters (same logic as GET /api/leave)
    const query = {};
    console.log('🔍 [CSV EXPORT] Building query filters...');

    if (status && status !== 'all') {
      query.status = status;
    }

    if (department && department !== 'all') {
      query.department = department;
    }

    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }

    // Handle date range filters first, then apply year filtering if needed
    if (startDate || endDate) {
      if (startDate && endDate) {
        const filterStartDate = new Date(startDate);
        const filterEndDate = new Date(endDate);

        // Find leaves where the leave period overlaps with the filter period
        // A leave overlaps if: leave.start <= filter.end AND leave.end >= filter.start
        query.startDate = { $lte: filterEndDate };
        query.endDate = { $gte: filterStartDate };
        console.log('📅 [CSV EXPORT] Date range filter applied:', { startDate: filterStartDate, endDate: filterEndDate });
      } else if (startDate) {
        // Only start date specified - include leaves that end on or after this date
        query.endDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        // Only end date specified - include leaves that start on or before this date
        query.startDate = { $lte: new Date(endDate) };
      }
    } else if (year) {
      // Only apply year filter when no date range is specified
      query.year = parseInt(year);
    }

    console.log('🔍 [CSV EXPORT] Final query:', JSON.stringify(query, null, 2));

    // Get all matching leave requests (no pagination for export)
    console.log('📊 [CSV EXPORT] Fetching leave requests...');
    let leaveRequests = await Leave.find(query)
      .populate('staffId', 'firstName lastName email role department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ requestedAt: -1 })
      .lean();

    // Apply search filter if provided (client-side filtering for CSV export)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      leaveRequests = leaveRequests.filter(request =>
        (request.staffId?.firstName && searchRegex.test(request.staffId.firstName)) ||
        (request.staffId?.lastName && searchRegex.test(request.staffId.lastName)) ||
        (request.staffId?.email && searchRegex.test(request.staffId.email))
      );
      console.log(`🔍 [CSV EXPORT] Applied search filter "${search}", results: ${leaveRequests.length}`);
    }

    console.log(`📊 [CSV EXPORT] Found ${leaveRequests.length} leave requests`);

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No leave requests found matching the criteria'
      });
    }

    // CSV headers
    const headers = [
      'Staff Name',
      'Email',
      'Role',
      'Department',
      'Leave Type',
      'Start Date',
      'End Date',
      'Days',
      'Status',
      'Reason',
      'Requested Date',
      'Approved Date',
      'Approved By'
    ];

    // Create CSV content
    console.log('📝 [CSV EXPORT] Generating CSV content...');
    let csvContent = headers.join(',') + '\n';

    leaveRequests.forEach((request) => {
      try {
        const row = [
          `"${(request.staffId ? `${request.staffId.firstName || ''} ${request.staffId.lastName || ''}`.trim() : 'Unknown') || 'Unknown'}"`,
          `"${request.staffId?.email || ''}"`,
          `"${request.staffId?.role || ''}"`,
          `"${request.staffId?.department || request.department || ''}"`,
          `"${(request.leaveType || '').charAt(0).toUpperCase() + (request.leaveType || '').slice(1)}"`,
          `"${request.startDate ? new Date(request.startDate).toLocaleDateString() : ''}"`,
          `"${request.endDate ? new Date(request.endDate).toLocaleDateString() : ''}"`,
          `"${request.numberOfDays || 0}"`,
          `"${(request.status || '').charAt(0).toUpperCase() + (request.status || '').slice(1)}"`,
          `"${(request.reason || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
          `"${request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : ''}"`,
          `"${request.approvedAt ? new Date(request.approvedAt).toLocaleDateString() : ''}"`,
          `"${request.approvedBy ? `${request.approvedBy.firstName || ''} ${request.approvedBy.lastName || ''}`.trim() : ''}"`
        ];

        csvContent += row.join(',') + '\n';
      } catch (rowError) {
        console.error('❌ [CSV EXPORT] Error processing row:', rowError);
      }
    });

    // Set response headers
    console.log('📤 [CSV EXPORT] Setting response headers...');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leave_requests_export.csv`);

    // Send CSV content
    console.log('✅ [CSV EXPORT] CSV export completed successfully');
    res.send(csvContent);

  } catch (error) {
    console.error('❌ [CSV EXPORT] Error exporting to CSV:', error);
    console.error('❌ [CSV EXPORT] Error details:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error during CSV export',
      error: error.message
    });
  }
});

module.exports = router;
