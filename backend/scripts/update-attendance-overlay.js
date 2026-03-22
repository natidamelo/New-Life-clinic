const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const updateAttendanceOverlay = async () => {
  try {
    console.log('🔍 Connecting to database...');
    
    // Find all users that don't have attendanceOverlayEnabled set
    const usersToUpdate = await User.find({
      $or: [
        { attendanceOverlayEnabled: { $exists: false } },
        { attendanceOverlayEnabled: null }
      ]
    });
    
    console.log(`📋 Found ${usersToUpdate.length} users to update`);
    
    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have attendanceOverlayEnabled set');
      return;
    }
    
    // Update all users to have attendanceOverlayEnabled set to true
    const updateResult = await User.updateMany(
      {
        $or: [
          { attendanceOverlayEnabled: { $exists: false } },
          { attendanceOverlayEnabled: null }
        ]
      },
      { attendanceOverlayEnabled: true }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} users`);
    
    // Verify the update
    const allUsers = await User.find({ role: { $nin: ['admin'] } }).select('firstName lastName role attendanceOverlayEnabled');
    
    console.log('\n📊 Updated Users:');
    allUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role}): ${user.attendanceOverlayEnabled ? 'Enabled' : 'Disabled'}`);
    });
    
    console.log('\n🎉 Attendance overlay update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating attendance overlay:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
updateAttendanceOverlay();
