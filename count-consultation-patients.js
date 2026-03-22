const mongoose = require('mongoose');
require('dotenv').config();

// Import the Patient and Visit models
const Patient = require('./backend/models/Patient');
const Visit = require('./backend/models/Visit');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('🔗 Attempting to connect to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to count consultation patients
const countConsultationPatients = async () => {
  try {
    console.log('🔍 Counting consultation patients...\n');

    // Count total patients
    const totalPatients = await Patient.countDocuments();
    console.log(`📊 Total Patients: ${totalPatients}`);

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
      console.log(`   ${status._id}: ${status.count}`);
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

    // Get recent consultation patients (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentConsultationPatients = await Patient.countDocuments({
      status: { $in: consultationStatuses },
      updatedAt: { $gte: thirtyDaysAgo }
    });

    console.log(`\n📅 Recent Consultation Patients (last 30 days): ${recentConsultationPatients}`);

    // Get patients with recent visits
    const patientsWithRecentVisits = await Visit.aggregate([
      {
        $match: {
          visitStartDateTime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$patientId',
          visitCount: { $sum: 1 }
        }
      },
      {
        $count: 'uniquePatients'
      }
    ]);

    const recentVisitPatients = patientsWithRecentVisits[0]?.uniquePatients || 0;
    console.log(`📅 Patients with Visits (last 30 days): ${recentVisitPatients}`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Patients: ${totalPatients}`);
    console.log(`   Consultation Patients: ${consultationPatients}`);
    console.log(`   Total Visits: ${totalVisits}`);
    console.log(`   Active Visits: ${activeVisits}`);
    console.log(`   Recent Consultation Patients (30 days): ${recentConsultationPatients}`);
    console.log(`   Patients with Recent Visits (30 days): ${recentVisitPatients}`);

  } catch (error) {
    console.error('❌ Error counting consultation patients:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await countConsultationPatients();
  
  // Close connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
