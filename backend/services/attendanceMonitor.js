const mongoose = require('mongoose');
const User = require('../models/User');
const StaffAttendance = require('../models/StaffAttendance');

class AttendanceMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start attendance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Attendance monitoring is already running');
      return;
    }

    console.log('🔍 Starting attendance monitoring...');
    this.isMonitoring = true;
    
    // Check attendance every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAttendance();
      } catch (error) {
        console.error('❌ Error in attendance monitoring:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Initial check
    setTimeout(async () => {
      try {
        await this.checkAttendance();
      } catch (error) {
        console.error('❌ Error in initial attendance check:', error);
      }
    }, 1000);
  }

  /**
   * Stop attendance monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Attendance monitoring stopped');
  }

  /**
   * Check attendance for all active users
   */
  async checkAttendance() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get all active users
      const activeUsers = await User.find({ 
        status: 'active',
        role: { $in: ['doctor', 'nurse', 'receptionist', 'pharmacist'] }
      });

      for (const user of activeUsers) {
        // Check if user has attendance record for today
        const existingAttendance = await StaffAttendance.findOne({
          userId: user._id,
          checkInTime: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });

        if (!existingAttendance) {
          // Create attendance record if user is supposed to be working
          const workSchedule = this.getWorkSchedule(user.role);
          const currentTime = now.getHours() * 60 + now.getMinutes();
          
          if (currentTime >= workSchedule.startTime && currentTime <= workSchedule.endTime) {
            await this.createAttendanceRecord(user, 'present');
          }
        }
      }

      console.log(`✅ Attendance check completed for ${activeUsers.length} active users`);
    } catch (error) {
      console.error('❌ Error checking attendance:', error);
    }
  }

  /**
   * Create attendance record
   */
  async createAttendanceRecord(user, status) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = new StaffAttendance({
        userId: user._id,
        checkInTime: status === 'present' ? new Date() : null,
        checkOutTime: null,
        status: status === 'present' ? 'checked-in' : 'checked-out',
        attendanceStatus: status === 'present' ? 'present-on-time' : 'absent',
        isWithinWorkingHours: status === 'present',
        notes: status === 'present' ? 'Automatically marked as present' : 'Automatically marked as absent'
      });

      await attendance.save();
      console.log(`✅ Created attendance record for ${user.name} (${status})`);
    } catch (error) {
      console.error(`❌ Error creating attendance record for ${user.name}:`, error);
    }
  }

  /**
   * Get work schedule based on role
   */
  getWorkSchedule(role) {
    const schedules = {
      doctor: { startTime: 8 * 60, endTime: 17 * 60 }, // 8 AM - 5 PM
      nurse: { startTime: 7 * 60, endTime: 19 * 60 }, // 7 AM - 7 PM
      receptionist: { startTime: 8 * 60, endTime: 18 * 60 }, // 8 AM - 6 PM
      pharmacist: { startTime: 8 * 60, endTime: 18 * 60 } // 8 AM - 6 PM
    };
    
    return schedules[role] || schedules.receptionist;
  }

  /**
   * Mark user as present
   */
  async markPresent(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.createAttendanceRecord(user, 'present');
      return { success: true, message: 'User marked as present' };
    } catch (error) {
      console.error('❌ Error marking user as present:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark user as absent
   */
  async markAbsent(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.createAttendanceRecord(user, 'absent');
      return { success: true, message: 'User marked as absent' };
    } catch (error) {
      console.error('❌ Error marking user as absent:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AttendanceMonitor();
