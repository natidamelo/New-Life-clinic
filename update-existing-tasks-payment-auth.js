const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB (clinic_cms)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// NurseTask Schema (simplified for this script)
const nurseTaskSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  patientName: String,
  taskType: String,
  description: String,
  status: String,
  priority: String,
  medicationDetails: {
    medicationName: String,
    dosage: String,
    frequency: String,
    route: String,
    instructions: String,
    duration: Number,
    doseRecords: [{
      day: Number,
      timeSlot: String,
      administered: Boolean,
      administeredAt: Date,
      administeredBy: String,
      notes: String
    }]
  },
  paymentAuthorization: {
    paymentStatus: { type: String, enum: ['unpaid', 'partially_paid', 'fully_paid'], default: 'unpaid' },
    paidDays: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
    authorizedDoses: { type: Number, default: 0 },
    unauthorizedDoses: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
}, { timestamps: true });

const NurseTask = mongoose.model('NurseTask', nurseTaskSchema);

async function updateTasksWithPaymentAuth() {
  try {
    await connectDB();
    
    // Find all medication tasks for Samuel Negatu
    const samuelTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      patientName: { $regex: /samuel.*negatu/i }
    });
    
    console.log(`📋 Found ${samuelTasks.length} medication tasks for Samuel Negatu`);
    
    // Update each task with proper payment authorization
    let updatedCount = 0;
    for (const task of samuelTasks) {
      // Calculate total doses based on frequency and duration
      let dosesPerDay = 1;
      if (task.medicationDetails?.frequency) {
        const freq = task.medicationDetails.frequency.toLowerCase();
        if (freq.includes('twice') || freq.includes('bid') || freq.includes('2x')) {
          dosesPerDay = 2;
        } else if (freq.includes('three') || freq.includes('tid') || freq.includes('3x')) {
          dosesPerDay = 3;
        } else if (freq.includes('four') || freq.includes('qid') || freq.includes('4x')) {
          dosesPerDay = 4;
        }
      }
      
      const duration = task.medicationDetails?.duration || 7;
      const totalDoses = dosesPerDay * duration;
      const costPerDose = 25; // ETB 25 per dose
      const totalCost = totalDoses * costPerDose;
      
      // Set payment authorization for UNPAID status
      task.paymentAuthorization = {
        paymentStatus: 'unpaid',
        paidDays: 0,
        totalDays: duration,
        authorizedDoses: 0,
        unauthorizedDoses: totalDoses,
        outstandingAmount: totalCost,
        lastUpdated: new Date()
      };
      
      await task.save();
      updatedCount++;
      
      console.log(`✅ Updated task ${task._id}: ${task.medicationDetails?.medicationName} - ETB ${totalCost} outstanding`);
    }
    
    // Find all medication tasks for Natan Kinfe
    const natanTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      patientName: { $regex: /natan.*kinfe/i }
    });
    
    console.log(`📋 Found ${natanTasks.length} medication tasks for Natan Kinfe`);
    
    // Update Natan's tasks with PARTIALLY_PAID status
    for (const task of natanTasks) {
      let dosesPerDay = 1;
      if (task.medicationDetails?.frequency) {
        const freq = task.medicationDetails.frequency.toLowerCase();
        if (freq.includes('twice') || freq.includes('bid') || freq.includes('2x')) {
          dosesPerDay = 2;
        } else if (freq.includes('three') || freq.includes('tid') || freq.includes('3x')) {
          dosesPerDay = 3;
        }
      }
      
      const duration = task.medicationDetails?.duration || 5;
      const totalDoses = dosesPerDay * duration;
      const costPerDose = 25;
      const totalCost = totalDoses * costPerDose;
      
      // Set as partially paid (paid for 3 days out of 5)
      const paidDays = 3;
      const paidDoses = paidDays * dosesPerDay;
      const unpaidDoses = totalDoses - paidDoses;
      const outstandingAmount = unpaidDoses * costPerDose;
      
      task.paymentAuthorization = {
        paymentStatus: 'partially_paid',
        paidDays: paidDays,
        totalDays: duration,
        authorizedDoses: paidDoses,
        unauthorizedDoses: unpaidDoses,
        outstandingAmount: outstandingAmount,
        lastUpdated: new Date()
      };
      
      await task.save();
      updatedCount++;
      
      console.log(`✅ Updated task ${task._id}: ${task.medicationDetails?.medicationName} - ETB ${outstandingAmount} outstanding (partially paid)`);
    }
    
    console.log(`\n🎯 Payment Authorization Update Complete!`);
    console.log(`   - Updated ${updatedCount} tasks total`);
    console.log(`   - Samuel Negatu: UNPAID status (red badges expected)`);
    console.log(`   - Natan Kinfe: PARTIALLY_PAID status (yellow badges expected)`);
    console.log(`\n💡 Refresh your frontend to see the updated payment status indicators`);
    
  } catch (error) {
    console.error('❌ Error updating tasks:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the update
updateTasksWithPaymentAuth();
