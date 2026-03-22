const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const populateLeaveData = async () => {
  try {
    console.log('🔍 Connecting to database...');
    
    // Get existing staff members (excluding admins)
    const staffMembers = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    });
    
    if (staffMembers.length === 0) {
      console.log('❌ No staff members found. Please create some staff members first.');
      return;
    }
    
    console.log(`📋 Found ${staffMembers.length} staff members`);
    
    // Clear existing leave data
    await Leave.deleteMany({});
    await LeaveBalance.deleteMany({});
    console.log('🧹 Cleared existing leave data');
    
    const currentYear = new Date().getFullYear();
    
    // Sample leave types and reasons
    const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'other'];
    const reasons = [
      'Family vacation',
      'Medical appointment',
      'Personal emergency',
      'Wedding ceremony',
      'Child birth',
      'Family bereavement',
      'Medical procedure',
      'Conference attendance',
      'Training program',
      'Religious holiday'
    ];
    
    const departments = ['General', 'Nursing', 'Laboratory', 'Imaging', 'Reception', 'Pharmacy'];
    
    // Create sample leave requests
    const leaveRequests = [];
    
    for (let i = 0; i < staffMembers.length; i++) {
      const staff = staffMembers[i];
      
      // Create 2-4 leave requests per staff member
      const numRequests = Math.floor(Math.random() * 3) + 2;
      
      for (let j = 0; j < numRequests; j++) {
        const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 365));
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 1);
        
        const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const statuses = ['pending', 'pending review', 'approved', 'rejected'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const isHalfDay = Math.random() > 0.8; // 20% chance of half day
        const halfDayType = isHalfDay ? (Math.random() > 0.5 ? 'morning' : 'afternoon') : undefined;
        
        const leaveRequest = new Leave({
          staffId: staff._id,
          leaveType,
          startDate,
          endDate,
          numberOfDays: Math.max(1, numberOfDays),
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          status,
          requestedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          department: staff.department || (() => {
            // Map roles to departments
            const roleToDept = {
              'doctor': 'General',
              'nurse': 'Nursing', 
              'lab_technician': 'Laboratory',
              'imaging_specialist': 'Imaging',
              'receptionist': 'Reception',
              'pharmacist': 'Pharmacy'
            };
            return roleToDept[staff.role] || departments[Math.floor(Math.random() * departments.length)];
          })(),
          year: currentYear,
          isHalfDay,
          halfDayType,
          emergencyContact: Math.random() > 0.7 ? {
            name: `Emergency Contact ${j + 1}`,
            phone: `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
            relationship: ['Spouse', 'Parent', 'Sibling', 'Friend'][Math.floor(Math.random() * 4)]
          } : undefined,
          notes: Math.random() > 0.6 ? `Additional notes for ${leaveType} leave request` : undefined
        });
        
        if (status === 'approved') {
          leaveRequest.approvedBy = staffMembers[Math.floor(Math.random() * staffMembers.length)]._id;
          leaveRequest.approvedAt = new Date(leaveRequest.requestedAt.getTime() + 24 * 60 * 60 * 1000);
        } else if (status === 'rejected') {
          leaveRequest.rejectionReason = 'Insufficient staff coverage during requested period';
        }
        
        leaveRequests.push(leaveRequest);
      }
    }
    
    // Save all leave requests
    await Leave.insertMany(leaveRequests);
    console.log(`✅ Created ${leaveRequests.length} leave requests`);
    
    // Create leave balances for all staff members
    const leaveBalances = [];
    
    for (const staff of staffMembers) {
      const leaveBalance = new LeaveBalance({
        staffId: staff._id,
        year: currentYear,
        lastUpdatedBy: staff._id, // Set the staff member as the updater
        leaveTypes: {
          annual: {
            allocated: 21 + Math.floor(Math.random() * 10), // 21-30 days
            used: 0,
            pending: 0
          },
          sick: {
            allocated: 10 + Math.floor(Math.random() * 5), // 10-14 days
            used: 0,
            pending: 0
          },
          personal: {
            allocated: 5 + Math.floor(Math.random() * 3), // 5-7 days
            used: 0,
            pending: 0
          },
          maternity: {
            allocated: 90,
            used: 0,
            pending: 0
          },
          paternity: {
            allocated: 10 + Math.floor(Math.random() * 5), // 10-14 days
            used: 0,
            pending: 0
          },
          bereavement: {
            allocated: 3 + Math.floor(Math.random() * 2), // 3-4 days
            used: 0,
            pending: 0
          },
          other: {
            allocated: 0,
            used: 0,
            pending: 0
          }
        }
      });
      
      leaveBalances.push(leaveBalance);
    }
    
    await LeaveBalance.insertMany(leaveBalances);
    console.log(`✅ Created ${leaveBalances.length} leave balances`);
    
    // Update leave balances with actual usage
    console.log('🔄 Updating leave balances with actual usage...');
    
    for (const staff of staffMembers) {
      const leaveUsage = await Leave.aggregate([
        {
          $match: {
            staffId: staff._id,
            year: currentYear,
            status: { $in: ['approved', 'pending', 'pending review'] }
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
                $cond: [{ $in: ['$status', ['pending', 'pending review']] }, '$numberOfDays', 0]
              }
            }
          }
        }
      ]);
      
      const leaveBalance = await LeaveBalance.findOne({
        staffId: staff._id,
        year: currentYear
      });
      
      if (leaveBalance) {
        leaveUsage.forEach(usage => {
          if (leaveBalance.leaveTypes[usage._id]) {
            leaveBalance.leaveTypes[usage._id].used = usage.used;
            leaveBalance.leaveTypes[usage._id].pending = usage.pending;
          }
        });
        
        await leaveBalance.save();
      }
    }
    
    console.log('✅ Leave balances updated with actual usage');
    
    // Display summary
    const totalLeaves = await Leave.countDocuments();
    const pendingLeaves = await Leave.countDocuments({ status: { $in: ['pending', 'pending review'] } });
    const approvedLeaves = await Leave.countDocuments({ status: 'approved' });
    const rejectedLeaves = await Leave.countDocuments({ status: 'rejected' });
    
    console.log('\n📊 Leave Data Summary:');
    console.log(`Total leave requests: ${totalLeaves}`);
    console.log(`Pending: ${pendingLeaves}`);
    console.log(`Approved: ${approvedLeaves}`);
    console.log(`Rejected: ${rejectedLeaves}`);
    console.log(`Staff members with leave balances: ${leaveBalances.length}`);
    
    console.log('\n🎉 Leave data population completed successfully!');
    console.log('You can now test the leave management system with real data.');
    
  } catch (error) {
    console.error('❌ Error populating leave data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
populateLeaveData();
