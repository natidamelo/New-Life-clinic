const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function fixNurseTasks() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('Connecting to MongoDB at:', mongoURI);
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully!');
    
    // Access the nursetasks collection directly
    const db = mongoose.connection.db;
    const collection = db.collection('nursetasks');
    
    // Find all tasks
    const tasks = await collection.find({}).toArray();
    console.log(`Found ${tasks.length} nurse tasks`);
    
    // Update each task with required fields
    for (const task of tasks) {
      console.log(`Processing task: ${task._id}`);
      
      const updates = {};
      
      // Add status if missing
      if (!task.status) {
        updates.status = 'PENDING';
      }
      
      // Add priority if missing
      if (!task.priority) {
        updates.priority = 'MEDIUM';
      }
      
      // Add due date if missing
      if (!task.dueDate) {
        updates.dueDate = new Date();
      }
      
      // Add medication details if it's a medication task and details are missing
      if (task.taskType === 'MEDICATION' && !task.medicationDetails) {
        // Extract medication name from description
        const description = task.description || '';
        const parts = description.split(' ');
        const medicationName = parts.length > 1 ? parts[1] : 'Unknown medication';
        const dosage = parts.length > 2 ? parts[2] : '1 dose';
        
        updates.medicationDetails = {
          medicationName: medicationName,
          dosage: dosage,
          frequency: 'Once daily',
          route: 'Oral',
          instructions: description
        };
      }
      
      // Add assignedByName if missing
      if (!task.assignedByName) {
        updates.assignedByName = 'System Administrator';
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        console.log('Applying updates:', updates);
        await collection.updateOne({ _id: task._id }, { $set: updates });
        console.log('Task updated successfully');
      } else {
        console.log('No updates needed for this task');
      }
    }
    
    console.log('All tasks processed successfully');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error fixing nurse tasks:', error);
  }
}

// Run the function
fixNurseTasks(); 
