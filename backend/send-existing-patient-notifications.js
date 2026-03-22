const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const User = require('./models/User');
const telegramService = require('./services/telegramService');

async function sendNotificationsForAssignedPatients() {
  try {
    console.log('🔄 Starting notification process for assigned patients...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Initialize Telegram service
    const telegramInitialized = await telegramService.initialize();
    if (!telegramInitialized) {
      console.log('❌ Telegram service not configured. Please check your bot token in .env file');
      return;
    }

    // Find all patients that have assigned doctors
    const patientsWithDoctors = await Patient.find({
      assignedDoctorId: { $exists: true, $ne: null },
      isActive: true
    })
    .populate('assignedDoctorId', 'firstName lastName telegramChatId telegramNotificationsEnabled')
    .select('firstName lastName patientId contactNumber age gender priority status assignedDoctorId');

    console.log(`📋 Found ${patientsWithDoctors.length} patients with assigned doctors`);

    let notificationsSent = 0;
    let errors = 0;

    for (const patient of patientsWithDoctors) {
      try {
        const doctor = patient.assignedDoctorId;

        // Check if doctor has Telegram notifications enabled
        if (doctor && doctor.telegramNotificationsEnabled && doctor.telegramChatId) {
          console.log(`📱 Sending notification to Dr. ${doctor.firstName} ${doctor.lastName} for patient ${patient.firstName} ${patient.lastName}`);

          // Send patient assignment notification
          const result = await telegramService.sendPatientAssignmentNotification(patient, doctor);

          if (result.success) {
            notificationsSent++;
            console.log(`✅ Notification sent successfully to ${doctor.firstName} ${doctor.lastName}`);
          } else {
            errors++;
            console.log(`❌ Failed to send notification to ${doctor.firstName} ${doctor.lastName}: ${result.message}`);
          }
        } else {
          console.log(`⚠️ Skipping patient ${patient.firstName} ${patient.lastName} - doctor ${doctor ? doctor.firstName : 'unknown'} doesn't have Telegram enabled`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        errors++;
        console.error(`❌ Error processing patient ${patient.firstName} ${patient.lastName}:`, error.message);
      }
    }

    console.log(`\n🎉 Notification process completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • Patients processed: ${patientsWithDoctors.length}`);
    console.log(`   • Notifications sent: ${notificationsSent}`);
    console.log(`   • Errors: ${errors}`);

    if (notificationsSent > 0) {
      console.log(`\n✅ Successfully sent notifications for ${notificationsSent} patient assignments!`);
      console.log(`📱 Check your Telegram for the notifications.`);
    } else {
      console.log(`\n⚠️ No notifications were sent. Make sure:`);
      console.log(`   • Doctors have Telegram notifications enabled`);
      console.log(`   • Doctors have valid chat IDs configured`);
      console.log(`   • Bot token is properly configured`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  sendNotificationsForAssignedPatients();
}

module.exports = { sendNotificationsForAssignedPatients };
