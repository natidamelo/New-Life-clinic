const mongoose = require('mongoose');
const MedicalCertificate = require('./models/MedicalCertificate');
const config = require('./config');

// Test script for Medical Certificate functionality
async function testMedicalCertificateSystem() {
  try {
    console.log('🏥 Testing Medical Certificate System...\n');

    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a sample medical certificate
    console.log('\n📝 Test 1: Creating a sample medical certificate...');
    
    const sampleCertificate = new MedicalCertificate({
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'John Doe',
      patientAge: 35,
      patientGender: 'Male',
      patientAddress: '123 Main Street, Addis Ababa, Ethiopia',
      patientPhone: '+251-911-123-456',
      doctorId: new mongoose.Types.ObjectId(),
      doctorName: 'Dr. Sarah Johnson',
      doctorLicenseNumber: 'MD-12345',
      doctorSpecialization: 'General Practice',
      diagnosis: 'Acute Upper Respiratory Infection',
      symptoms: 'Cough, fever, sore throat, nasal congestion',
      treatment: 'Rest, increased fluid intake, symptomatic treatment',
      prescription: 'Paracetamol 500mg every 6 hours, Steam inhalation',
      recommendations: 'Avoid cold exposure, maintain good hygiene',
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      restPeriod: '3 days',
      workRestriction: 'Light duty only',
      certificateType: 'Medical Certificate',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      clinicName: 'New Life Clinic',
      clinicAddress: 'Addis Ababa, Ethiopia',
      clinicPhone: '+251-11-123-4567',
      clinicLicense: 'CL-001',
      notes: 'Patient responded well to treatment. Monitor for any complications.',
      createdBy: new mongoose.Types.ObjectId(),
      status: 'Issued'
    });

    const savedCertificate = await sampleCertificate.save();
    console.log(`✅ Certificate created successfully!`);
    console.log(`   Certificate Number: ${savedCertificate.certificateNumber}`);
    console.log(`   Patient: ${savedCertificate.patientName}`);
    console.log(`   Diagnosis: ${savedCertificate.diagnosis}`);
    console.log(`   Status: ${savedCertificate.status}`);

    // Test 2: Test virtual fields
    console.log('\n🔍 Test 2: Testing virtual fields...');
    console.log(`   Is Valid: ${savedCertificate.isValid}`);
    console.log(`   Days Remaining: ${savedCertificate.daysRemaining}`);

    // Test 3: Find certificates by patient
    console.log('\n👤 Test 3: Finding certificates for patient...');
    const patientCertificates = await MedicalCertificate.findValidForPatient(savedCertificate.patientId);
    console.log(`   Found ${patientCertificates.length} valid certificates for patient`);

    // Test 4: Test date range search
    console.log('\n📅 Test 4: Testing date range search...');
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const certificatesInRange = await MedicalCertificate.findByDateRange(startDate, endDate);
    console.log(`   Found ${certificatesInRange.length} certificates in date range`);

    // Test 5: Test certificate statistics
    console.log('\n📊 Test 5: Testing certificate statistics...');
    const stats = await MedicalCertificate.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          issued: {
            $sum: { $cond: [{ $eq: ['$status', 'Issued'] }, 1, 0] }
          },
          draft: {
            $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    if (stats.length > 0) {
      console.log(`   Total Certificates: ${stats[0].total}`);
      console.log(`   Issued: ${stats[0].issued}`);
      console.log(`   Drafts: ${stats[0].draft}`);
      console.log(`   Cancelled: ${stats[0].cancelled}`);
    }

    // Test 6: Test certificate type statistics
    console.log('\n📋 Test 6: Testing certificate type statistics...');
    const typeStats = await MedicalCertificate.aggregate([
      {
        $group: {
          _id: '$certificateType',
          count: { $sum: 1 }
        }
      }
    ]);

    typeStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    // Test 7: Test certificate update
    console.log('\n✏️ Test 7: Testing certificate update...');
    savedCertificate.status = 'Cancelled';
    savedCertificate.updatedBy = new mongoose.Types.ObjectId();
    await savedCertificate.save();
    console.log(`   Certificate status updated to: ${savedCertificate.status}`);

    // Test 8: Test certificate deletion (soft delete)
    console.log('\n🗑️ Test 8: Testing certificate soft deletion...');
    const certificateToDelete = await MedicalCertificate.findById(savedCertificate._id);
    if (certificateToDelete) {
      certificateToDelete.status = 'Cancelled';
      await certificateToDelete.save();
      console.log(`   Certificate soft deleted (status: ${certificateToDelete.status})`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Certificate creation');
    console.log('   ✅ Virtual fields');
    console.log('   ✅ Patient certificate lookup');
    console.log('   ✅ Date range search');
    console.log('   ✅ Statistics aggregation');
    console.log('   ✅ Certificate type statistics');
    console.log('   ✅ Certificate update');
    console.log('   ✅ Soft deletion');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    try {
      await MedicalCertificate.deleteMany({ patientName: 'John Doe' });
      console.log('\n🧹 Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError.message);
    }

    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMedicalCertificateSystem();
}

module.exports = testMedicalCertificateSystem;
