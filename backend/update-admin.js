const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB and update admin user
async function updateAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected Successfully!');
    
    // Find admin user
    const admin = await User.findOne({ email: 'admin@clinic.com' });
    
    if (!admin) {
      console.log('Admin user not found. Please run setup-admin.js first.');
      return;
    }
    
    console.log('Found admin user:', admin.email);
    console.log('Current role:', admin.role);
    
    // Update role to admin if it's not already
    if (admin.role !== 'admin') {
      console.log(`Updating role from '${admin.role}' to 'admin'...`);
      admin.role = 'admin';
    }
    
    // Set complete admin permissions
    admin.permissions = {
      manageUsers: true,
      managePatients: true,
      manageAppointments: true,
      manageBilling: true,
      manageInventory: true,
      generateReports: true,
      viewReports: true
    };
    
    // Save the updated admin user
    await admin.save();
    console.log('Admin user updated successfully with complete permissions!');
    
    console.log('Updated admin details:');
    console.log('- Email:', admin.email);
    console.log('- Role:', admin.role);
    console.log('- Active:', admin.isActive);
    console.log('- Permissions:', JSON.stringify(admin.permissions, null, 2));
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    
  } catch (error) {
    console.error('Error updating admin user:', error);
    if (error.name === 'MongoNetworkError') {
      console.error('Please check if MongoDB server is running');
    }
  }
}

// Run the update
updateAdmin(); 
