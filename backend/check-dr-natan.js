const mongoose = require('mongoose');
require('dotenv').config();

async function checkDrNatan() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check Dr. Natan's Telegram settings
    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      role: String,
      telegramChatId: String,
      telegramNotificationsEnabled: Boolean,
      telegramUsername: String
    }, { collection: 'users' }));

    console.log('🔍 Searching for Dr. Natan...');
    const drNatan = await User.findOne({
      $or: [
        { firstName: 'DR', lastName: 'Natan' },
        { firstName: 'Natan', lastName: 'Kinfe' },
        { email: 'doctor123@clinic.com' }
      ]
    });

    if (drNatan) {
      console.log('✅ Dr. Natan found:', {
        id: drNatan._id,
        name: drNatan.firstName + ' ' + drNatan.lastName,
        email: drNatan.email,
        role: drNatan.role,
        telegramChatId: drNatan.telegramChatId || 'NOT SET',
        telegramNotificationsEnabled: drNatan.telegramNotificationsEnabled || false,
        telegramUsername: drNatan.telegramUsername || 'NOT SET'
      });

      // Check if patient was assigned to Dr. Natan
      console.log('\n🔍 Checking recent patient assignments...');
      const Patient = mongoose.model('Patient', new mongoose.Schema({
        firstName: String,
        lastName: String,
        assignedDoctorId: mongoose.Schema.Types.ObjectId,
        createdAt: Date
      }, { collection: 'patients' }));

      const recentPatients = await Patient.find({}).sort({ createdAt: -1 }).limit(10);

      console.log(`Found ${recentPatients.length} recent patients`);

      for (const patient of recentPatients) {
        if (patient.assignedDoctorId) {
          const assignedDoctor = await User.findById(patient.assignedDoctorId);
          if (assignedDoctor) {
            const isAssignedToDrNatan = assignedDoctor._id.toString() === drNatan._id.toString();
            console.log(`👤 Patient "${patient.firstName} ${patient.lastName}" assigned to "${assignedDoctor.firstName} ${assignedDoctor.lastName}" ${isAssignedToDrNatan ? '🎯 (DR. NATAN!)' : ''}`);
          } else {
            console.log(`👤 Patient "${patient.firstName} ${patient.lastName}" assigned to UNKNOWN DOCTOR (${patient.assignedDoctorId})`);
          }
        } else {
          console.log(`👤 Patient "${patient.firstName} ${patient.lastName}" - NOT ASSIGNED to any doctor`);
        }
      }
    } else {
      console.log('❌ Dr. Natan not found');
      // List all doctors
      const doctors = await User.find({ role: 'doctor' }).limit(10);
      console.log(`Found ${doctors.length} doctors:`);
      doctors.forEach(d => {
        console.log(`  - ${d.firstName} ${d.lastName} (${d.email})`);
      });
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    mongoose.disconnect();
  }
}

checkDrNatan();
