const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User Schema (simplified for this script)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['admin', 'doctor', 'nurse', 'reception', 'lab', 'imaging', 'billing', 'inventory'],
    default: 'reception'
  },
  isActive: { type: Boolean, default: true },
  attendanceOverlayEnabled: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createTestUsers() {
  try {
    // Connect to MongoDB - Use clinic-cms database
    const mongoUri = 'mongodb://localhost:27017/clinic-cms';
    console.log(`🔗 Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}`);

    // Test users with correct roles
    const testUsers = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@clinic.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        attendanceOverlayEnabled: false
      },
      {
        firstName: 'DR',
        lastName: 'Natan',
        email: 'doctor@clinic.com',
        username: 'DR Natan',
        password: 'doctor123',
        role: 'doctor',
        attendanceOverlayEnabled: false
      },
      {
        firstName: 'Nurse',
        lastName: 'Sarah',
        email: 'nurse@clinic.com',
        username: 'Nurse Sarah',
        password: 'nurse123',
        role: 'nurse',
        attendanceOverlayEnabled: false
      },
      {
        firstName: 'Reception',
        lastName: 'Meron',
        email: 'reception@clinic.com',
        username: 'Reception Meron',
        password: 'reception123',
        role: 'reception',
        attendanceOverlayEnabled: false
      },
      {
        firstName: 'Lab',
        lastName: 'Technician',
        email: 'lab@clinic.com',
        username: 'Lab Tech',
        password: 'lab123',
        role: 'lab',
        attendanceOverlayEnabled: false
      },
      {
        firstName: 'Imaging',
        lastName: 'Specialist',
        email: 'imaging@clinic.com',
        username: 'Imaging Specialist',
        password: 'imaging123',
        role: 'imaging',
        attendanceOverlayEnabled: false
      }
    ];

    for (const userData of testUsers) {
      // Check if user already exists by email or username
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });
      
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, updating...`);
        
        // Update existing user
        existingUser.firstName = userData.firstName;
        existingUser.lastName = userData.lastName;
        existingUser.username = userData.username;
        existingUser.role = userData.role;
        existingUser.isActive = true;
        existingUser.attendanceOverlayEnabled = false;
        
        // Hash password if it's different
        const isPasswordValid = await bcrypt.compare(userData.password, existingUser.password);
        if (!isPasswordValid) {
          existingUser.password = await bcrypt.hash(userData.password, 12);
        }
        
        await existingUser.save();
        console.log(`✅ Updated user: ${userData.email} (${userData.role})`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const newUser = new User({
          ...userData,
          password: hashedPassword
        });
        
        await newUser.save();
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n🎉 Test users created/updated successfully!');
    console.log('\n📋 Available test accounts:');
    console.log('  Admin: admin@clinic.com / admin123');
    console.log('  Doctor: doctor@clinic.com / doctor123');
    console.log('  Nurse: nurse@clinic.com / nurse123');
    console.log('  Reception: reception@clinic.com / reception123');
    console.log('  Lab: lab@clinic.com / lab123');
    console.log('  Imaging: imaging@clinic.com / imaging123');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestUsers();
