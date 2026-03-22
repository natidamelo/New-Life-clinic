const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to calculate grace period
function calculateGracePeriod(cardIssueDate) {
  if (!cardIssueDate) {
    return {
      hasCard: false,
      message: 'No card issue date found'
    };
  }

  const issueDate = new Date(cardIssueDate);
  const now = new Date();
  const graceEnd = new Date(issueDate);
  graceEnd.setDate(graceEnd.getDate() + 15); // 15 days grace period
  
  const daysSinceIssue = Math.ceil((now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    hasCard: true,
    issueDate: issueDate.toISOString().split('T')[0],
    graceEndDate: graceEnd.toISOString().split('T')[0],
    daysSinceIssue,
    daysLeftInGrace: daysLeft > 0 ? daysLeft : 0,
    isExpired: daysSinceIssue > 15,
    status: daysSinceIssue > 15 ? 'Expired' : daysSinceIssue > 0 ? 'In Grace Period' : 'Active'
  };
}

// Main function
async function checkPatientGracePeriod(patientId) {
  try {
    await connectDB();
    
    const Patient = require('./backend/models/Patient');
    
    // Find patient by patientId
    const patient = await Patient.findOne({ patientId: patientId })
      .populate('cardType')
      .lean();
    
    if (!patient) {
      console.log(`❌ Patient with ID ${patientId} not found`);
      process.exit(1);
    }
    
    console.log('\n📋 Patient Information:');
    console.log(`   Name: ${patient.firstName} ${patient.lastName}`);
    console.log(`   Patient ID: ${patient.patientId}`);
    console.log(`   Card Type: ${patient.cardType ? patient.cardType.name : 'None'}`);
    console.log(`   Card Status: ${patient.cardStatus || 'Not set'}`);
    console.log(`   Card Issue Date: ${patient.cardIssueDate ? new Date(patient.cardIssueDate).toISOString().split('T')[0] : 'Not set'}`);
    
    if (patient.cardIssueDate) {
      const graceInfo = calculateGracePeriod(patient.cardIssueDate);
      
      console.log('\n⏰ Grace Period Information:');
      console.log(`   Issue Date: ${graceInfo.issueDate}`);
      console.log(`   Grace End Date: ${graceInfo.graceEndDate}`);
      console.log(`   Days Since Issue: ${graceInfo.daysSinceIssue} days`);
      console.log(`   Days Left in Grace: ${graceInfo.daysLeftInGrace} days`);
      console.log(`   Status: ${graceInfo.status}`);
      console.log(`   Is Expired: ${graceInfo.isExpired ? 'Yes ❌' : 'No ✅'}`);
      
      if (graceInfo.isExpired) {
        console.log(`\n⚠️  WARNING: This card has exceeded the 15-day grace period and should show as "Expired Card"`);
      } else if (graceInfo.daysSinceIssue > 0) {
        console.log(`\n✅ Card is within grace period (${graceInfo.daysLeftInGrace} days remaining)`);
      } else {
        console.log(`\n✅ Card is active (issued today)`);
      }
    } else {
      console.log('\n⚠️  No card issue date found. Card status cannot be determined.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get patient ID from command line argument
const patientId = process.argv[2];

if (!patientId) {
  console.log('Usage: node check-patient-grace-period.js <patientId>');
  console.log('Example: node check-patient-grace-period.js P34963-4963');
  process.exit(1);
}

checkPatientGracePeriod(patientId);

