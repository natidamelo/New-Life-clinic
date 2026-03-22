const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import models and services
const User = require('./models/User');
const QRCodeService = require('./services/qrCodeService');

async function testMahletCheckout() {
  try {
    console.log('🔍 Testing Mahlet Check-in/Check-out Fix');
    console.log('=======================================');

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

    console.log('✅ Found Mahlet:');
    console.log(`   Name: ${mahlet.firstName} ${mahlet.lastName}`);
    console.log(`   Role: ${mahlet.role}`);
    console.log(`   Email: ${mahlet.email}`);

    // Test the daily check-in limits
    const maxDailyCheckIns = QRCodeService.getMaxDailyCheckIns(mahlet.role);
    console.log(`\n📊 Daily Check-in Limits:`);
    console.log(`   Role: ${mahlet.role}`);
    console.log(`   Max Daily Check-ins: ${maxDailyCheckIns}`);

    // Test overtime allowance
    const canHaveOvertime = QRCodeService.isOvertimeAllowed(mahlet._id, 1, 1, { userId: mahlet });
    console.log(`   Can Have Overtime: ${canHaveOvertime ? 'Yes' : 'No'}`);

    // Get current attendance status
    console.log('\n📅 Current Attendance Status:');
    const currentStatus = await QRCodeService.getCurrentAttendanceStatus(mahlet._id);
    
    console.log(`   Status: ${currentStatus.status}`);
    console.log(`   Can Check In: ${currentStatus.canCheckIn}`);
    console.log(`   Can Check Out: ${currentStatus.canCheckOut}`);
    console.log(`   Daily Check-ins: ${currentStatus.dailyCheckIns}`);
    console.log(`   Daily Check-outs: ${currentStatus.dailyCheckOuts}`);
    console.log(`   Message: ${currentStatus.message}`);
    console.log(`   Next Action: ${currentStatus.nextAction}`);

    // Test check-in/check-out actions
    console.log('\n🔧 Testing Check-in/Check-out Actions:');
    
    const canCheckIn = await QRCodeService.canPerformAttendanceAction(mahlet._id, 'check-in');
    console.log(`   Can Check In: ${canCheckIn.canPerform}`);
    console.log(`   Check-in Message: ${canCheckIn.message}`);
    
    const canCheckOut = await QRCodeService.canPerformAttendanceAction(mahlet._id, 'check-out');
    console.log(`   Can Check Out: ${canCheckOut.canPerform}`);
    console.log(`   Check-out Message: ${canCheckOut.message}`);

    console.log('\n🎯 Summary:');
    console.log(`   - Mahlet's role (${mahlet.role}) now has proper daily limits`);
    console.log(`   - Max daily check-ins: ${maxDailyCheckIns}`);
    console.log(`   - Overtime allowed: ${canHaveOvertime}`);
    console.log(`   - Current status: ${currentStatus.status}`);
    console.log(`   - Can perform actions: Check-in=${currentStatus.canCheckIn}, Check-out=${currentStatus.canCheckOut}`);

    if (currentStatus.canCheckIn || currentStatus.canCheckOut) {
      console.log('\n✅ Mahlet can now perform check-in/check-out actions!');
    } else {
      console.log('\n⚠️  Mahlet still cannot perform actions. Check the current status.');
    }

  } catch (error) {
    console.error('❌ Error testing Mahlet checkout:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testMahletCheckout();
