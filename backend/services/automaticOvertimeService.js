const mongoose = require('mongoose');
const User = require('../models/User');
const StaffAttendance = require('../models/StaffAttendance');
const { logger } = require('../middleware/errorHandler');

/**
 * Automatic Overtime Service
 * 
 * This service handles automatic overtime transitions for staff who haven't clocked out
 * when their regular working hours end.
 */
class AutomaticOvertimeService {
  /**
   * Process automatic overtime transition for all staff
   */
  static async processAutomaticOvertimeTransition() {
    try {
      logger.info('🔄 Starting automatic overtime transition process...');
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      // Get all active users who should be working
      const activeUsers = await User.find({ 
        status: 'active',
        role: { $in: ['doctor', 'nurse', 'receptionist', 'pharmacist'] }
      });

      const results = [];
      let processedCount = 0;

      for (const user of activeUsers) {
        try {
          const result = await this.processUserOvertimeTransition(user, currentTime);
          results.push(result);
          
          if (result.success) {
            processedCount++;
          }
        } catch (error) {
          logger.error(`❌ Error processing overtime for user ${user.name}:`, error);
          results.push({
            userId: user._id,
            success: false,
            message: 'Error processing overtime transition',
            error: error.message
          });
        }
      }

      logger.info(`✅ Automatic overtime transition completed. Processed ${processedCount}/${activeUsers.length} users`);
      
      return {
        success: true,
        processedCount,
        totalUsers: activeUsers.length,
        results,
        message: `Successfully processed overtime transition for ${processedCount} users`
      };

    } catch (error) {
      logger.error('❌ Error in automatic overtime transition:', error);
      return {
        success: false,
        message: 'Failed to process automatic overtime transition',
        error: error.message
      };
    }
  }

  /**
   * Process overtime transition for a specific user
   */
  static async processUserOvertimeTransition(user, currentTime) {
    try {
      const workSchedule = this.getWorkSchedule(user.role);
      
      // Check if user is currently checked in and past their end time
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const currentAttendance = await StaffAttendance.findOne({
        userId: user._id,
        checkInTime: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        status: 'checked-in'
      });

      if (!currentAttendance) {
        return {
          userId: user._id,
          success: false,
          message: 'User not currently checked in',
          data: { user }
        };
      }

      // Check if it's past their end time
      if (currentTime > workSchedule.endTime) {
        // Mark as overtime
        await this.markUserAsOvertime(currentAttendance, user);
        
        return {
          userId: user._id,
          success: true,
          message: 'User marked as overtime',
          data: { user, attendance: currentAttendance }
        };
      }

      return {
        userId: user._id,
        success: false,
        message: 'User not yet in overtime period',
        data: { user }
      };

    } catch (error) {
      logger.error(`❌ Error processing overtime for user ${user.name}:`, error);
      throw error;
    }
  }

  /**
   * Mark user as overtime
   */
  static async markUserAsOvertime(attendance, user) {
    try {
      // Update attendance record to indicate overtime
      attendance.attendanceStatus = 'overtime';
      attendance.notes = attendance.notes ? 
        `${attendance.notes}; Automatically marked as overtime` : 
        'Automatically marked as overtime';
      
      await attendance.save();
      
      logger.info(`✅ Marked ${user.name} (${user.role}) as overtime`);
      
      return {
        success: true,
        message: 'User marked as overtime successfully'
      };
    } catch (error) {
      logger.error(`❌ Error marking ${user.name} as overtime:`, error);
      throw error;
    }
  }

  /**
   * Get work schedule based on role
   */
  static getWorkSchedule(role) {
    const schedules = {
      doctor: { startTime: 8 * 60, endTime: 17 * 60 }, // 8 AM - 5 PM
      nurse: { startTime: 7 * 60, endTime: 19 * 60 }, // 7 AM - 7 PM
      receptionist: { startTime: 8 * 60, endTime: 18 * 60 }, // 8 AM - 6 PM
      pharmacist: { startTime: 8 * 60, endTime: 18 * 60 } // 8 AM - 6 PM
    };
    
    return schedules[role] || schedules.receptionist;
  }

  /**
   * Get overtime statistics for a date range
   */
  static async getOvertimeStatistics(startDate, endDate) {
    try {
      const overtimeRecords = await StaffAttendance.aggregate([
        {
          $match: {
            checkInTime: { $gte: startDate, $lte: endDate },
            attendanceStatus: 'overtime'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $group: {
            _id: '$user.role',
            count: { $sum: 1 },
            totalHours: { $sum: '$totalHours' },
            users: { $push: '$user.name' }
          }
        }
      ]);

      return overtimeRecords;
    } catch (error) {
      logger.error('❌ Error getting overtime statistics:', error);
      throw error;
    }
  }

  /**
   * Get user's overtime history
   */
  static async getUserOvertimeHistory(userId, startDate, endDate) {
    try {
      const overtimeRecords = await StaffAttendance.find({
        userId: userId,
        checkInTime: { $gte: startDate, $lte: endDate },
        attendanceStatus: 'overtime'
      }).sort({ checkInTime: -1 });

      return overtimeRecords;
    } catch (error) {
      logger.error('❌ Error getting user overtime history:', error);
      throw error;
    }
  }
}

module.exports = AutomaticOvertimeService;
