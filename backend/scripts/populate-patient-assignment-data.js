const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const populatePatientAssignmentData = async () => {
  try {
    console.log('🔍 Connecting to database...');
    
    // Get existing staff members (doctors and nurses only)
    const staffMembers = await User.find({ 
      role: { $in: ['doctor', 'nurse'] },
      isActive: true 
    });
    
    if (staffMembers.length === 0) {
      console.log('❌ No doctors or nurses found. Please create some staff members first.');
      return;
    }
    
    console.log(`📋 Found ${staffMembers.length} staff members (doctors and nurses)`);
    
    // Display staff members
    console.log('\n👥 Available Staff for Patient Assignment:');
    staffMembers.forEach((staff, index) => {
      console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.role}) - ${staff.department || 'General'}`);
    });
    
    // Calculate statistics
    const doctors = staffMembers.filter(staff => staff.role === 'doctor');
    const nurses = staffMembers.filter(staff => staff.role === 'nurse');
    
    console.log('\n📊 Staff Statistics:');
    console.log(`   Total Staff: ${staffMembers.length}`);
    console.log(`   Doctors: ${doctors.length}`);
    console.log(`   Nurses: ${nurses.length}`);
    console.log(`   Total Capacity: ${staffMembers.length * 10} patients (10 per staff member)`);
    
    // Show department breakdown
    const departmentStats = {};
    staffMembers.forEach(staff => {
      const dept = staff.department || 'General';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { doctors: 0, nurses: 0, total: 0 };
      }
      departmentStats[dept].total++;
      if (staff.role === 'doctor') {
        departmentStats[dept].doctors++;
      } else {
        departmentStats[dept].nurses++;
      }
    });
    
    console.log('\n🏥 Department Breakdown:');
    Object.keys(departmentStats).forEach(dept => {
      const stats = departmentStats[dept];
      console.log(`   ${dept}: ${stats.total} total (${stats.doctors} doctors, ${stats.nurses} nurses)`);
    });
    
    console.log('\n✅ Patient assignment data verification completed!');
    console.log('🎉 Your clinic-cms database now has real staff data for patient assignments.');
    console.log('\n💡 Next steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Access the frontend: http://localhost:5175/app/staff-control');
    console.log('   3. Navigate to Patient Assignments tab to see the real data');
    
  } catch (error) {
    console.error('❌ Error verifying patient assignment data:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
populatePatientAssignmentData();
