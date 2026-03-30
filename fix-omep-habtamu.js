
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function forceCreate() {
  await mongoose.connect(MONGODB_URI);
  const NurseTask = require('./backend/models/NurseTask');
  const Prescription = require('./backend/models/Prescription');
  const Patient = require('./backend/models/Patient');
  
  const h = await Patient.findOne({ firstName: /Habtamu/i });
  const pList = await Prescription.find({ patient: h._id });
  
  for (const p of pList) {
    console.log(`P: ${p.medicationName}`);
    if (p.medications && p.medications.length > 0) {
      for (const m of p.medications) {
        // Check if Omeprazole task exists
        if (m.name === 'Omeprazole' || m.name === 'Omniprazole') {
           const exists = await NurseTask.findOne({ 
             prescriptionId: p._id,
             'medicationDetails.medicationName': m.name 
           });
           if (!exists) {
              console.log(`🚨 CREATING MISSING TASK FOR ${m.name}`);
              // Fallback creation logic copied from utils
              const nt = new NurseTask({
                patientId: h._id,
                patientName: `${h.firstName} ${h.lastName}`,
                description: `Administer ${m.name}`,
                taskType: 'MEDICATION',
                priority: 'MEDIUM',
                status: 'PENDING',
                dueDate: new Date(),
                medicationDetails: {
                   prescriptionId: p._id,
                   medicationName: m.name,
                   dosage: m.dosage,
                   frequency: m.frequency,
                   duration: parseInt(m.duration) || 1,
                   route: m.route || 'Oral',
                   instanceLabel: 'Fixed'
                },
                paymentAuthorization: {
                   paymentStatus: p.paymentStatus === 'paid' ? 'fully_paid' : 'unpaid',
                   canAdminister: p.paymentStatus === 'paid',
                   authorizedDoses: 100, // force high
                   lastUpdated: new Date()
                }
              });
              await nt.save();
           } else {
             console.log(`✅ ${m.name} task already exists`);
           }
        }
      }
    }
  }
  process.exit(0);
}
forceCreate().catch(console.error);
