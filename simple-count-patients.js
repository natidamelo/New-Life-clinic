const mongoose = require('mongoose');

// Set connection timeout
mongoose.set('serverSelectionTimeoutMS', 5000);

// Import the Patient and Visit models
const Patient = require('./backend/models/Patient');
const Visit = require('./backend/models/Visit');

// Connect to MongoDB with timeout
const connectDB = async () => {
  try {
    const mongoUri = 'mongodb://localhost:27017/clinic-cms';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

// Function to count consultation patients
const countConsultationPatients = async () => {
  try {
    console.log('🔍 Counting consultation patients...\n');

    // Count total patients
    const totalPatients = await Patient.countDocuments();
    console.log(`📊 Total Patients: ${totalPatients}`);

    if (totalPatients === 0) {
      console.log('⚠️  No patients found in database');
      return;
    }

    // Count patients by status
    const patientsByStatus = await Patient.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📋 Patients by Status:');
    patientsByStatus.forEach(status => {
      console.log(`   ${status._id || 'null'}: ${status.count}`);
    });

    // Count patients with consultation-related statuses
    const consultationStatuses = ['Outpatient', 'waiting', 'in-progress', 'completed', 'scheduled'];
    const consultationPatients = await Patient.countDocuments({
      status: { $in: consultationStatuses }
    });

    console.log(`\n🏥 Consultation Patients (${consultationStatuses.join(', ')}): ${consultationPatients}`);

    // Count total visits
    const totalVisits = await Visit.countDocuments();
    console.log(`\n📅 Total Visits: ${totalVisits}`);

    // Count active visits
    const activeVisits = await Visit.countDocuments({ status: 'Active' });
    console.log(`📅 Active Visits: ${activeVisits}`);

    // Count completed visits
    const completedVisits = await Visit.countDocuments({ status: 'Discharged' });
    console.log(`📅 Completed Visits: ${completedVisits}`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Patients: ${totalPatients}`);
    console.log(`   Consultation Patients: ${consultationPatients}`);
    console.log(`   Total Visits: ${totalVisits}`);
    console.log(`   Active Visits: ${activeVisits}`);
    console.log(`   Completed Visits: ${completedVisits}`);

  } catch (error) {
    console.error('❌ Error counting consultation patients:', error.message);
  }
};

// Main function
const main = async () => {
  const connected = await connectDB();
  
  if (!connected) {
    console.log('❌ Could not connect to database. Exiting...');
    process.exit(1);
  }

  await countConsultationPatients();
  
  // Close connection
  try {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.log('\n⚠️  Error closing connection:', error.message);
  }
  
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});
