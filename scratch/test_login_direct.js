const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
  console.log(`Connecting to MongoDB at: ${mongoURI}`);
  
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    // Import authService from backend folder
    const authService = require('../backend/services/authService');
    const { bootstrapSuperAdmin } = require('../backend/services/superAdminBootstrapService');
    
    console.log('Bootstrapping superadmin first...');
    await bootstrapSuperAdmin();
    
    console.log('Attempting login as superadmin...');
    const result = await authService.loginUser('superadmin', 'Sup3rAdm!n#2026#N3wL1fe');
    
    console.log('✅ Login successful!');
    console.log('Token generated:', result.token.substring(0, 50) + '...');
    console.log('User Role:', result.user.role);
    console.log('User ClinicId:', result.user.clinicId);
    
  } catch (error) {
    console.error('❌ Login failed with error:');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();
