const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB and check admin user
async function checkAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB Connected Successfully!');

    // Check admin user
    const adminUser = await User.findOne({ email: 'admin@clinic.com' });

    if (adminUser) {
      console.log('Admin user found:');
      console.log('- ID:', adminUser._id);
      console.log('- Email:', adminUser.email);
      console.log('- Username:', adminUser.username);
      console.log('- Role:', adminUser.role);
      console.log('- Active:', adminUser.isActive);
      console.log('- Password hash length:', adminUser.password.length);
      console.log('- Password hash starts with:', adminUser.password.substring(0, 10) + '...');

      // Test password comparison
      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare('admin123', adminUser.password);
      console.log('- Password "admin123" is valid:', isValid);
    } else {
      console.log('Admin user not found!');
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');

  } catch (error) {
    console.error('Error checking admin user:', error);
  }
}

// Run the check
checkAdmin();