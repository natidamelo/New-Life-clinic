/**
 * Browser Console Script: Sync Missing Nurse Tasks
 * 
 * Copy and paste this script into your browser console while logged in
 * to sync all paid medications with nurse tasks.
 */

// Function to get auth token from localStorage or sessionStorage
function getAuthToken() {
  // Try different possible token storage locations
  const token = localStorage.getItem('token') || 
                localStorage.getItem('authToken') || 
                localStorage.getItem('jwt') ||
                sessionStorage.getItem('token') ||
                sessionStorage.getItem('authToken') ||
                sessionStorage.getItem('jwt');
  
  if (!token) {
    console.error('❌ No authentication token found. Please make sure you are logged in.');
    return null;
  }
  
  console.log('✅ Found authentication token');
  return token;
}

// Function to make API calls with authentication
async function makeAuthenticatedRequest(url, method = 'GET', body = null) {
  const token = getAuthToken();
  if (!token) return null;
  
  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ API call failed:`, error);
    return null;
  }
}

// Main synchronization function
async function syncNurseTasks() {
  console.log('🚀 Starting nurse task synchronization...\n');
  
  const baseUrl = window.location.origin + '/api/medication-nurse-sync';
  
  // Step 1: Check current status
  console.log('📍 Step 1: Checking current status...');
  const status = await makeAuthenticatedRequest(`${baseUrl}/status`);
  
  if (status) {
    console.log('📊 Current Status:');
    console.log(`   📋 Total paid prescriptions: ${status.data.totalPaidPrescriptions}`);
    console.log(`   🏥 Total medication tasks: ${status.data.totalMedicationTasks}`);
    console.log(`   ⏳ Pending medication tasks: ${status.data.pendingMedicationTasks}`);
    console.log(`   📅 Recent tasks (last 24h): ${status.data.recentTasks.length}\n`);
  }
  
  // Step 2: Find and fix orphaned medications
  console.log('📍 Step 2: Finding and fixing orphaned medications...');
  const orphanedResult = await makeAuthenticatedRequest(`${baseUrl}/find-orphaned`, 'POST');
  
  if (orphanedResult) {
    console.log('✅ Orphaned medications check completed:');
    console.log(`   🔍 Total medications checked: ${orphanedResult.data.totalMedications || 'N/A'}`);
    console.log(`   🚨 Orphaned found: ${orphanedResult.data.orphanedMedications}`);
    console.log(`   ✅ Fixed: ${orphanedResult.data.fixed}`);
    console.log(`   ❌ Errors: ${orphanedResult.data.errors}\n`);
    
    if (orphanedResult.data.details && orphanedResult.data.details.length > 0) {
      console.log('📋 Details:');
      orphanedResult.data.details.forEach((detail, index) => {
        const status = detail.fixed ? '✅' : '❌';
        console.log(`   ${index + 1}. ${status} ${detail.patientName} - ${detail.medicationName}`);
      });
      console.log('');
    }
  }
  
  // Step 3: Complete synchronization
  console.log('📍 Step 3: Running complete synchronization...');
  const syncResult = await makeAuthenticatedRequest(`${baseUrl}/sync-all`, 'POST');
  
  if (syncResult) {
    console.log('✅ Complete synchronization completed:');
    console.log(`   📋 Total prescriptions: ${syncResult.data.totalPaidPrescriptions}`);
    console.log(`   💊 Total medications: ${syncResult.data.totalMedications || 'N/A'}`);
    console.log(`   ✅ Tasks created: ${syncResult.data.tasksCreated}`);
    console.log(`   ⏭️ Tasks skipped: ${syncResult.data.tasksSkipped}`);
    console.log(`   ❌ Errors: ${syncResult.data.errors}\n`);
  }
  
  // Step 4: Check final status
  console.log('📍 Step 4: Checking final status...');
  const finalStatus = await makeAuthenticatedRequest(`${baseUrl}/status`);
  
  if (finalStatus) {
    console.log('📊 Final Status:');
    console.log(`   📋 Total paid prescriptions: ${finalStatus.data.totalPaidPrescriptions}`);
    console.log(`   🏥 Total medication tasks: ${finalStatus.data.totalMedicationTasks}`);
    console.log(`   ⏳ Pending medication tasks: ${finalStatus.data.pendingMedicationTasks}`);
    console.log(`   📅 Recent tasks (last 24h): ${finalStatus.data.recentTasks.length}\n`);
    
    if (finalStatus.data.recentTasks.length > 0) {
      console.log('📋 Recent Tasks:');
      finalStatus.data.recentTasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.patientName} - ${task.medicationName} (${task.status})`);
      });
    }
  }
  
  console.log('\n🎉 Synchronization completed!');
  console.log('🔄 Please refresh the Medication Administration page to see the updated tasks.');
  console.log('💡 If you still don\'t see all tasks, try logging out and logging back in.');
}

// Auto-run the synchronization
console.log('🔧 Nurse Task Synchronization Script Loaded');
console.log('🎯 This will sync all paid medications with nurse tasks');
console.log('⚡ Starting synchronization in 2 seconds...\n');

setTimeout(() => {
  syncNurseTasks().catch(error => {
    console.error('💥 Synchronization failed:', error);
  });
}, 2000);
