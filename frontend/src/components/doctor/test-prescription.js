/**
 * Test utility to manually create a nurse medication task
 * 
 * Run this in the browser console after loading the app
 */

// Replace these with actual values from your database
const patientId = "6462a3754e7aecbafec23bc1"; // Example ID, replace with real one
const patientName = "Test Patient";
const medicationName = "Paracetamol";
const dosage = "500mg";
const frequency = "Every 8 hours";
const route = "Oral";

// Function to create a nurse task
async function createTestMedicationTask() {
  try {
    // Get auth token
    const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || '';
    
    if (!token) {
      console.error("No authentication token found. Please log in first.");
      return;
    }
    
    // Create the task data
    const taskData = {
      patientId,
      patientName,
      taskType: "MEDICATION",
      description: `Administer ${medicationName} ${dosage}`,
      status: "PENDING",
      priority: "NORMAL",
      dueDate: new Date().toISOString(),
      notes: "This is a test medication task",
      medicationDetails: {
        medicationName,
        dosage,
        frequency,
        route,
        instructions: "Take with food"
      }
    };
    
    // Send the request
    const response = await fetch('/api/nurse-tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    console.log("✅ Test medication task created successfully:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Failed to create test medication task:", error);
  }
}

// Execute the function
createTestMedicationTask()
  .then(task => {
    console.log("You can now check the nurse medication administration page to see this task");
  })
  .catch(err => {
    console.error("Test failed:", err);
  });

// To run this file:
// 1. Copy this code
// 2. Open your browser console on the app
// 3. Paste and run the code
// 4. Check your nurse medication administration page to see if the task appears 