const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import models
const User = require('./models/User');
const Timesheet = require('./models/Timesheet');

async function testMahletAttendance() {
  try {
    console.log('🔍 Testing Mahlet Attendance Inclusion');
    console.log('=====================================');

    // Find Mahlet in the database
    const mahlet = await User.findOne({ 
      $or: [
        { firstName: 'Mahlet' },
        { username: 'Mahlet' },
        { email: 'mahl@clinic.com' }
      ]
    }).lean();

    if (!mahlet) {
      console.log('❌ Mahlet not found in database');
      return;
    }

    console.log('✅ Found Mahlet in database:');
    console.log(`   Name: ${mahlet.firstName} ${mahlet.lastName}`);
    console.log(`   Role: ${mahlet.role}`);
    console.log(`   Email: ${mahlet.email}`);
    console.log(`   Active: ${mahlet.isActive}`);

    // Check if Mahlet would be included in attendance query
    const allStaff = await User.find({ 
      role: { $in: ['doctor', 'nurse', 'lab', 'reception', 'admin', 'imaging'] },
      isActive: true 
    })
    .select('firstName lastName role email')
    .lean();

    console.log('\n📊 Staff included in attendance query:');
    allStaff.forEach((staff, index) => {
      const isMahlet = staff.firstName === 'Mahlet';
      const marker = isMahlet ? '🎯' : '  ';
      console.log(`${marker} ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.role})`);
    });

    const mahletIncluded = allStaff.some(staff => staff.firstName === 'Mahlet');
    console.log(`\n${mahletIncluded ? '✅' : '❌'} Mahlet is ${mahletIncluded ? 'included' : 'NOT included'} in attendance data`);

    // Test department mapping
    function getDepartmentFromRole(role) {
      switch (role) {
        case 'doctor':
          return 'Doctors/OPD';
        case 'nurse':
          return 'Nurses/Ward';
        case 'lab':
          return 'Laboratory';
        case 'reception':
          return 'Reception';
        case 'imaging':
          return 'Imaging';
        default:
          return 'General';
      }
    }

    const mahletDepartment = getDepartmentFromRole(mahlet.role);
    console.log(`\n🏥 Mahlet's department: ${mahletDepartment}`);

    // Check today's attendance for Mahlet
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mahletTimesheet = await Timesheet.findOne({
      userId: mahlet._id,
      date: { $gte: today, $lt: tomorrow }
    }).lean();

    console.log('\n📅 Mahlet\'s attendance for today:');
    if (mahletTimesheet) {
      console.log('✅ Timesheet found');
      console.log(`   Clock In: ${mahletTimesheet.clockIn?.time || 'Not clocked in'}`);
      console.log(`   Clock Out: ${mahletTimesheet.clockOut?.time || 'Not clocked out'}`);
      console.log(`   Status: ${mahletTimesheet.dayAttendanceStatus || 'No status'}`);
    } else {
      console.log('❌ No timesheet found for today');
    }

    console.log('\n🎯 Summary:');
    console.log(`   - Mahlet found in database: ${mahlet ? 'Yes' : 'No'}`);
    console.log(`   - Mahlet included in attendance query: ${mahletIncluded ? 'Yes' : 'No'}`);
    console.log(`   - Mahlet has department mapping: ${mahletDepartment !== 'General' ? 'Yes' : 'No'}`);
    console.log(`   - Mahlet has today's timesheet: ${mahletTimesheet ? 'Yes' : 'No'}`);

    if (mahletIncluded) {
      console.log('\n✅ Mahlet should now appear in the staff attendance overview!');
    } else {
      console.log('\n❌ Mahlet is still not included. Check the role and active status.');
    }

  } catch (error) {
    console.error('❌ Error testing Mahlet attendance:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testMahletAttendance();
