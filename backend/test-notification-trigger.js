require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function testNotificationTrigger() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      role: String,
      telegramChatId: String,
      telegramNotificationsEnabled: Boolean,
      telegramUsername: String
    }, { collection: 'users' }));

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

    // Find Dr. Natan
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

    // Find an existing patient that doesn't have a doctor assigned
    console.log('🔍 Looking for an existing patient without doctor assignment...');
    const existingPatient = await Patient.findOne({
      assignedDoctorId: { $exists: false }
    });

    if (!existingPatient) {
      console.log('❌ No existing patient found without doctor assignment');
      console.log('📝 Creating a new test patient...');

      const testPatient = new Patient({
        firstName: 'Notification',
        lastName: 'Test',
        assignedDoctorId: null, // Start with no doctor assignment
        createdAt: new Date(),
        contactNumber: '0987654321',
        age: 25,
        gender: 'female',
        priority: 'normal',
        status: 'active'
      });

      await testPatient.save();
      console.log('✅ Test patient created (not assigned to any doctor)');

      // Now simulate the assignment by updating the patient
      console.log('🔄 Simulating patient assignment to Dr. Natan...');
      testPatient.assignedDoctorId = drNatan._id;

      // Save the patient (this should trigger the notification)
      await testPatient.save();
      console.log('✅ Patient assigned to Dr. Natan');
    } else {
      console.log('✅ Found existing patient:', existingPatient.firstName, existingPatient.lastName);

      // Now simulate the assignment by updating the patient
      console.log('🔄 Simulating patient assignment to Dr. Natan...');
      existingPatient.assignedDoctorId = drNatan._id;

      // Save the patient (this should trigger the notification)
      await existingPatient.save();
      console.log('✅ Patient assigned to Dr. Natan');
    }

    // Wait a moment for async operations
    setTimeout(async () => {
      console.log('🔍 Check your Telegram for a notification!');
      console.log('📱 If you received a message, the notification system is working!');

      // Clean up - remove the test patient
      if (existingPatient) {
        await Patient.findByIdAndDelete(existingPatient._id);
        console.log('🗑️ Existing patient cleaned up');
      }

      mongoose.disconnect();
    }, 3000);

  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

testNotificationTrigger();
