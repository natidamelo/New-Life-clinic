/**
 * Fix All Patients with Finalized Records but Missing Completed Status
 * Finds all patients with finalized medical records and updates their status to completed
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixAllMissingCompletedStatus = async () => {
  try {
    console.log('🔧 Finding patients with finalized records...\n');
    
    const Patient = require('./models/Patient');
    const MedicalRecord = require('./models/MedicalRecord');
    
    // Find all finalized medical records
    const finalizedRecords = await MedicalRecord.find({
      status: 'Finalized'
    });
    
    console.log(`📋 Found ${finalizedRecords.length} finalized medical record(s)\n`);
    
    if (finalizedRecords.length === 0) {
      console.log('❌ No finalized medical records found');
      return;
    }
    
    // Get unique patients from finalized records - handle both ObjectId and populated patient objects
    const patientIds = [...new Set(finalizedRecords.map(r => {
      if (r.patient) {
        // If it's a populated object, get the _id
        if (typeof r.patient === 'object' && r.patient._id) {
          return r.patient._id.toString();
        }
        // If it's already an ObjectId string
        return r.patient.toString();
      }
      return null;
    }).filter(Boolean))];
    console.log(`👥 These records belong to ${patientIds.length} unique patient(s)\n`);
    
    let updatedCount = 0;
    let alreadyCompletedCount = 0;
    
    for (const patientId of patientIds) {
      const patient = await Patient.findById(patientId);
      
      if (!patient) {
        console.log(`⚠️  Patient ${patientId} not found in database`);
        continue;
      }
      
      const recordCount = finalizedRecords.filter(r => r.patient?.toString() === patientId.toString()).length;
      
      console.log(`\n👤 ${patient.firstName} ${patient.lastName}`);
      console.log(`   Patient ID: ${patient.patientId}`);
      console.log(`   Database ID: ${patient._id}`);
      console.log(`   Age: ${patient.age}, Gender: ${patient.gender}`);
      console.log(`   Current Status: ${patient.status}`);
      console.log(`   Finalized Records: ${recordCount}`);
      
      if (patient.status !== 'completed') {
        console.log(`   🔄 Updating status to "completed"...`);
        
        const updated = await Patient.findByIdAndUpdate(
          patientId,
          {
            status: 'completed',
            completedAt: new Date(),
            lastUpdated: new Date()
          },
          { new: true, runValidators: true }
        );
        
        console.log(`   ✅ Status updated: ${patient.status} → ${updated.status}`);
        updatedCount++;
      } else {
        console.log(`   ✅ Already marked as completed`);
        alreadyCompletedCount++;
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   Total patients with finalized records: ${patientIds.length}`);
    console.log(`   Updated to completed: ${updatedCount}`);
    console.log(`   Already completed: ${alreadyCompletedCount}`);
    console.log(`\n🎉 All patients processed!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await fixAllMissingCompletedStatus();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
};

main();

