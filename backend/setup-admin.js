const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

// Admin user data
const adminUser = {
  username: 'admin',
  email: 'admin@clinic.com',
  password: 'admin123', // Will be hashed by the User model pre-save hook
  role: 'admin',
  firstName: 'Admin',
  lastName: 'User',
  isActive: true
};

// Connect to MongoDB and create admin user
async function setupAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected Successfully!');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log('- Email:', existingAdmin.email);
      console.log('- Role:', existingAdmin.role);
      console.log('- Active:', existingAdmin.isActive);
      
      // Update admin if not active
      if (!existingAdmin.isActive) {
        existingAdmin.isActive = true;
        await existingAdmin.save();
        console.log('Admin user activated!');
      }
    } else {
      // Create new admin user
      const user = new User(adminUser);
      await user.save();
      console.log('Admin user created successfully:');
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Password: admin123 (unhashed)');
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    
  } catch (error) {
    console.error('Error setting up admin user:', error);
    if (error.name === 'MongoNetworkError') {
      console.error('Please check if MongoDB server is running');
    }
  }
}

// Run the setup
setupAdmin(); 
