// Simple server health test
const mongoose = require('mongoose');

async function testServerHealth() {
  try {
    console.log('🧪 Testing server health...');
    
    // Test 1: Basic imports
    console.log('✅ Testing basic imports...');
    const Prescription = require('./models/Prescription');
    const MedicalInvoice = require('./models/MedicalInvoice');
    const Patient = require('./models/Patient');
    const Notification = require('./models/Notification');
    const InventoryItem = require('./models/InventoryItem');
    
    console.log('✅ All models imported successfully');
    
    // Test 2: Database connection
    console.log('🔌 Testing database connection...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Database connected successfully');
    
    // Test 3: Basic queries
    console.log('📊 Testing basic queries...');
    const patientCount = await Patient.countDocuments();
    const prescriptionCount = await Prescription.countDocuments();
    const invoiceCount = await MedicalInvoice.countDocuments();
    
    console.log(`✅ Database queries successful:`);
    console.log(`   - Patients: ${patientCount}`);
    console.log(`   - Prescriptions: ${prescriptionCount}`);
    console.log(`   - Invoices: ${invoiceCount}`);
    
    // Test 4: Check for Gedion
    console.log('🔍 Looking for Gedion...');
    const gedion = await Patient.findOne({
      $or: [
        { firstName: { $regex: /gedion/i } },
        { lastName: { $regex: /gedion/i } }
      ]
    });
    
    if (gedion) {
      console.log(`✅ Found Gedion: ${gedion.firstName} ${gedion.lastName}`);
      
      // Check prescriptions
      const prescriptions = await Prescription.find({ patient: gedion._id });
      console.log(`   - Prescriptions: ${prescriptions.length}`);
      
      // Check invoices
      const invoices = await MedicalInvoice.find({ patient: gedion._id });
      console.log(`   - Invoices: ${invoices.length}`);
      
      prescriptions.forEach((p, i) => {
        console.log(`   Prescription ${i + 1}: ${p.medicationName} - Invoice: ${p.invoiceId || 'None'}`);
      });
      
    } else {
      console.log('❌ Gedion not found');
    }
    
    console.log('\n🎉 Server health test completed successfully!');
    
  } catch (error) {
    console.error('❌ Server health test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the test
testServerHealth();
