const mongoose = require('mongoose');
const User = require('../models/User');
const StaffAttendance = require('../models/StaffAttendance');

class AbsenceDetectionService {
  /**
   * Check and mark absent users based on work schedules
   */
  static async checkAndMarkAbsentUsers() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get all active users who should be working
      const activeUsers = await User.find({ 
        status: 'active',
        role: { $in: ['doctor', 'nurse', 'receptionist', 'pharmacist'] }
      });

      let absentCount = 0;

      for (const user of activeUsers) {
        // Check if user has attendance record for today
        const existingAttendance = await StaffAttendance.findOne({
          userId: user._id,
          checkInTime: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });

        if (!existingAttendance) {
          // Check if user should be working now
          const workSchedule = this.getWorkSchedule(user.role);
          const currentTime = now.getHours() * 60 + now.getMinutes();
          
          // If it's past their start time and they haven't checked in, mark as absent
          if (currentTime > workSchedule.startTime + 30) { // 30 minutes grace period
            await this.markUserAbsent(user);
            absentCount++;
          }
        }
      }

      console.log(`✅ Absence detection completed. Marked ${absentCount} users as absent`);
      return { absentCount, totalUsers: activeUsers.length };
    } catch (error) {
      console.error('❌ Error in absence detection:', error);
      throw error;
    }
  }

  /**
   * Mark a user as absent for today
   */
  static async markUserAbsent(user) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = new StaffAttendance({
        userId: user._id,
        checkInTime: null,
        checkOutTime: null,
        status: 'checked-out',
        attendanceStatus: 'absent',
        isWithinWorkingHours: false,
        notes: 'Automatically marked as absent by system'
      });

      await attendance.save();
      console.log(`✅ Marked ${user.name} (${user.role}) as absent`);
    } catch (error) {
      console.error(`❌ Error marking ${user.name} as absent:`, error);
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
   * Get absence statistics for a date range
   */
  static async getAbsenceStatistics(startDate, endDate) {
    try {
      const absences = await StaffAttendance.aggregate([
        {
          $match: {
            checkInTime: { $gte: startDate, $lte: endDate },
            attendanceStatus: 'absent'
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
            users: { $push: '$user.name' }
          }
        }
      ]);

      return absences;
    } catch (error) {
      console.error('❌ Error getting absence statistics:', error);
      throw error;
    }
  }

  /**
   * Get user's attendance history
   */
  static async getUserAttendanceHistory(userId, startDate, endDate) {
    try {
      const attendance = await StaffAttendance.find({
        userId: userId,
        checkInTime: { $gte: startDate, $lte: endDate }
      }).sort({ checkInTime: -1 });

      return attendance;
    } catch (error) {
      console.error('❌ Error getting user attendance history:', error);
      throw error;
    }
  }

  /**
   * Update attendance record
   */
  static async updateAttendanceRecord(attendanceId, updates) {
    try {
      const attendance = await StaffAttendance.findByIdAndUpdate(
        attendanceId,
        updates,
        { new: true }
      );

      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      return attendance;
    } catch (error) {
      console.error('❌ Error updating attendance record:', error);
      throw error;
    }
  }
}

module.exports = AbsenceDetectionService;
