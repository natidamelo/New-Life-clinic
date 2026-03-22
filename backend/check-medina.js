const mongoose = require('mongoose');
require('dotenv').config();

async function checkMedina() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check Medina's Telegram settings
    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      role: String,
      telegramChatId: String,
      telegramNotificationsEnabled: Boolean,
      telegramUsername: String,
      notificationPreferences: {
        patientAssignments: { type: Boolean, default: true },
        vitalsUpdates: { type: Boolean, default: true },
        labOrders: { type: Boolean, default: true },
        imagingRequests: { type: Boolean, default: true },
        procedures: { type: Boolean, default: true },
        medicationOrders: { type: Boolean, default: true },
        emergencyAlerts: { type: Boolean, default: true },
        systemUpdates: { type: Boolean, default: false }
      }
    }, { collection: 'users' }));

    console.log('🔍 Searching for Medina...');
    const medina = await User.findOne({
      $or: [
        { firstName: 'Medina', lastName: 'Negash' },
        { email: 'medinanegash@clinic.com' }
      ]
    });

    if (medina) {
      console.log('✅ Medina found:', {
        id: medina._id,
        name: medina.firstName + ' ' + medina.lastName,
        email: medina.email,
        role: medina.role,
        telegramChatId: medina.telegramChatId || 'NOT SET',
        telegramNotificationsEnabled: medina.telegramNotificationsEnabled || false,
        telegramUsername: medina.telegramUsername || 'NOT SET',
        notificationPreferences: medina.notificationPreferences
      });

      if (medina.telegramNotificationsEnabled && medina.telegramChatId && medina.notificationPreferences.labOrders) {
        console.log('🎉 Medina is configured for Lab Order Telegram notifications!');
      } else {
        console.log('⚠️ Medina is NOT fully configured for Lab Order Telegram notifications.');
        if (!medina.telegramChatId) console.log('   - Telegram Chat ID is missing.');
        if (!medina.telegramNotificationsEnabled) console.log('   - Telegram Notifications are not enabled.');
        if (!medina.notificationPreferences.labOrders) console.log('   - Lab Order notifications are not enabled in preferences.');
      }

    } else {
      console.log('❌ Medina not found');
      // List all lab staff
      const labStaff = await User.find({ role: 'lab' }).limit(10);
      console.log(`Found ${labStaff.length} lab staff:`);
      labStaff.forEach(d => {
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

checkMedina();
