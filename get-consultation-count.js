const mongoose = require('mongoose');

// Import models
const Patient = require('./backend/models/Patient');
const Visit = require('./backend/models/Visit');
const Prescription = require('./backend/models/Prescription');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Main function to get consultation count
const getConsultationCount = async () => {
  try {
    console.log('🔍 Analyzing consultation patients in your database...\n');

    // Get all patients
    const allPatients = await Patient.find({});
    console.log(`📊 Total Patients in Database: ${allPatients.length}\n`);

    if (allPatients.length === 0) {
      console.log('⚠️  No patients found in database');
      return;
    }

    // Display all patients with their details
    console.log('📋 ALL PATIENTS:');
    console.log('='.repeat(80));
    
    for (let i = 0; i < allPatients.length; i++) {
      const patient = allPatients[i];
      console.log(`\n${i + 1}. Patient ID: ${patient._id}`);
      console.log(`   Patient Number: ${patient.patientId || 'N/A'}`);
      console.log(`   Name: ${patient.firstName || 'N/A'} ${patient.lastName || 'N/A'}`);
      console.log(`   Age: ${patient.age || 'N/A'}`);
      console.log(`   Gender: ${patient.gender || 'N/A'}`);
      console.log(`   Phone: ${patient.contactNumber || 'N/A'}`);
      console.log(`   Email: ${patient.email || 'N/A'}`);
      console.log(`   Status: ${patient.status || 'N/A'}`);
      console.log(`   Department: ${patient.department || 'N/A'}`);
      console.log(`   Priority: ${patient.priority || 'N/A'}`);
      console.log(`   Created: ${patient.createdAt ? patient.createdAt.toLocaleDateString() : 'N/A'}`);
      console.log(`   Last Updated: ${patient.updatedAt ? patient.updatedAt.toLocaleDateString() : 'N/A'}`);
    }

    // Count by status
    const statusCounts = {};
    allPatients.forEach(patient => {
      const status = patient.status || 'No Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\n📊 PATIENTS BY STATUS:');
    console.log('='.repeat(40));
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Count consultation patients (outpatient, waiting, in-progress, completed, scheduled)
    const consultationStatuses = ['Outpatient', 'waiting', 'in-progress', 'completed', 'scheduled'];
    const consultationPatients = allPatients.filter(patient => 
      consultationStatuses.includes(patient.status)
    );

    console.log(`\n🏥 CONSULTATION PATIENTS: ${consultationPatients.length}`);
    console.log('='.repeat(50));
    consultationPatients.forEach((patient, index) => {
      console.log(`   ${index + 1}. ${patient.firstName || 'N/A'} ${patient.lastName || 'N/A'} (${patient.status})`);
    });

    // Get all visits
    const allVisits = await Visit.find({});
    console.log(`\n📅 Total Visits: ${allVisits.length}`);

    if (allVisits.length > 0) {
      const activeVisits = allVisits.filter(visit => visit.status === 'Active');
      const completedVisits = allVisits.filter(visit => visit.status === 'Discharged');
      
      console.log(`   Active Visits: ${activeVisits.length}`);
      console.log(`   Completed Visits: ${completedVisits.length}`);
    }

    // Get all prescriptions
    const allPrescriptions = await Prescription.find({});
    console.log(`\n💊 Total Prescriptions: ${allPrescriptions.length}`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`   Total Patients: ${allPatients.length}`);
    console.log(`   Consultation Patients: ${consultationPatients.length}`);
    console.log(`   Total Visits: ${allVisits.length}`);
    console.log(`   Total Prescriptions: ${allPrescriptions.length}`);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPatients = allPatients.filter(patient => 
      patient.updatedAt && patient.updatedAt >= thirtyDaysAgo
    );
    
    console.log(`   Recent Activity (30 days): ${recentPatients.length} patients updated`);

  } catch (error) {
    console.error('❌ Error analyzing patients:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await getConsultationCount();
  
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
