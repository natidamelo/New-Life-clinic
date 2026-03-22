const mongoose = require('mongoose');
const Leave = require('./models/Leave');
const LeaveBalance = require('./models/LeaveBalance');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const verifyLeaveData = async () => {
  try {
    console.log('🔍 Verifying Leave Data in clinic-cms database...\n');
    
    // Check staff members
    const staffMembers = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    });
    console.log(`📋 Staff Members Found: ${staffMembers.length}`);
    staffMembers.forEach(staff => {
      console.log(`   - ${staff.firstName} ${staff.lastName} (${staff.role}) - ${staff.department || 'No department'}`);
    });
    
    console.log('\n📊 Leave Requests:');
    const totalLeaves = await Leave.countDocuments();
    const pendingLeaves = await Leave.countDocuments({ status: { $in: ['pending', 'pending review'] } });
    const approvedLeaves = await Leave.countDocuments({ status: 'approved' });
    const rejectedLeaves = await Leave.countDocuments({ status: 'rejected' });
    
    console.log(`   Total: ${totalLeaves}`);
    console.log(`   Pending: ${pendingLeaves}`);
    console.log(`   Approved: ${approvedLeaves}`);
    console.log(`   Rejected: ${rejectedLeaves}`);
    
    // Show some sample leave requests
    const sampleLeaves = await Leave.find().limit(3).populate('staffId', 'firstName lastName role department');
    console.log('\n📝 Sample Leave Requests:');
    sampleLeaves.forEach(leave => {
      console.log(`   - ${leave.staffId.firstName} ${leave.staffId.lastName} (${leave.leaveType})`);
      console.log(`     Status: ${leave.status}, Days: ${leave.numberOfDays}, Department: ${leave.department}`);
      console.log(`     Reason: ${leave.reason}`);
    });
    
    console.log('\n💰 Leave Balances:');
    const totalBalances = await LeaveBalance.countDocuments();
    console.log(`   Total balances: ${totalBalances}`);
    
    // Show some sample balances
    const sampleBalances = await LeaveBalance.find().limit(3).populate('staffId', 'firstName lastName role');
    console.log('\n📊 Sample Leave Balances:');
    sampleBalances.forEach(balance => {
      console.log(`   - ${balance.staffId.firstName} ${balance.staffId.lastName} (${balance.staffId.role})`);
      console.log(`     Annual: ${balance.leaveTypes.annual.allocated} allocated, ${balance.leaveTypes.annual.used} used`);
      console.log(`     Sick: ${balance.leaveTypes.sick.allocated} allocated, ${balance.leaveTypes.sick.used} used`);
    });
    
    // Check by department
    console.log('\n🏥 Leave Requests by Department:');
    const deptStats = await Leave.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'pending review']] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    deptStats.forEach(dept => {
      console.log(`   ${dept._id}: ${dept.count} total (${dept.pending} pending, ${dept.approved} approved, ${dept.rejected} rejected)`);
    });
    
    console.log('\n✅ Leave data verification completed successfully!');
    console.log('🎉 Your clinic-cms database now contains real leave management data.');
    console.log('\n💡 Next steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Access the frontend: http://localhost:5175/app/staff-control');
    console.log('   3. Navigate to Leave Management to see the real data');
    
  } catch (error) {
    console.error('❌ Error verifying leave data:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the verification
verifyLeaveData();
