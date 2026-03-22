const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('Attempting to connect to MongoDB at:', mongoURI);
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully!');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(coll => console.log(`- ${coll.name}`));
    
    // Find nursetasks collection
    const hasNurseTasks = collections.some(coll => coll.name === 'nursetasks');
    
    if (hasNurseTasks) {
      // Try to find documents in nursetasks collection
      console.log('\nQuerying nursetasks collection...');
      const tasks = await mongoose.connection.db.collection('nursetasks').find({}).toArray();
      
      console.log(`Found ${tasks.length} nurse tasks:`);
      tasks.forEach((task, i) => {
        console.log(`\n--- Task ${i+1} ---`);
        console.log(`ID: ${task._id}`);
        console.log(`Patient: ${task.patientName || 'Unknown patient'}`);
        console.log(`Type: ${task.taskType || 'Unknown type'}`);
        console.log(`Description: ${task.description || 'No description'}`);
        console.log(`Status: ${task.status || 'No status'}`);
        
        if (task.medicationDetails) {
          console.log('Medication Details:');
          console.log(`  Name: ${task.medicationDetails.medicationName || 'Unknown'}`);
          console.log(`  Dosage: ${task.medicationDetails.dosage || 'Not specified'}`);
          console.log(`  Frequency: ${task.medicationDetails.frequency || 'Not specified'}`);
          console.log(`  Route: ${task.medicationDetails.route || 'Not specified'}`);
        }
      });
    } else {
      console.log('\nNo nursetasks collection found');
    }
    
    mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

// Run the test
connectToMongoDB(); 
