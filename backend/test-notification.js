const mongoose = require('mongoose');
require('dotenv').config();

async function testNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find Dr. Natan
    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      role: String,
      telegramChatId: String,
      telegramNotificationsEnabled: Boolean,
      telegramUsername: String
    }, { collection: 'users' }));

    const drNatan = await User.findOne({
      $or: [
        { firstName: 'DR', lastName: 'Natan' },
        { firstName: 'Natan', lastName: 'Kinfe' },
        { email: 'doctor123@clinic.com' }
      ]
    });

    if (!drNatan) {
      console.log('❌ Dr. Natan not found');
      return;
    }

    console.log('🔍 Dr. Natan settings:');
    console.log('  - Chat ID:', drNatan.telegramChatId);
    console.log('  - Notifications Enabled:', drNatan.telegramNotificationsEnabled);

    // Create a test patient assignment
    const Patient = mongoose.model('Patient', new mongoose.Schema({
      firstName: String,
      lastName: String,
      assignedDoctorId: mongoose.Schema.Types.ObjectId,
      createdAt: Date,
      contactNumber: String,
      age: Number,
      gender: String,
      priority: String,
      status: String
    }, { collection: 'patients' }));

    const testPatient = new Patient({
      firstName: 'Test',
      lastName: 'Patient',
      assignedDoctorId: drNatan._id,
      createdAt: new Date(),
      contactNumber: '0912345678',
      age: 30,
      gender: 'male',
      priority: 'normal',
      status: 'active'
    });

    await testPatient.save();
    console.log('✅ Test patient created and assigned to Dr. Natan');

    // Wait a moment for any async operations
    setTimeout(() => {
      console.log('🔍 Check your Telegram for a notification!');
      mongoose.disconnect();
    }, 2000);

  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

testNotification();
