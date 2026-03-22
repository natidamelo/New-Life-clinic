const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection string - Updated with correct database name
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB and fix doctor permissions
async function fixDoctorPermissions() {
  try {
    console.log('Connecting to MongoDB (clinic-cms database)...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected Successfully!');
    
    // Find all doctor users
    const doctors = await User.find({ role: 'doctor' });
    
    if (doctors.length === 0) {
      console.log('No doctor users found in the database.');
      return;
    }
    
    console.log(`Found ${doctors.length} doctor users to update.`);
    
    // Update each doctor user with proper permissions
    for (const doctor of doctors) {
      console.log(`Updating permissions for doctor: ${doctor.username} (${doctor.email})`);
      
      doctor.permissions = {
        managePatients: true,
        manageAppointments: true,
        viewReports: true,
        createMedicalRecords: true,
        createLabOrders: true,
        ...doctor.permissions // Keep any existing permissions
      };
      
      await doctor.save();
      console.log(`✅ Updated permissions for doctor: ${doctor.username}`);
    }
    
    console.log('\n🎉 All doctor permissions have been updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing doctor permissions:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the script
fixDoctorPermissions(); 