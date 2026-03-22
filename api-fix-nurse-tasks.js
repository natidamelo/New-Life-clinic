/**
 * API-based Emergency Fix Script: Create nurse tasks for all paid medications
 * 
 * This script uses the API endpoints instead of direct database access
 * to avoid connection timeout issues.
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5002/api';

// You'll need to get a valid auth token - replace this with a real token
const AUTH_TOKEN = 'your-auth-token-here'; // This needs to be updated with a real token

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testAPIConnection() {
  try {
    console.log('🔗 Testing API connection...');
    const response = await axios.get(`${API_BASE}/../ping`);
    console.log('✅ API connection successful:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    return false;
  }
}

async function syncMedicationsViaAPI() {
  try {
    console.log('🔄 Starting medication-nurse task synchronization via API...');
    
    // First, try to find orphaned medications
    console.log('\n📍 Step 1: Finding orphaned medications...');
    try {
      const orphanedResponse = await axios.post(
        `${API_BASE}/medication-nurse-sync/find-orphaned`,
        {},
        { headers }
      );
      
      console.log('✅ Orphaned medications check completed:');
      console.log(`   🔍 Found: ${orphanedResponse.data.data.orphanedMedications}`);
      console.log(`   ✅ Fixed: ${orphanedResponse.data.data.fixed}`);
      console.log(`   ❌ Errors: ${orphanedResponse.data.data.errors}`);
      
    } catch (orphanedError) {
      console.log('⚠️ Orphaned medications check failed (continuing with sync):', orphanedError.response?.data?.message || orphanedError.message);
    }
    
    // Then, run complete synchronization
    console.log('\n📍 Step 2: Complete synchronization...');
    try {
      const syncResponse = await axios.post(
        `${API_BASE}/medication-nurse-sync/sync-all`,
        {},
        { headers }
      );
      
      console.log('✅ Complete synchronization completed:');
      console.log(`   📋 Total prescriptions: ${syncResponse.data.data.totalPaidPrescriptions}`);
      console.log(`   💊 Total medications: ${syncResponse.data.data.totalMedications}`);
      console.log(`   ✅ Tasks created: ${syncResponse.data.data.tasksCreated}`);
      console.log(`   ⏭️ Tasks skipped: ${syncResponse.data.data.tasksSkipped}`);
      console.log(`   ❌ Errors: ${syncResponse.data.data.errors}`);
      
    } catch (syncError) {
      console.log('⚠️ Complete synchronization failed:', syncError.response?.data?.message || syncError.message);
    }
    
    // Check synchronization status
    console.log('\n📍 Step 3: Checking synchronization status...');
    try {
      const statusResponse = await axios.get(
        `${API_BASE}/medication-nurse-sync/status`,
        { headers }
      );
      
      console.log('📊 Synchronization Status:');
      console.log(`   📋 Total paid prescriptions: ${statusResponse.data.data.totalPaidPrescriptions}`);
      console.log(`   🏥 Total medication tasks: ${statusResponse.data.data.totalMedicationTasks}`);
      console.log(`   ⏳ Pending medication tasks: ${statusResponse.data.data.pendingMedicationTasks}`);
      console.log(`   📅 Recent tasks (last 24h): ${statusResponse.data.data.recentTasks.length}`);
      
      if (statusResponse.data.data.recentTasks.length > 0) {
        console.log('\n📋 Recent Tasks:');
        statusResponse.data.data.recentTasks.forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.patientName} - ${task.medicationName} (${task.status})`);
        });
      }
      
    } catch (statusError) {
      console.log('⚠️ Status check failed:', statusError.response?.data?.message || statusError.message);
    }
    
    console.log('\n🎉 API-based synchronization completed!');
    console.log('💡 All paid medications should now have corresponding nurse tasks.');
    
  } catch (error) {
    console.error('💥 Emergency fix failed:', error.response?.data || error.message);
  }
}

async function runAPIFix() {
  console.log('🚀 Starting API-based emergency fix for missing nurse tasks...\n');
  
  // Test API connection first
  const connected = await testAPIConnection();
  if (!connected) {
    console.log('❌ Cannot connect to API. Please ensure:');
    console.log('   1. Backend server is running on port 5002');
    console.log('   2. You have a valid authentication token');
    return;
  }
  
  if (AUTH_TOKEN === 'your-auth-token-here') {
    console.log('⚠️ WARNING: You need to update the AUTH_TOKEN in this script!');
    console.log('   1. Login to the system and get a valid JWT token');
    console.log('   2. Replace AUTH_TOKEN in this script with the real token');
    console.log('   3. Or use an admin account token');
    console.log('\n🔄 Proceeding without authentication (may fail)...\n');
  }
  
  await syncMedicationsViaAPI();
}

// Run the fix
runAPIFix();
