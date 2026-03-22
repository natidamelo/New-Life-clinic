const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const NurseTask = require('./models/NurseTask');

async function showDetailedMedicationData() {
  try {
    console.log('🔍 Fetching detailed medication data from database...\n');

    // Find all medication tasks with full details
    const medicationTasks = await NurseTask.find({ taskType: 'MEDICATION' }).lean();

    console.log(`📊 Found ${medicationTasks.length} medication tasks in database\n`);

    if (medicationTasks.length === 0) {
      console.log('❌ No medication tasks found.');
      return;
    }

    // Display detailed information for each task
    medicationTasks.forEach((task, index) => {
      console.log(`🏥 **Task ${index + 1}**`);
      console.log(`   ID: ${task._id}`);
      console.log(`   Patient: ${task.patientName || 'Unknown'}`);
      console.log(`   Description: ${task.description}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority}`);
      console.log(`   Assigned To: ${task.assignedTo || 'Unassigned'}`);
      
      // Medication Details
      if (task.medicationDetails) {
        console.log(`   💊 Medication Details:`);
        console.log(`      Name: ${task.medicationDetails.medicationName || 'N/A'}`);
        console.log(`      Dosage: ${task.medicationDetails.dosage || 'N/A'}`);
        console.log(`      Route: ${task.medicationDetails.route || 'N/A'}`);
        console.log(`      Frequency: ${task.medicationDetails.frequency || 'N/A'}`);
        console.log(`      Duration: ${task.medicationDetails.duration || 'N/A'} days`);
        console.log(`      Start Date: ${task.medicationDetails.startDate ? new Date(task.medicationDetails.startDate).toLocaleDateString() : 'N/A'}`);
        
        // Dose Records
        if (task.medicationDetails.doseRecords && task.medicationDetails.doseRecords.length > 0) {
          console.log(`      📋 Dose Records: ${task.medicationDetails.doseRecords.length} records`);
          task.medicationDetails.doseRecords.forEach((record, recordIndex) => {
            console.log(`         Record ${recordIndex + 1}: Day ${record.day}, Time: ${record.timeSlot}, Administered: ${record.administered ? 'Yes' : 'No'}`);
            if (record.administered) {
              console.log(`            Administered At: ${record.administeredAt ? new Date(record.administeredAt).toLocaleString() : 'N/A'}`);
              console.log(`            Administered By: ${record.administeredBy || 'N/A'}`);
            }
          });
        } else {
          console.log(`      📋 Dose Records: No records found`);
        }
      } else {
        console.log(`   💊 Medication Details: Not available`);
      }

      // Payment Authorization
      if (task.paymentAuthorization) {
        console.log(`   💰 Payment Authorization:`);
        console.log(`      Status: ${task.paymentAuthorization.paymentStatus || 'N/A'}`);
        console.log(`      Total Amount: ${task.paymentAuthorization.totalAmount || 'N/A'} ETB`);
        console.log(`      Paid Amount: ${task.paymentAuthorization.paidAmount || 'N/A'} ETB`);
        console.log(`      Due Amount: ${task.paymentAuthorization.dueAmount || 'N/A'} ETB`);
        console.log(`      Authorized Doses: ${task.paymentAuthorization.authorizedDoses || 'N/A'}`);
        console.log(`      Total Days: ${task.paymentAuthorization.totalDays || 'N/A'}`);
      } else {
        console.log(`   💰 Payment Authorization: Not available`);
      }

      console.log(`   📅 Created: ${task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}`);
      console.log(`   📅 Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}`);
      console.log('');
    });

    // Summary statistics
    console.log('📈 **Summary Statistics**');
    console.log(`   Total Tasks: ${medicationTasks.length}`);
    console.log(`   Pending: ${medicationTasks.filter(t => t.status === 'PENDING').length}`);
    console.log(`   High Priority: ${medicationTasks.filter(t => t.priority === 'HIGH').length}`);
    console.log(`   Assigned: ${medicationTasks.filter(t => t.assignedTo).length}`);
    console.log(`   Unassigned: ${medicationTasks.filter(t => !t.assignedTo).length}`);
    
    // Frequency analysis
    const frequencies = {};
    medicationTasks.forEach(task => {
      if (task.medicationDetails?.frequency) {
        const freq = task.medicationDetails.frequency;
        frequencies[freq] = (frequencies[freq] || 0) + 1;
      }
    });
    
    if (Object.keys(frequencies).length > 0) {
      console.log(`   📊 Frequency Distribution:`);
      Object.entries(frequencies).forEach(([freq, count]) => {
        console.log(`      ${freq}: ${count} tasks`);
      });
    }

  } catch (error) {
    console.error('❌ Error fetching medication data:', error);
  } finally {
    mongoose.connection.close();
  }
}

showDetailedMedicationData();
