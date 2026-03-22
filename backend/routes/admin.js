const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// @route   GET /api/admin
// @desc    Get all admin
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'admin endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/auto-clockout-setting
// @desc    Get auto clockout settings
// @access  Private
router.get('/auto-clockout-setting', auth, async (req, res) => {
  try {
    // Mock auto clockout settings
    const settings = {
      enabled: true,
      timeoutMinutes: 30,
      gracePeriodMinutes: 5,
      autoClockOutEnabled: true,
      inactivityThreshold: 15,
      notificationEnabled: true,
      departments: {
        'Doctors': {
          enabled: true,
          timeoutMinutes: 45,
          gracePeriodMinutes: 10
        },
        'Nurses': {
          enabled: true,
          timeoutMinutes: 30,
          gracePeriodMinutes: 5
        },
        'Reception': {
          enabled: true,
          timeoutMinutes: 20,
          gracePeriodMinutes: 3
        }
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching auto clockout settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users for admin management
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    // Import User model
    const User = require('../models/User');
    
    // Fetch real users from clinic-cms database
    const users = await User.find({ isActive: true })
      .select('firstName lastName email username role specialization isActive createdAt updatedAt telegramChatId telegramNotificationsEnabled telegramUsername notificationPreferences')
      .sort({ createdAt: -1 });

    // Format users for frontend
    const formattedUsers = users.map(user => ({
      _id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      username: user.username,
      role: user.role,
      specialization: user.specialization || '',
      department: user.specialization || user.role, // Use specialization as department or fallback to role
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.updatedAt, // Use updatedAt as lastLogin for now
      telegramChatId: user.telegramChatId || '',
      telegramNotificationsEnabled: user.telegramNotificationsEnabled || false,
      telegramUsername: user.telegramUsername || '',
      notificationPreferences: user.notificationPreferences || {}
    }));

    console.log(`[/api/admin/users] Found ${formattedUsers.length} users from clinic-cms database`);

    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private
router.post('/users', auth, async (req, res) => {
  try {
    const userData = req.body;
    
    // Import User model and bcrypt
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { username: userData.username }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password || 'defaultPassword123', salt);
    
    // Create new user
    const newUser = new User({
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      specialization: userData.specialization || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedUser = await newUser.save();
    
    console.log(`[/api/admin/users] New user created: ${savedUser.firstName} ${savedUser.lastName}`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: savedUser._id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        username: savedUser.username,
        role: savedUser.role,
        specialization: savedUser.specialization,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// @route   GET /api/admin/settings/attendance_overlay_enabled
// @desc    Get attendance overlay setting
// @access  Private
router.get('/settings/attendance_overlay_enabled', auth, async (req, res) => {
  try {
    // Mock setting data
    const setting = {
      key: 'attendance_overlay_enabled',
      value: true,
      description: 'Enable attendance overlay for staff monitoring',
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error fetching attendance overlay setting:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/settings/auto_clockout_on_logout
// @desc    Get auto clockout on logout setting
// @access  Private
router.get('/settings/auto_clockout_on_logout', auth, async (req, res) => {
  try {
    // Mock setting data
    const setting = {
      key: 'auto_clockout_on_logout',
      value: true,
      description: 'Automatically clock out users when they logout',
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error fetching auto clockout setting:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/my-overlay-setting
// @desc    Get overlay settings for the current user
// @access  Private
router.get('/my-overlay-setting', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found'
      });
    }

    // Get user's actual overlay setting from database
    const User = require('../models/User');
    const user = await User.findById(userId).select('attendanceOverlayEnabled firstName lastName role');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const overlayEnabled = user.attendanceOverlayEnabled !== false; // Default to true if not set
    
    console.log(`📋 [Admin] Overlay setting for ${user.firstName} ${user.lastName}: ${overlayEnabled}`);

    res.json({
      success: true,
      overlayEnabled: overlayEnabled,
      data: {
        enabled: overlayEnabled,
        showAttendanceOverlay: overlayEnabled,
        showCheckInReminder: overlayEnabled,
        showOvertimeWarning: true,
        checkInRequired: overlayEnabled,
        lastCheckIn: null,
        currentStatus: 'not_checked_in'
      }
    });
  } catch (error) {
    console.error('Error fetching overlay settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/admin
// @desc    Create new admin
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'admin created successfully'
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update a specific user
// @access  Private
router.put('/users/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    
    // Import User model
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    // Find the user first
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Normalize notification preferences: ensure unchecked boxes persist as false
    const allPrefKeys = [
      'patientAssignments',
      'vitalsUpdates',
      'labOrders',
      'imagingRequests',
      'procedures',
      'medicationOrders',
      'emergencyAlerts',
      'systemUpdates',
      'billingUpdates',
      'dailyRevenue',
      'paymentAlerts',
      'attendanceUpdates'
    ];

    let normalizedPrefs = undefined;
    // Always normalize if notificationPreferences is provided (even if empty object)
    if (updateData && updateData.notificationPreferences !== undefined) {
      const toBoolean = (val) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          const s = val.trim().toLowerCase();
          if (s === 'true') return true;
          if (s === 'false') return false;
        }
        if (typeof val === 'number') return val !== 0;
        return false; // treat undefined/missing/null as unchecked
      };

      // Start with existing user preferences as base, then override with submitted values
      const basePrefs = user.notificationPreferences || {};
      normalizedPrefs = {};
      
      for (const key of allPrefKeys) {
        // If key exists in updateData, use it (coerced to boolean)
        // Otherwise, keep the existing value from the user
        if (updateData.notificationPreferences && typeof updateData.notificationPreferences === 'object' && key in updateData.notificationPreferences) {
          const value = updateData.notificationPreferences[key];
          normalizedPrefs[key] = toBoolean(value);
        } else {
          // Keep existing value if not provided in update
          normalizedPrefs[key] = basePrefs[key] !== undefined ? basePrefs[key] : false;
        }
      }
      
      console.log('📋 [Admin] Normalizing notification preferences:', {
        received: updateData.notificationPreferences,
        normalized: normalizedPrefs,
        userExisting: user.notificationPreferences
      });
    }

    // Prepare update object - only include fields that are explicitly provided
    const updateObject = {};
    if (updateData.firstName !== undefined) updateObject.firstName = updateData.firstName.trim();
    if (updateData.lastName !== undefined) updateObject.lastName = updateData.lastName.trim();
    if (updateData.username !== undefined) updateObject.username = updateData.username.trim();
    if (updateData.email !== undefined) updateObject.email = updateData.email.trim().toLowerCase();
    if (updateData.role !== undefined) updateObject.role = updateData.role;
    if (updateData.role === 'doctor' && updateData.specialization) {
      updateObject.specialization = updateData.specialization;
    } else if (updateData.role && updateData.role !== 'doctor') {
      updateObject.specialization = '';
    }
    if (updateData.telegramChatId !== undefined) updateObject.telegramChatId = updateData.telegramChatId;
    if (updateData.telegramNotificationsEnabled !== undefined) updateObject.telegramNotificationsEnabled = updateData.telegramNotificationsEnabled;
    if (updateData.telegramUsername !== undefined) updateObject.telegramUsername = updateData.telegramUsername;
    
    if (normalizedPrefs !== undefined) {
      updateObject.notificationPreferences = normalizedPrefs;
    }
    
    // If password is provided, hash it
    if (updateData.password && updateData.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateObject.password = await bcrypt.hash(updateData.password, salt);
    }
    
    console.log(`[/api/admin/users/${id}] Updating with fields:`, Object.keys(updateObject));
    
    // Update the user (runValidators off to avoid issues with conditional required fields in $set)
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true }
    );
    
    console.log(`[/api/admin/users/${id}] User updated successfully`);
    console.log('📋 [Admin] Final notification preferences saved:', updatedUser.notificationPreferences);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        specialization: updatedUser.specialization,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        // Include Telegram fields in response
        telegramChatId: updatedUser.telegramChatId,
        telegramNotificationsEnabled: updatedUser.telegramNotificationsEnabled,
        telegramUsername: updatedUser.telegramUsername,
        notificationPreferences: updatedUser.notificationPreferences
      }
    });
  } catch (error) {
    console.error('Error updating user:', error.message, error.stack);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${Object.values(error.errors || {}).map(e => e.message).join(', ')}`,
        error: error.message
      });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `Duplicate value: ${field} already exists`,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a specific user (soft delete - mark as inactive)
// @access  Private
router.delete('/users/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Import User model
    const User = require('../models/User');
    
    // Find the user first
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if trying to delete admin user (prevent deletion of admin)
    if (user.role === 'Admin' || user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin user'
      });
    }
    
    // Soft delete - mark user as inactive instead of hard delete
    const deletedUser = await User.findByIdAndUpdate(
      id,
      { 
        isActive: false, 
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log(`[/api/admin/users/${id}] User soft deleted successfully: ${user.firstName} ${user.lastName}`);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      user: {
        _id: deletedUser._id,
        firstName: deletedUser.firstName,
        lastName: deletedUser.lastName,
        email: deletedUser.email,
        username: deletedUser.username,
        role: deletedUser.role,
        specialization: deletedUser.specialization,
        isActive: deletedUser.isActive,
        deletedAt: deletedUser.deletedAt
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

module.exports = router;
