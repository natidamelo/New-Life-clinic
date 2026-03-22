const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function verifyNotificationFix() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Verifying Hemoglobin notification amounts...\n');

    // Find all Hemoglobin notifications
    const hemoglobinNotifications = await Notification.find({
      'data.testName': 'Hemoglobin'
    }).sort({ createdAt: -1 });

    console.log(`📋 Found ${hemoglobinNotifications.length} Hemoglobin notifications:`);

    let correctCount = 0;
    let incorrectCount = 0;

    hemoglobinNotifications.forEach((notification, index) => {
      const amount = notification.data?.amount;
      const isCorrect = amount === 100;
      
      console.log(`${index + 1}. Amount: ${amount} ETB ${isCorrect ? '✅' : '❌'}`);
      console.log(`   Created: ${notification.createdAt}`);
      console.log(`   Read: ${notification.read ? 'Yes' : 'No'}`);
      console.log('');

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    console.log('📊 Summary:');
    console.log(`  ✅ Correct amount (100 ETB): ${correctCount}`);
    console.log(`  ❌ Incorrect amount: ${incorrectCount}`);

    if (incorrectCount === 0) {
      console.log('\n🎉 All Hemoglobin notifications have correct amounts!');
      console.log('   The frontend should now show "ETB 100.00" instead of "ETB 50.00"');
    } else {
      console.log('\n⚠️  Some notifications still have incorrect amounts');
      console.log('   You may need to refresh the browser or clear cache');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the verification
verifyNotificationFix(); 