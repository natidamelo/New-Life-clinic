const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import services
const QRCodeService = require('./services/qrCodeService');
const User = require('./models/User');

async function testCurrentStatus() {
  try {
    console.log('🔍 Testing Current Status Endpoint');
    console.log('==================================');

    // Find Doctor Natan
    const doctorNatan = await User.findOne({ 
      $or: [
        { firstName: 'Doctor' },
        { firstName: 'Natan' },
        { username: 'doctor123' }
      ]
    }).lean();

    if (!doctorNatan) {
      console.log('❌ Doctor Natan not found in database');
      return;
    }

    console.log('✅ Found Doctor Natan:');
    console.log(`   Name: ${doctorNatan.firstName} ${doctorNatan.lastName}`);
    console.log(`   Role: ${doctorNatan.role}`);
    console.log(`   Email: ${doctorNatan.email}`);
    console.log(`   ID: ${doctorNatan._id}`);

    // Test the current status service directly
    console.log('\n📅 Testing Current Status Service:');
    const currentStatus = await QRCodeService.getCurrentAttendanceStatus(doctorNatan._id);
    
    console.log('✅ Current Status Result:');
    console.log(`   Status: ${currentStatus.status}`);
    console.log(`   Can Check In: ${currentStatus.canCheckIn}`);
    console.log(`   Can Check Out: ${currentStatus.canCheckOut}`);
    console.log(`   Daily Check-ins: ${currentStatus.dailyCheckIns}`);
    console.log(`   Daily Check-outs: ${currentStatus.dailyCheckOuts}`);
    console.log(`   Message: ${currentStatus.message}`);
    console.log(`   Next Action: ${currentStatus.nextAction}`);

    // Test check-in/check-out actions
    console.log('\n🔧 Testing Check-in/Check-out Actions:');
    
    const canCheckIn = await QRCodeService.canPerformAttendanceAction(doctorNatan._id, 'check-in');
    console.log(`   Can Check In: ${canCheckIn.canPerform}`);
    console.log(`   Check-in Message: ${canCheckIn.message}`);
    
    const canCheckOut = await QRCodeService.canPerformAttendanceAction(doctorNatan._id, 'check-out');
    console.log(`   Can Check Out: ${canCheckOut.canPerform}`);
    console.log(`   Check-out Message: ${canCheckOut.message}`);

    console.log('\n🎯 Summary:');
    console.log(`   - Doctor Natan's current status: ${currentStatus.status}`);
    console.log(`   - Can perform actions: Check-in=${currentStatus.canCheckIn}, Check-out=${currentStatus.canCheckOut}`);
    console.log(`   - Daily activity: ${currentStatus.dailyCheckIns} check-ins, ${currentStatus.dailyCheckOuts} check-outs`);
    console.log(`   - System message: ${currentStatus.message}`);

    if (currentStatus.status === 'checked-out' && currentStatus.canCheckIn) {
      console.log('\n✅ Doctor Natan can check in!');
    } else if (currentStatus.status === 'checked-in' && currentStatus.canCheckOut) {
      console.log('\n✅ Doctor Natan can check out!');
    } else {
      console.log('\n⚠️  Doctor Natan cannot perform check-in/check-out actions.');
      console.log(`   Reason: ${currentStatus.message}`);
    }

  } catch (error) {
    console.error('❌ Error testing current status:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testCurrentStatus();
