const mongoose = require('mongoose');

// Import models
const Patient = require('./backend/models/Patient');
const Visit = require('./backend/models/Visit');
const User = require('./backend/models/User');

async function fixNatan() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Find Natan Kinfe
    console.log('🔍 Looking for Natan Kinfe...');
    const natan = await Patient.findOne({ firstName: 'Natan', lastName: 'Kinfe' });
    
    if (!natan) {
      console.log('❌ Natan Kinfe not found');
      return;
    }
    
    console.log('✅ Found Natan Kinfe:', natan.firstName, natan.lastName);
    console.log('   Current status:', natan.status);
    console.log('   Assigned doctor:', natan.assignedDoctorId);

    // Find DR Natan
    console.log('🔍 Looking for DR Natan...');
    const drNatan = await User.findOne({ 
      $or: [
        { firstName: /natan/i },
        { lastName: /natan/i }
      ],
      role: 'doctor'
    });
    
    if (!drNatan) {
      console.log('❌ DR Natan not found');
      return;
    }
    
    console.log('✅ Found DR Natan:', drNatan.firstName, drNatan.lastName);

    // Fix Natan Kinfe
    console.log('🔧 Fixing Natan Kinfe...');
    await Patient.findByIdAndUpdate(natan._id, {
      assignedDoctorId: drNatan._id,
      status: 'waiting',
      department: 'General Medicine',
      priority: 'normal',
      lastUpdated: new Date()
    });
    
    console.log('✅ Updated Natan Kinfe:');
    console.log('   - Assigned to DR Natan');
    console.log('   - Status set to "waiting"');
    console.log('   - Department set to "General Medicine"');

    // Check/create visit record
    const existingVisit = await Visit.findOne({ patientId: natan._id });
    
    if (!existingVisit) {
      console.log('🔧 Creating visit record...');
      const newVisit = new Visit({
        patientId: natan._id,
        doctorId: drNatan._id,
        visitStartDateTime: new Date(),
        status: 'Active',
        department: 'General Medicine',
        chiefComplaint: 'Consultation requested'
      });
      await newVisit.save();
      console.log('✅ Visit record created');
    } else {
      console.log('✅ Visit record already exists');
    }

    console.log('\n🎉 Natan Kinfe should now appear in pending consultations!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

fixNatan();
