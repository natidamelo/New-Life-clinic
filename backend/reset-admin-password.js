const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

async function resetAdminPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB Connected Successfully!');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@clinic.com' });

    if (!adminUser) {
      console.log('Admin user not found, creating one...');
      // Create admin user with properly hashed password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@clinic.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true
      });
      await newAdmin.save();
      console.log('New admin user created successfully!');
    } else {
      console.log('Admin user found, resetting password...');
      // Reset password with proper hashing
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser.password = hashedPassword;
      await adminUser.save();
      console.log('Admin password reset successfully!');
    }

    // Verify the password works
    const testUser = await User.findOne({ email: 'admin@clinic.com' });
    const isValid = await bcrypt.compare('admin123', testUser.password);
    console.log('Password verification test:', isValid ? 'PASSED' : 'FAILED');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

resetAdminPassword();