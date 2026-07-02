const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const StaffAttendance = require('../models/StaffAttendance');
const Timesheet = require('../models/Timesheet');

const getEATDateString = (date) => {
  const eatDate = new Date(new Date(date).getTime() + (3 * 60 * 60 * 1000));
  return `${eatDate.getUTCFullYear()}-${String(eatDate.getUTCMonth() + 1).padStart(2, '0')}-${String(eatDate.getUTCDate()).padStart(2, '0')}`;
};

// @route   GET /api/staff
// @desc    Get all staff
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const staff = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    }).select('-password').lean();
    
    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/overview
// @desc    Get staff overview data
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const allStaff = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    }).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTimesheets = await Timesheet.find({ 
      date: { $gte: today, $lt: tomorrow } 
    }).populate('userId', 'firstName lastName role department');

    const Patient = require('../models/Patient');
    const patientCounts = await Patient.aggregate([
      { $match: { status: { $in: ['Admitted', 'waiting', 'In Consultation'] } } },
      { $group: { _id: '$assignedDoctorId', count: { $sum: 1 } } }
    ]);
    const nurseCounts = await Patient.aggregate([
      { $match: { status: { $in: ['Admitted', 'waiting', 'In Consultation'] }, assignedNurseId: { $ne: null } } },
      { $group: { _id: '$assignedNurseId', count: { $sum: 1 } } }
    ]);
    
    const patientCountMap = {};
    patientCounts.forEach(p => { if (p._id) patientCountMap[p._id.toString()] = p.count; });
    nurseCounts.forEach(p => { if (p._id) patientCountMap[p._id.toString()] = (patientCountMap[p._id.toString()] || 0) + p.count; });

    const deptMap = {};
    allStaff.forEach(staff => {
      const dept = staff.department || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = { 
          name: dept, 
          staffCount: 0, 
          activeCount: 0, 
          busyCount: 0, 
          patientCount: 0, 
          pendingTasks: 0 
        };
      }
      deptMap[dept].staffCount++;

      const hasActiveTimesheet = todayTimesheets.some(ts => 
        ts.userId && ts.userId._id && ts.userId._id.toString() === staff._id.toString() && ts.status === 'active'
      );
      if (hasActiveTimesheet) {
        deptMap[dept].activeCount++;
      }

      const patientsAssigned = patientCountMap[staff._id.toString()] || 0;
      deptMap[dept].patientCount += patientsAssigned;
    });

    const departmentStats = Object.values(deptMap);

    const recentTimesheets = await Timesheet.find()
      .populate('userId', 'firstName lastName role department')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const recentActivity = recentTimesheets.filter(ts => ts.userId && ts.userId._id).map(ts => {
      const isClockOut = ts.status === 'completed';
      const actionTime = isClockOut ? (ts.clockOut?.time || ts.updatedAt) : (ts.clockIn?.time || ts.createdAt);
      return {
        id: ts._id.toString(),
        name: `${ts.userId.firstName} ${ts.userId.lastName}`,
        action: isClockOut ? 'Clocked Out' : 'Clocked In',
        time: actionTime,
        role: ts.userId.role,
        department: ts.userId.department || 'General'
      };
    });

    const presentCount = todayTimesheets.filter(ts => ts.status === 'active' || ts.status === 'completed').length;

    res.json({
      success: true,
      data: {
        totalStaff: allStaff.length,
        onlineStaff: presentCount,
        departmentStats,
        roleStats: {},
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching staff overview:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/attendance-data
// @desc    Get staff attendance data for a specific date and department
// @access  Private
router.get('/attendance-data', auth, async (req, res) => {
  try {
    const { date, department } = req.query;
    
    // Parse the date
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get all staff members
    let staffQuery = { 
      role: { $nin: ['admin'] },
      isActive: true 
    };
    
    if (department && department !== 'all') {
      staffQuery.department = department;
    }

    const allStaff = await User.find(staffQuery).lean();

    // Get attendance data for the specified date from Timesheet collection
    let attendanceQuery = {
      date: { $gte: targetDate, $lt: nextDate }
    };

    const attendanceRecords = await Timesheet.find(attendanceQuery)
      .populate('userId', 'firstName lastName role department')
      .sort({ createdAt: -1 }); // Get most recent first

    // Create attendance data for all staff
    const attendanceData = allStaff.map(staff => {
      // Find all timesheets for this staff member
      const staffTimesheets = attendanceRecords.filter(record => 
        record.userId && record.userId._id && record.userId._id.toString() === staff._id.toString()
      );
      
      if (staffTimesheets.length > 0) {
        // Find regular timesheet (not overtime)
        const regularTimesheet = staffTimesheets.find(ts => !ts.isOvertime);
        // Find overtime timesheet
        const overtimeTimesheet = staffTimesheets.find(ts => ts.isOvertime);
        

        
                // Use regular timesheet for regular clock in/out, overtime timesheet for overtime info
                const primaryTimesheet = regularTimesheet || overtimeTimesheet;
                
                // For regular clock in/out, ONLY use regular timesheet if it exists
                let clockInTime = null;
                let clockOutTime = null;
                let totalWorkHours = 0;
                
                // ALWAYS start with null values for regular times
                // Only populate if there's a regular timesheet (not overtime)
                if (regularTimesheet && !regularTimesheet.isOvertime) {
                  // Use regular timesheet for regular clock times
                  clockInTime = regularTimesheet.clockIn.time ? 
                    regularTimesheet.clockIn.time.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }) : null;

                  clockOutTime = regularTimesheet.clockOut.time ? 
                    regularTimesheet.clockOut.time.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }) : null;

                  // Calculate work hours from regular timesheet
                  totalWorkHours = regularTimesheet.totalWorkHours || 0;
                  if (!regularTimesheet.clockOut.time && regularTimesheet.clockIn.time) {
                    // Staff is still checked in, calculate hours from check-in to current time
                    const currentTime = new Date();
                    const diffMs = currentTime - regularTimesheet.clockIn.time;
                    totalWorkHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
                  }
                }
                // If only overtime timesheet exists, regular times remain null

        // Get overtime specific times
        let overtimeClockInTime = null;
        let overtimeClockOutTime = null;
        let overtimeHours = 0;
        
        if (overtimeTimesheet) {
          overtimeClockInTime = overtimeTimesheet.clockIn.time ? 
            overtimeTimesheet.clockIn.time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : null;
          overtimeClockOutTime = overtimeTimesheet.clockOut.time ? 
            overtimeTimesheet.clockOut.time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : null;
          overtimeHours = overtimeTimesheet.overtimeHours || 0;
        } else if (regularTimesheet && regularTimesheet.overtimeHours > 0) {
          // Regular timesheet with overtime
          overtimeHours = regularTimesheet.overtimeHours;
          overtimeClockInTime = clockInTime; // Use regular clock in as overtime start
          overtimeClockOutTime = clockOutTime; // Use regular clock out as overtime end
        }
        
        // Use the dayAttendanceStatus from the timesheet or determine it
        let dayAttendanceStatus = 'absent';
        let attendanceStatus = 'absent';
        let minutesLate = 0;
        let minutesEarly = 0;
        let ethiopianCheckInTime = null;
        let ethiopianCheckOutTime = null;
        
        if (regularTimesheet && overtimeTimesheet) {
          // Both regular and overtime timesheets exist
          if (overtimeTimesheet.status === 'active') {
            dayAttendanceStatus = 'overtime-checkin';
            attendanceStatus = 'checked-in';
          } else if (overtimeTimesheet.status === 'completed') {
            dayAttendanceStatus = 'overtime-complete';
            attendanceStatus = 'checked-out';
          }
          minutesLate = regularTimesheet.clockIn?.minutesLate || 0;
          minutesEarly = overtimeTimesheet.clockOut?.minutesEarly || regularTimesheet.clockOut?.minutesEarly || 0;
          ethiopianCheckInTime = regularTimesheet.clockIn?.ethiopianTime;
          ethiopianCheckOutTime = overtimeTimesheet.clockOut?.ethiopianTime || regularTimesheet.clockOut?.ethiopianTime;
        } else if (overtimeTimesheet) {
          // If there's an overtime timesheet, use its status
          if (overtimeTimesheet.status === 'active') {
            dayAttendanceStatus = 'overtime-checkin';
            attendanceStatus = 'checked-in';
          } else if (overtimeTimesheet.status === 'completed') {
            dayAttendanceStatus = 'overtime-complete';
            attendanceStatus = 'checked-out';
          }
          minutesLate = overtimeTimesheet.clockIn?.minutesLate || 0;
          minutesEarly = overtimeTimesheet.clockOut?.minutesEarly || 0;
          ethiopianCheckInTime = overtimeTimesheet.clockIn?.ethiopianTime;
          ethiopianCheckOutTime = overtimeTimesheet.clockOut?.ethiopianTime;
        } else if (regularTimesheet) {
          // Use regular timesheet status
          dayAttendanceStatus = regularTimesheet.dayAttendanceStatus || 'present';
          attendanceStatus = regularTimesheet.clockIn?.attendanceStatus || 'checked-in';
          minutesLate = regularTimesheet.clockIn?.minutesLate || 0;
          minutesEarly = regularTimesheet.clockOut?.minutesEarly || 0;
          ethiopianCheckInTime = regularTimesheet.clockIn?.ethiopianTime;
          ethiopianCheckOutTime = regularTimesheet.clockOut?.ethiopianTime;
        }

        return {
          userId: staff._id.toString(),
          userName: `${staff.firstName} ${staff.lastName}`,
          userRole: staff.role,
          department: staff.department || 'General',
          clockInTime,
          clockOutTime,
          attendanceStatus,
          dayAttendanceStatus,
          minutesLate,
          minutesEarly,
          totalWorkHours: totalWorkHours,
          overtimeHours: overtimeHours,
          overtimeClockInTime: overtimeClockInTime,
          overtimeClockOutTime: overtimeClockOutTime,
          ethiopianCheckInTime,
          ethiopianCheckOutTime,
          isOvertime: overtimeTimesheet ? true : (totalWorkHours > 8)
        };
      } else {
        // Staff has no attendance record - mark as absent
        return {
          userId: staff._id.toString(),
          userName: `${staff.firstName} ${staff.lastName}`,
          userRole: staff.role,
          department: staff.department || 'General',
          clockInTime: null,
          clockOutTime: null,
          attendanceStatus: 'absent',
          dayAttendanceStatus: 'absent',
          minutesLate: 0,
          minutesEarly: 0,
          totalWorkHours: 0,
          overtimeHours: 0,
          overtimeClockInTime: null,
          overtimeClockOutTime: null,
          ethiopianCheckInTime: null,
          ethiopianCheckOutTime: null,
          isOvertime: false
        };
      }
    });

    // Calculate summary
    const present = attendanceData.filter(staff => staff.dayAttendanceStatus === 'present').length;
    const absent = attendanceData.filter(staff => staff.dayAttendanceStatus === 'absent').length;
    const overtime = attendanceData.filter(staff => staff.isOvertime).length;
    const averageWorkHours = attendanceData.length > 0 
      ? attendanceData.reduce((sum, staff) => sum + staff.totalWorkHours, 0) / attendanceData.length 
      : 0;

    // Group by department
    const departmentStats = {};
    attendanceData.forEach(staff => {
      const dept = staff.department;
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, present: 0, absent: 0 };
      }
      departmentStats[dept].total++;
      if (staff.dayAttendanceStatus === 'present') {
        departmentStats[dept].present++;
      } else if (staff.dayAttendanceStatus === 'absent') {
        departmentStats[dept].absent++;
      }
    });

    const summary = {
      total: attendanceData.length,
      present,
      absent,
      late: 0, // Calculate based on expected start times
      overtime,
      averageWorkHours,
      departments: departmentStats
    };

    res.json({
      success: true,
      attendanceData,
      summary
    });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/monthly-attendance
// @desc    Get staff attendance data for an entire month
// @access  Private
router.get('/monthly-attendance', auth, async (req, res) => {
  try {
    const { year, month, department } = req.query;
    
    // Parse year and month, default to current month if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // month is 0-indexed in JS
    
    // Create date range for the entire month
    const startDate = new Date(targetYear, targetMonth, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetYear, targetMonth + 1, 1);
    endDate.setHours(0, 0, 0, 0);

    // Get all staff members
    let staffQuery = { 
      role: { $nin: ['admin'] },
      isActive: true 
    };
    
    if (department && department !== 'all') {
      staffQuery.department = department;
    }

    const allStaff = await User.find(staffQuery).lean();

    // Get all timesheet records for the entire month
    const timesheetQuery = {
      date: { $gte: startDate, $lt: endDate }
    };

    const timesheetRecords = await Timesheet.find(timesheetQuery)
      .populate('userId', 'firstName lastName role department')
      .sort({ date: 1, createdAt: 1 });

    // Group timesheet records by user and date
    const attendanceByUserAndDate = {};
    
    timesheetRecords.forEach(record => {
      if (!record.userId || !record.userId._id) return;
      const userId = record.userId._id.toString();
      const dateKey = getEATDateString(record.date);
      
      if (!attendanceByUserAndDate[userId]) {
        attendanceByUserAndDate[userId] = {};
      }
      
      if (!attendanceByUserAndDate[userId][dateKey]) {
        attendanceByUserAndDate[userId][dateKey] = {
          regular: null,
          overtime: null
        };
      }
      
      if (record.isOvertime) {
        attendanceByUserAndDate[userId][dateKey].overtime = record;
      } else {
        attendanceByUserAndDate[userId][dateKey].regular = record;
      }
    });

    // Create monthly attendance data for all staff
    const monthlyAttendanceData = allStaff.map(staff => {
      const staffId = staff._id.toString();
      const staffAttendance = attendanceByUserAndDate[staffId] || {};
      
      // Generate daily attendance for each day of the month
      const dailyAttendance = {};
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(targetYear, targetMonth, day);
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const isWeekend = currentDate.getDay() === 0; // Only Sunday is weekend - Saturday is a working day
        const isFuture = currentDate > new Date();
        
        if (isWeekend) {
          dailyAttendance[dateKey] = {
            status: 'weekend',
            clockInTime: null,
            clockOutTime: null,
            workHours: 0,
            overtimeHours: 0,
            isOvertime: false
          };
        } else if (isFuture) {
          dailyAttendance[dateKey] = {
            status: 'future',
            clockInTime: null,
            clockOutTime: null,
            workHours: 0,
            overtimeHours: 0,
            isOvertime: false
          };
        } else {
          const dayData = staffAttendance[dateKey];
          
          if (dayData && (dayData.regular || dayData.overtime)) {
            // Staff has attendance record for this day
            const regular = dayData.regular;
            const overtime = dayData.overtime;
            
            let status = 'absent';
            let clockInTime = null;
            let clockOutTime = null;
            let workHours = 0;
            let overtimeHours = 0;
            let isOvertime = false;
            
            if (regular && overtime) {
              // Both regular and overtime timesheets exist
              if (overtime.status === 'active') {
                status = 'overtime-checkin';
              } else if (overtime.status === 'completed') {
                status = 'overtime-complete';
              } else {
                status = regular.dayAttendanceStatus || 'present';
              }
              
              clockInTime = regular.clockIn?.time ? 
                regular.clockIn.time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }) : null;
                
              clockOutTime = overtime.clockOut?.time ? 
                overtime.clockOut.time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }) : (regular.clockOut?.time ? 
                  regular.clockOut.time.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  }) : null);
                  
              workHours = (regular.totalWorkHours || 0) + (overtime.totalWorkHours || 0);
              overtimeHours = (overtime.overtimeHours || 0) + (regular.overtimeHours || 0);
              isOvertime = true;
            } else if (overtime) {
              // Overtime timesheet exists
              if (overtime.status === 'active') {
                status = 'overtime-checkin';
              } else if (overtime.status === 'completed') {
                status = 'overtime-complete';
              }
              
              clockInTime = overtime.clockIn?.time ? 
                overtime.clockIn.time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }) : null;
              clockOutTime = overtime.clockOut?.time ? 
                overtime.clockOut.time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }) : null;
              workHours = overtime.totalWorkHours || 0;
              overtimeHours = overtime.overtimeHours || 0;
              isOvertime = true;
            } else if (regular) {
              // Regular timesheet exists
              status = regular.dayAttendanceStatus || 'present';
              clockInTime = regular.clockIn?.time ? 
                regular.clockIn.time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }) : null;
              clockOutTime = regular.clockOut?.time ? 
                regular.clockOut.time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }) : null;
              workHours = regular.totalWorkHours || 0;
              overtimeHours = regular.overtimeHours || 0;
              isOvertime = workHours > 8;
            }
            
            dailyAttendance[dateKey] = {
              status,
              clockInTime,
              clockOutTime,
              workHours,
              overtimeHours,
              isOvertime
            };
          } else {
            // No attendance record for this day - mark as absent (not no-data)
            dailyAttendance[dateKey] = {
              status: 'absent',
              clockInTime: null,
              clockOutTime: null,
              workHours: 0,
              overtimeHours: 0,
              isOvertime: false
            };
          }
        }
      }
      
      return {
        userId: staff._id.toString(),
        userName: `${staff.firstName} ${staff.lastName}`,
        userRole: staff.role,
        department: staff.department || 'General',
        dailyAttendance
      };
    });

    // Calculate monthly summary
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalOvertime = 0;
    let totalWorkHours = 0;
    let totalDays = 0;
    
    monthlyAttendanceData.forEach(staff => {
      Object.values(staff.dailyAttendance).forEach(day => {
        if (day.status !== 'weekend' && day.status !== 'future') {
          totalDays++;
          if (day.status === 'present' || day.status === 'late' || day.status === 'partial' || day.status === 'early-clock-out' || day.status === 'overtime-checkin' || day.status === 'overtime-complete') {
            totalPresent++;
          } else if (day.status === 'absent') {
            totalAbsent++;
          }
          if (day.isOvertime || day.status === 'overtime-checkin' || day.status === 'overtime-complete') {
            totalOvertime++;
          }
          totalWorkHours += day.workHours || 0;
        }
      });
    });

    const summary = {
      totalStaff: allStaff.length,
      totalPresent,
      totalAbsent,
      totalOvertime,
      averageWorkHours: totalDays > 0 ? totalWorkHours / totalDays : 0,
      month: targetMonth + 1,
      year: targetYear
    };

    res.json({
      success: true,
      monthlyAttendanceData,
      summary
    });
  } catch (error) {
    console.error('Error fetching monthly attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/staff
// @desc    Create new staff
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'staff created successfully'
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/members
// @desc    Get staff members with pagination and filters
// @access  Private
router.get('/members', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, department, search } = req.query;
    
    // Build query
    let query = { 
      role: { $nin: ['admin'] },
      isActive: true 
    };
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (department && department !== 'all') {
      query.department = department;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const totalItems = await User.countDocuments(query);
    
    // Get staff members
    const staffMembers = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    // Get today's timesheets for status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayTimesheets = await Timesheet.find({ date: { $gte: today, $lt: tomorrow } }).lean();

    // Get patient counts
    const Patient = require('../models/Patient');
    const patientCounts = await Patient.aggregate([
      { $match: { status: { $in: ['Admitted', 'waiting', 'In Consultation'] } } },
      { $group: { _id: '$assignedDoctorId', count: { $sum: 1 } } }
    ]);
    const nurseCounts = await Patient.aggregate([
      { $match: { status: { $in: ['Admitted', 'waiting', 'In Consultation'] }, assignedNurseId: { $ne: null } } },
      { $group: { _id: '$assignedNurseId', count: { $sum: 1 } } }
    ]);
    const patientCountMap = {};
    patientCounts.forEach(p => { if (p._id) patientCountMap[p._id.toString()] = p.count; });
    nurseCounts.forEach(p => { if (p._id) patientCountMap[p._id.toString()] = (patientCountMap[p._id.toString()] || 0) + p.count; });

    // Transform data to match expected format
    const transformedMembers = staffMembers.map(staff => ({
      id: staff._id.toString(),
      name: `${staff.firstName} ${staff.lastName}`,
      role: staff.role,
      department: staff.department || 'General',
      specialization: staff.specialization || '',
      status: todayTimesheets.some(ts => ts.userId && ts.userId.toString() === staff._id.toString() && ts.status === 'active') 
        ? 'online' 
        : todayTimesheets.some(ts => ts.userId && ts.userId.toString() === staff._id.toString()) 
          ? 'away' 
          : 'offline',
      email: staff.email,
      assignedPatients: patientCountMap[staff._id.toString()] || 0,
      lastActive: staff.lastLogin || staff.updatedAt
    }));

    res.json({
      success: true,
      data: {
        members: transformedMembers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalItems / parseInt(limit)),
          totalItems,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/patient-assignments/stats
// @desc    Get patient assignment statistics
// @access  Private
router.get('/patient-assignments/stats', auth, async (req, res) => {
  try {
    // Get all staff members who can be assigned patients (doctors and nurses)
    const staffMembers = await User.find({ 
      role: { $in: ['doctor', 'nurse'] },
      isActive: true 
    }).lean();

    // For now, we'll return basic stats since patient assignment data might not exist yet
    const stats = {
      totalStaff: staffMembers.length,
      totalAssignedPatients: 0, // This would be calculated from patient data
      unassignedPatients: 0, // This would be calculated from patient data
      departmentStats: {
        'General': {
          assigned: 0, // This would be calculated from patient data
          total: staffMembers.length,
          capacity: staffMembers.length > 0 ? Math.round((0 / (staffMembers.length * 10)) * 100) : 0 // Assuming 10 patients per staff member
        }
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/patient-assignments/available-staff
// @desc    Get available staff for patient assignments
// @access  Private
router.get('/patient-assignments/available-staff', auth, async (req, res) => {
  try {
    const { role, department } = req.query;
    
    // Build query for staff members who can be assigned patients
    let query = { 
      role: { $in: ['doctor', 'nurse'] },
      isActive: true 
    };
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (department && department !== 'all') {
      query.department = department;
    }

    const staffMembers = await User.find(query).select('-password').lean();
    
    // Get today's timesheets for status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayTimesheets = await Timesheet.find({ date: { $gte: today, $lt: tomorrow } }).lean();

    // Get patient counts
    const Patient = require('../models/Patient');
    const patientCounts = await Patient.aggregate([
      { $match: { status: { $in: ['Admitted', 'waiting', 'In Consultation'] } } },
      { $group: { _id: '$assignedDoctorId', count: { $sum: 1 } } }
    ]);
    const nurseCounts = await Patient.aggregate([
      { $match: { status: { $in: ['Admitted', 'waiting', 'In Consultation'] }, assignedNurseId: { $ne: null } } },
      { $group: { _id: '$assignedNurseId', count: { $sum: 1 } } }
    ]);
    const patientCountMap = {};
    patientCounts.forEach(p => { if (p._id) patientCountMap[p._id.toString()] = p.count; });
    nurseCounts.forEach(p => { if (p._id) patientCountMap[p._id.toString()] = (patientCountMap[p._id.toString()] || 0) + p.count; });

    // Transform to match expected format
    const availableStaff = staffMembers.map(staff => {
      const assignedPatients = patientCountMap[staff._id.toString()] || 0;
      return {
        id: staff._id.toString(),
        name: `${staff.firstName} ${staff.lastName}`,
        role: staff.role, // Keep lowercase as stored in database
        department: staff.department || 'General',
        specialization: staff.specialization || '',
        email: staff.email,
        assignedPatients,
        available: assignedPatients < 10, // Max 10 patients per staff member
        status: todayTimesheets.some(ts => ts.userId && ts.userId.toString() === staff._id.toString() && ts.status === 'active') 
          ? 'online' 
          : todayTimesheets.some(ts => ts.userId && ts.userId.toString() === staff._id.toString()) 
            ? 'away' 
            : 'offline'
      };
    });

    res.json({
      success: true,
      data: availableStaff
    });
  } catch (error) {
    console.error('Error fetching available staff:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/staff/patient-assignments/assign
// @desc    Assign patient to staff member
// @access  Private
router.post('/patient-assignments/assign', auth, async (req, res) => {
  try {
    const { patientId, staffId, assignmentType } = req.body;
    
    // Validate input
    if (!patientId || !staffId || !assignmentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, staffId, assignmentType'
      });
    }
    
    // Check if staff member exists
    const staffMember = await User.findById(staffId);
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    // Update the patient record with the assignment
    const Patient = require('../models/Patient');
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Function to check if patient has valid card payment
    const checkCardPaymentStatus = async (patientId) => {
      try {
        const PatientCard = require('../models/PatientCard');
        const card = await PatientCard.findOne({ patient: patientId });

        if (!card) {
          return { hasValidCard: false, card };
        }

        // Check if card is active and has been paid for
        const isValid = card.status === 'Active' && card.amountPaid > 0 && card.lastPaymentDate;
        return { hasValidCard: isValid, card };
      } catch (error) {
        console.error('❌ [Staff Assignment] Error checking card payment status:', error);
        return { hasValidCard: false, card: null };
      }
    };

    // Update patient assignment based on assignment type
    if (assignmentType === 'doctor') {
      patient.assignedDoctorId = staffId;
    } else if (assignmentType === 'nurse') {
      patient.assignedNurseId = staffId;
    }

    // Check card payment before setting to Admitted
    const cardCheck = await checkCardPaymentStatus(patientId);

    if (!cardCheck.hasValidCard) {
      // Patient doesn't have valid card payment - keep them in waiting status
      console.log('⏳ [Staff Assignment] Patient has no valid card payment - keeping in waiting status');
      patient.status = 'waiting';

      // Create notification for reception about card payment requirement
      const Notification = require('../models/Notification');
      await new Notification({
        title: 'Card Payment Required',
        message: `Patient ${patient.firstName} ${patient.lastName} needs card payment before medical staff assignment`,
        type: 'card_payment_required',
        priority: 'high',
        recipient: 'reception',
        senderId: req.user._id.toString(),
        senderRole: req.user.role,
        recipientRole: 'reception',
        data: {
          patientId: patient._id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          requiredAction: 'card_payment'
        },
        createdBy: req.user._id
      }).save();

      await patient.save();
      return res.status(402).json({
        success: false,
        message: 'Patient needs valid card payment before medical staff assignment',
        requiresCardPayment: true
      });
    }

    // Patient has valid card payment - set to Admitted status
    if (patient.status !== 'Admitted') {
      patient.status = 'Admitted';
    }
    
    await patient.save();
    
    console.log('🔍 [STAFF ASSIGNMENT DEBUG] Patient assignment via staff endpoint:');
    console.log('   - Patient ID:', patientId);
    console.log('   - Staff ID:', staffId);
    console.log('   - Assignment Type:', assignmentType);
    console.log('   - Patient Name:', `${patient.firstName} ${patient.lastName}`);
    console.log('   - Assigned Doctor ID:', patient.assignedDoctorId);
    console.log('   - Assigned Nurse ID:', patient.assignedNurseId);
    
    // Send Telegram notification if patient was assigned to a doctor
    try {
      const telegramService = require('../services/telegramService');
      await telegramService.initialize(); // Ensure Telegram service is initialized

      if (telegramService.isBotInitialized() && assignmentType === 'doctor' && patient.assignedDoctorId) {
        console.log('✅ [STAFF ASSIGNMENT DEBUG] Sending Telegram notification for doctor assignment');

        // Check if the assigned doctor has Telegram notifications enabled
        const assignedDoctor = await User.findById(patient.assignedDoctorId);

        console.log('🔍 [STAFF ASSIGNMENT DEBUG] Assigned doctor check:');
        console.log('   - Doctor found:', !!assignedDoctor);
        console.log('   - Doctor telegram enabled:', assignedDoctor?.telegramNotificationsEnabled);
        console.log('   - Doctor chat ID:', assignedDoctor?.telegramChatId);

        if (assignedDoctor && assignedDoctor.telegramNotificationsEnabled && assignedDoctor.telegramChatId) {
          console.log('✅ [STAFF ASSIGNMENT DEBUG] All conditions met - sending notification');

          // Send personalized notification to the assigned doctor
          const doctorNotification = await telegramService.sendPatientAssignmentNotification(
            patient.toObject(),
            assignedDoctor
          );

          if (doctorNotification.success) {
            console.log(`📱 Telegram notification sent to Dr. ${assignedDoctor.firstName} ${assignedDoctor.lastName} for patient assignment`);
          } else {
            console.log('❌ [STAFF ASSIGNMENT DEBUG] Notification failed:', doctorNotification.message);
          }
        } else {
          console.log('❌ [STAFF ASSIGNMENT DEBUG] Doctor notification conditions not met');
        }
      } else {
        console.log('❌ [STAFF ASSIGNMENT DEBUG] Telegram bot not initialized or not a doctor assignment');
      }
    } catch (telegramError) {
      console.error('❌ Error sending Telegram notification for patient assignment:', telegramError);
      // Don't fail patient assignment if Telegram notification fails
    }
    
    res.json({
      success: true,
      message: `Patient assigned to ${staffMember.firstName} ${staffMember.lastName}`,
      data: {
        patientId,
        staffId,
        assignmentType,
        assignedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error assigning patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/staff/patient-assignments/remove
// @desc    Remove patient assignment
// @access  Private
router.post('/patient-assignments/remove', auth, async (req, res) => {
  try {
    const { patientId, assignmentType } = req.body;
    if (!patientId || !assignmentType) {
      return res.status(400).json({ success: false, message: 'Missing required fields: patientId, assignmentType' });
    }
    const Patient = require('../models/Patient');
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    if (assignmentType === 'doctor') {
      patient.assignedDoctorId = null;
    } else if (assignmentType === 'nurse') {
      patient.assignedNurseId = null;
    }
    await patient.save();
    res.json({ success: true, message: 'Patient assignment removed successfully', data: { patientId, assignmentType, removedAt: new Date() } });
  } catch (error) {
    console.error('Error removing patient assignment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/staff/patient-assignments/rebalance
// @desc    Rebalance patient assignments
// @access  Private
router.post('/patient-assignments/rebalance', auth, async (req, res) => {
  try {
    // Get all available staff members
    const staffMembers = await User.find({ 
      role: { $in: ['doctor', 'nurse'] },
      isActive: true 
    }).lean();
    
    // For now, return basic rebalance info
    // In a real implementation, you would redistribute unassigned patients
    
    res.json({
      success: true,
      message: 'Patient assignments rebalanced successfully',
      data: {
        assignmentsMade: 0,
        assignmentResults: [],
        rebalancedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error rebalancing assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/member/:id
// @desc    Get specific staff member details
// @access  Private
router.get('/member/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const staffMember = await User.findById(id).select('-password');
    
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Query today's Timesheet for status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const userTimesheet = await Timesheet.findOne({ userId: staffMember._id, date: { $gte: today, $lt: tomorrow } }).lean();

    // Query Patient collection for assigned patients
    const Patient = require('../models/Patient');
    const assignedPatientsCount = await Patient.countDocuments({
      $or: [
        { assignedDoctorId: staffMember._id },
        { assignedNurseId: staffMember._id }
      ],
      status: { $in: ['Admitted', 'waiting', 'In Consultation'] }
    });

    const transformedMember = {
      id: staffMember._id.toString(),
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      role: staffMember.role,
      department: staffMember.department || 'General',
      specialization: staffMember.specialization || '',
      status: userTimesheet ? (userTimesheet.status === 'active' ? 'online' : 'away') : 'offline',
      email: staffMember.email,
      phone: staffMember.phone || '',
      assignedPatients: assignedPatientsCount,
      lastActive: staffMember.lastLogin || staffMember.updatedAt,
      joinDate: staffMember.createdAt.toISOString().split('T')[0],
      qualifications: [],
      experience: ''
    };

    res.json({
      success: true,
      data: transformedMember
    });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/departments
// @desc    Get all departments
// @access  Private
router.get('/departments', auth, async (req, res) => {
  try {
    // Get all staff members
    const allStaff = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    }).lean();

    // Group by department
    const departmentStats = {};
    allStaff.forEach(staff => {
      const dept = staff.department || 'General';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          total: 0,
          active: 0,
          busy: 0,
          patientCount: 0
        };
      }
      departmentStats[dept].total++;
      departmentStats[dept].active++; // Assume all active staff are active
    });

    // Convert to array format
    const departments = Object.keys(departmentStats).map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      staffCount: departmentStats[name].total,
      activeCount: departmentStats[name].active,
      busyCount: departmentStats[name].busy,
      patientCount: departmentStats[name].patientCount
    }));

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/timesheets
// @desc    Get staff timesheets with pagination
// @access  Private
router.get('/timesheets', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, startDate, endDate } = req.query;
    
    // Build query
    let query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const totalItems = await Timesheet.countDocuments(query);
    
    // Get timesheets
    const timesheets = await Timesheet.find(query)
      .populate('userId', 'firstName lastName role department email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1, createdAt: -1 });

    // Transform data to match expected format
    const transformedTimesheets = timesheets.map(timesheet => ({
      id: timesheet._id.toString(),
      userId: timesheet.userId ? timesheet.userId._id.toString() : 'deleted',
      userName: timesheet.userId ? `${timesheet.userId.firstName} ${timesheet.userId.lastName}` : 'Deleted User',
      userRole: timesheet.userId ? timesheet.userId.role : 'unknown',
      userEmail: timesheet.userId ? timesheet.userId.email : '',
      date: timesheet.date.toISOString().split('T')[0],
      clockIn: timesheet.clockIn ? {
        time: timesheet.clockIn.time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        location: timesheet.clockIn.location || 'Main Entrance',
        method: timesheet.clockIn.method || 'system'
      } : null,
      clockOut: timesheet.clockOut ? {
        time: timesheet.clockOut.time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        location: timesheet.clockOut.location || 'Main Entrance',
        method: timesheet.clockOut.method || 'system'
      } : null,
      totalWorkHours: timesheet.totalWorkHours || 0,
      totalBreakHours: 0, // This would need to be calculated
      status: timesheet.status || 'pending',
      department: (timesheet.userId && timesheet.userId.department) || 'General',
      notes: timesheet.notes || '',
      createdAt: timesheet.createdAt,
      updatedAt: timesheet.updatedAt
    }));

    res.json({
      success: true,
      data: {
        timesheets: transformedTimesheets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalItems / parseInt(limit)),
          totalItems,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Keep the existing mock endpoints for now (they might be used elsewhere)
// @route   GET /api/staff/timesheet-analytics
// @desc    Get timesheet analytics
// @access  Private
router.get('/timesheet-analytics', auth, async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    // Build query for Timesheet collection
    let query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get timesheets from Timesheet collection
    const timesheets = await Timesheet.find(query)
      .populate('userId', 'firstName lastName department');

    // Filter by department if specified
    let filteredTimesheets = timesheets;
    if (department && department !== 'all') {
      filteredTimesheets = timesheets.filter(timesheet => 
        timesheet.userId && timesheet.userId.department === department
      );
    }

    // Calculate analytics
    const totalTimesheets = filteredTimesheets.length;
    const completedTimesheets = filteredTimesheets.filter(t => t.status === 'completed').length;
    const activeTimesheets = filteredTimesheets.filter(t => t.status === 'active').length;
    const totalWorkHours = filteredTimesheets.reduce((sum, t) => sum + (t.totalWorkHours || 0), 0);
    const totalOvertimeHours = filteredTimesheets.reduce((sum, t) => sum + (t.overtimeHours || 0), 0);
    const averageWorkHoursPerDay = totalTimesheets > 0 ? totalWorkHours / totalTimesheets : 0;

    // Calculate attendance rate (completed timesheets / total timesheets)
    const attendanceRate = totalTimesheets > 0 ? (completedTimesheets / totalTimesheets) * 100 : 0;

    // Calculate punctuality metrics
    const lateArrivals = filteredTimesheets.filter(t => t.clockIn?.minutesLate > 0).length;
    const earlyDepartures = filteredTimesheets.filter(t => t.clockOut?.minutesEarly > 0).length;
    const perfectAttendance = filteredTimesheets.filter(t => 
      t.status === 'completed' && 
      !t.clockIn?.minutesLate && 
      !t.clockOut?.minutesEarly
    ).length;

    // Group by department
    const departmentStats = {};
    filteredTimesheets.forEach(timesheet => {
      const dept = (timesheet.userId && timesheet.userId.department) || 'General';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          totalTimesheets: 0,
          totalWorkHours: 0,
          totalOvertimeHours: 0,
          activeTimesheets: 0,
          completedTimesheets: 0,
          avgHours: 0
        };
      }
      departmentStats[dept].totalTimesheets++;
      departmentStats[dept].totalWorkHours += timesheet.totalWorkHours || 0;
      departmentStats[dept].totalOvertimeHours += timesheet.overtimeHours || 0;
      
      if (timesheet.status === 'completed') {
        departmentStats[dept].completedTimesheets++;
      } else if (timesheet.status === 'active') {
        departmentStats[dept].activeTimesheets++;
      }
    });

    // Calculate average hours per department
    Object.keys(departmentStats).forEach(dept => {
      const deptData = departmentStats[dept];
      deptData.avgHours = deptData.totalTimesheets > 0 ? deptData.totalWorkHours / deptData.totalTimesheets : 0;
    });

    const analytics = {
      summary: {
        totalTimesheets,
        completedTimesheets,
        activeTimesheets,
        totalWorkHours,
        totalOvertimeHours,
        averageWorkHoursPerDay: Math.round(averageWorkHoursPerDay * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        lateArrivals,
        earlyDepartures,
        perfectAttendance
      },
      departmentStats
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching timesheet analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/staff/:id/attendance-overlay
// @desc    Update attendance overlay setting for a staff member
// @access  Private
router.put('/:id/attendance-overlay', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { attendanceOverlayEnabled } = req.body;
    
    // Update the user's attendance overlay setting
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { attendanceOverlayEnabled },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Attendance overlay setting updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating attendance overlay setting:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/export-timesheets
// @desc    Export timesheets data
// @access  Private
router.get('/export-timesheets', auth, async (req, res) => {
  try {
    const { startDate, endDate, department, status } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const timesheets = await Timesheet.find(query)
      .populate('userId', 'firstName lastName role department email')
      .sort({ date: -1 });
    
    let filtered = timesheets;
    if (department && department !== 'all') {
      filtered = filtered.filter(t => t.userId && t.userId.department === department);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }
    
    // Build CSV
    const headers = ['Employee','Role','Department','Date','Clock In','Clock Out','Total Hours','Overtime Hours','Status'];
    const rows = [headers.join(',')];
    filtered.forEach(ts => {
      if (!ts.userId) return;
      const name = `${ts.userId.firstName} ${ts.userId.lastName}`;
      const date = ts.date ? new Date(ts.date).toISOString().split('T')[0] : '';
      const clockIn = ts.clockIn?.time ? new Date(ts.clockIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
      const clockOut = ts.clockOut?.time ? new Date(ts.clockOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
      const totalHours = (ts.totalWorkHours || 0).toFixed(2);
      const overtimeHours = (ts.overtimeHours || 0).toFixed(2);
      const vals = [name, ts.userId.role, ts.userId.department || 'General', date, clockIn, clockOut, totalHours, overtimeHours, ts.status || 'pending'];
      rows.push(vals.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    });
    
    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="timesheets_${startDate || 'all'}_to_${endDate || 'all'}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting timesheets:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/staff/telegram-settings
// @desc    Update staff member's own Telegram settings
// @access  Private (Staff can update their own settings)
router.put('/telegram-settings', auth, async (req, res) => {
  try {
    const { telegramChatId, telegramNotificationsEnabled, telegramUsername } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (telegramChatId && typeof telegramChatId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Telegram Chat ID must be a string'
      });
    }

    if (telegramNotificationsEnabled !== undefined && typeof telegramNotificationsEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Telegram notifications enabled must be a boolean'
      });
    }

    // Update the user's Telegram settings
    const updateData = {};
    if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId;
    if (telegramNotificationsEnabled !== undefined) updateData.telegramNotificationsEnabled = telegramNotificationsEnabled;
    if (telegramUsername !== undefined) updateData.telegramUsername = telegramUsername;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`📱 Staff member ${updatedUser.firstName} ${updatedUser.lastName} updated their Telegram settings`);
    console.log(`   - Chat ID: ${updatedUser.telegramChatId || 'Not set'}`);
    console.log(`   - Notifications Enabled: ${updatedUser.telegramNotificationsEnabled}`);
    console.log(`   - Username: ${updatedUser.telegramUsername || 'Not set'}`);

    res.json({
      success: true,
      message: 'Telegram settings updated successfully',
      data: {
        telegramChatId: updatedUser.telegramChatId,
        telegramNotificationsEnabled: updatedUser.telegramNotificationsEnabled,
        telegramUsername: updatedUser.telegramUsername
      }
    });
  } catch (error) {
    console.error('Error updating Telegram settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/telegram-settings
// @desc    Get staff member's own Telegram settings
// @access  Private (Staff can view their own settings)
router.get('/telegram-settings', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('telegramChatId telegramNotificationsEnabled telegramUsername firstName lastName');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        telegramChatId: user.telegramChatId,
        telegramNotificationsEnabled: user.telegramNotificationsEnabled,
        telegramUsername: user.telegramUsername,
        name: `${user.firstName} ${user.lastName}`
      }
    });
  } catch (error) {
    console.error('Error fetching Telegram settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/staff/clock-in
// @desc    Clock in for the authenticated user ONLY (prevents clocking in for other staff)
// @access  Private
router.post('/clock-in', auth, async (req, res) => {
  try {
    const { location = 'Main Office', method = 'system', notes } = req.body;
    
    // SECURITY: Always use the authenticated user's ID from the token
    // This prevents one staff member from clocking in for another
    const userId = req.user._id || req.user.userId;
    
    // DEVICE VALIDATION: Check if device is registered to this user
    const DeviceRegistration = require('../models/DeviceRegistration');
    const crypto = require('crypto');
    
    // Generate device fingerprint from request headers
    const userAgent = req.headers['user-agent'] || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || 'unknown';
    const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
    
    const deviceFingerprint = crypto.createHash('sha256')
      .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
      .digest('hex');
    
    // Check if this device is registered to the current user
    const deviceRegistration = await DeviceRegistration.findOne({
      userId: userId,
      deviceFingerprint: deviceFingerprint,
      isActive: true
    });
    
    if (!deviceRegistration) {
      console.log(`❌ Clock-in blocked - Unregistered device attempting to clock in for user: ${userId}`);
      console.log(`   Device fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
      return res.status(403).json({ 
        success: false,
        error: 'Device not registered. Please register your device first using the QR code registration system.',
        code: 'DEVICE_NOT_REGISTERED'
      });
    }
    
    // Update device last used time
    deviceRegistration.lastUsed = new Date();
    await deviceRegistration.save();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already clocked in today
    const Timesheet = require('../models/Timesheet');
    const existingTimesheet = await Timesheet.findOne({
      userId: userId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingTimesheet) {
      return res.status(400).json({ 
        success: false,
        error: 'Already clocked in today' 
      });
    }

    // Get user's department
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const department = user.role === 'doctor' ? 'OPD' : 
                      user.role === 'nurse' ? 'Ward' : 
                      user.role === 'lab' ? 'Laboratory' : 
                      user.role === 'reception' ? 'Reception' : 'General';

    const timesheet = new Timesheet({
      userId: userId,
      date: new Date(),
      clockIn: {
        time: new Date(),
        location,
        method
      },
      department,
      notes
    });

    await timesheet.save();

    // Send Telegram notification for check-in
    try {
      const notificationService = require('../services/notificationService');
      
      await notificationService.sendNotification(
        'attendanceUpdate',
        {
          actionType: 'check-in',
          staffName: `${user.firstName} ${user.lastName}`,
          location: location || 'Main Office',
          shiftType: 'REGULAR',
          attendanceStatus: 'on-time'
        }
      );
      
      console.log(`✅ [CLOCK-IN] Telegram notification sent for ${user.firstName} ${user.lastName}`);
    } catch (notificationError) {
      console.error(`⚠️ [CLOCK-IN] Error sending Telegram notification:`, notificationError);
      // Don't fail clock-in if notification fails
    }

    console.log(`✅ Clock-in successful for user: ${user.firstName} ${user.lastName} (${userId})`);
    console.log(`   Device: Registered and verified`);

    res.json({
      success: true,
      message: 'Successfully clocked in',
      timesheet
    });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clock in' 
    });
  }
});

// @route   POST /api/staff/clock-out
// @desc    Clock out for the authenticated user ONLY (prevents clocking out for other staff)
// @access  Private
router.post('/clock-out', auth, async (req, res) => {
  try {
    const { location = 'Main Office', method = 'system', notes } = req.body;
    
    // SECURITY: Always use the authenticated user's ID from the token
    // This prevents one staff member from clocking out for another
    const userId = req.user._id || req.user.userId;
    
    // DEVICE VALIDATION: Check if device is registered to this user
    const DeviceRegistration = require('../models/DeviceRegistration');
    const crypto = require('crypto');
    
    // Generate device fingerprint from request headers
    const userAgent = req.headers['user-agent'] || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || 'unknown';
    const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
    
    const deviceFingerprint = crypto.createHash('sha256')
      .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
      .digest('hex');
    
    // Check if this device is registered to the current user
    const deviceRegistration = await DeviceRegistration.findOne({
      userId: userId,
      deviceFingerprint: deviceFingerprint,
      isActive: true
    });
    
    if (!deviceRegistration) {
      console.log(`❌ Clock-out blocked - Unregistered device attempting to clock out for user: ${userId}`);
      console.log(`   Device fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
      return res.status(403).json({ 
        success: false,
        error: 'Device not registered. Please register your device first using the QR code registration system.',
        code: 'DEVICE_NOT_REGISTERED'
      });
    }
    
    // Update device last used time
    deviceRegistration.lastUsed = new Date();
    await deviceRegistration.save();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const Timesheet = require('../models/Timesheet');
    const timesheet = await Timesheet.findOne({
      userId: userId,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'active'
    });

    if (!timesheet) {
      return res.status(400).json({ 
        success: false,
        error: 'No active timesheet found for today' 
      });
    }

    if (timesheet.clockOut && timesheet.clockOut.time) {
      return res.status(400).json({ 
        success: false,
        error: 'Already clocked out today' 
      });
    }

    timesheet.clockOut = {
      time: new Date(),
      location,
      method
    };
    
    if (notes) {
      timesheet.notes = timesheet.notes ? `${timesheet.notes}\n${notes}` : notes;
    }

    timesheet.status = 'completed';
    
    // Calculate work hours if the method exists
    if (typeof timesheet.calculateWorkHours === 'function') {
      timesheet.calculateWorkHours();
    }
    
    await timesheet.save();

    const user = await User.findById(userId);
    
    // Send Telegram notification for check-out
    try {
      const notificationService = require('../services/notificationService');
      const totalHours = timesheet.totalWorkHours || 0;
      
      await notificationService.sendNotification(
        'attendanceUpdate',
        {
          actionType: 'check-out',
          staffName: `${user.firstName} ${user.lastName}`,
          location: location || 'Main Office',
          shiftType: 'REGULAR',
          totalHours: totalHours,
          attendanceStatus: 'Normal checkout'
        }
      );
      
      console.log(`✅ [CLOCK-OUT] Telegram notification sent for ${user.firstName} ${user.lastName}`);
    } catch (notificationError) {
      console.error(`⚠️ [CLOCK-OUT] Error sending Telegram notification:`, notificationError);
      // Don't fail clock-out if notification fails
    }

    console.log(`✅ Clock-out successful for user: ${user.firstName} ${user.lastName} (${userId})`);
    console.log(`   Device: Registered and verified`);

    res.json({
      success: true,
      message: 'Successfully clocked out',
      timesheet
    });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clock out' 
    });
  }
});

// @route   PUT /api/staff/timesheets/:id/approve
// @desc    Approve a timesheet
// @access  Private (Admin only)
router.put('/timesheets/:id/approve', auth, async (req, res) => {
  try {
    const Timesheet = require('../models/Timesheet');
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to approve timesheets' });
    }

    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    timesheet.status = 'approved';
    timesheet.approvedBy = req.user.id;
    timesheet.approvedAt = new Date();
    await timesheet.save();

    res.json({
      success: true,
      message: 'Timesheet approved successfully',
      timesheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/staff/timesheets/:id/reject
// @desc    Reject a timesheet
// @access  Private (Admin only)
router.put('/timesheets/:id/reject', auth, async (req, res) => {
  try {
    const Timesheet = require('../models/Timesheet');
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to reject timesheets' });
    }

    const { notes } = req.body;
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    timesheet.status = 'rejected';
    if (notes) {
      timesheet.notes = notes;
    }
    await timesheet.save();

    res.json({
      success: true,
      message: 'Timesheet rejected successfully',
      timesheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
