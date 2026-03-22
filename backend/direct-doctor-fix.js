const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

// Direct fix for the specific doctor user
async function directDoctorFix() {
  try {
    console.log('Connecting to MongoDB (clinic-cms database)...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected Successfully!');
    
    // Find the specific doctor user by ID from the error message
    const doctorId = '6823301cdefc7776bf7537b3';
    console.log(`Looking for doctor with ID: ${doctorId}`);
    
    const doctor = await User.findById(doctorId);
    
    if (!doctor) {
      console.log('❌ Doctor user not found!');
      return;
    }
    
    console.log('Found doctor:', {
      id: doctor._id,
      username: doctor.username,
      email: doctor.email,
      role: doctor.role,
      currentPermissions: doctor.permissions
    });
    
    // Directly set the permissions object
    doctor.permissions = {
      manageUsers: false,
      managePatients: true,        // ⭐ This is the key permission we need
      manageAppointments: true,
      manageBilling: false,
      manageInventory: false,
      generateReports: false,
      viewReports: true,
      createMedicalRecords: true,  // ⭐ Additional permission for medical records
      createLabOrders: true        // ⭐ Additional permission for lab orders
    };
    
    // Mark the permissions field as modified to force Mongoose to save it
    doctor.markModified('permissions');
    
    console.log('Setting new permissions:', doctor.permissions);
    
    // Save the user
    const savedDoctor = await doctor.save();
    
    console.log('✅ Doctor permissions updated successfully!');
    console.log('Updated permissions:', savedDoctor.permissions);
    
    // Verify the update by fetching again
    const verifyDoctor = await User.findById(doctorId);
    console.log('🔍 Verification - Final permissions in database:', verifyDoctor.permissions);
    
  } catch (error) {
    console.error('❌ Error fixing doctor permissions:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the script
directDoctorFix(); 