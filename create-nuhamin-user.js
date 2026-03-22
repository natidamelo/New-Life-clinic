const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['admin', 'doctor', 'nurse', 'reception', 'lab', 'imaging', 'billing', 'inventory'],
    default: 'nurse'
  },
  specialization: String,
  isActive: { type: Boolean, default: true },
  permissions: {
    manageUsers: { type: Boolean, default: false },
    managePatients: { type: Boolean, default: false },
    manageAppointments: { type: Boolean, default: false },
    manageBilling: { type: Boolean, default: false },
    manageInventory: { type: Boolean, default: false },
    generateReports: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createNuhaminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if Nuhamin user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: 'Nuhamin' },
        { email: 'nuhamin@clinic.com' }
      ]
    });
    
    if (existingUser) {
      console.log('⚠️  User Nuhamin already exists, updating password...');
      
      // Update password
      existingUser.password = await bcrypt.hash('Nuhamin123', 12);
      existingUser.firstName = 'Nuhamin';
      existingUser.lastName = 'Yohannes';
      existingUser.role = 'nurse';
      existingUser.isActive = true;
      existingUser.permissions = {
        managePatients: true,
        manageAppointments: true,
        viewReports: false
      };
      
      await existingUser.save();
      console.log('✅ Updated Nuhamin user successfully!');
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash('Nuhamin123', 12);
      
      const nuhaminUser = new User({
        firstName: 'Nuhamin',
        lastName: 'Yohannes',
        email: 'nuhamin@clinic.com',
        username: 'Nuhamin',
        password: hashedPassword,
        role: 'nurse',
        isActive: true,
        permissions: {
          managePatients: true,
          manageAppointments: true,
          viewReports: false
        }
      });
      
      await nuhaminUser.save();
      console.log('✅ Created Nuhamin user successfully!');
    }

    console.log('\n🎉 Nuhamin user is ready!');
    console.log('\n📋 Login credentials:');
    console.log('  Username: Nuhamin');
    console.log('  Password: Nuhamin123');
    console.log('  Role: Nurse');
    console.log('\nYou can now login to the application!');

  } catch (error) {
    console.error('❌ Error creating Nuhamin user:', error);
    if (error.code === 11000) {
      console.error('Duplicate key error - user might already exist with a different field');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createNuhaminUser();

