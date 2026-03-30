
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function forceSync() {
  await mongoose.connect(MONGODB_URI);
  const NurseTask = mongoose.model('NurseTask', new mongoose.Schema({}, { strict: false }));
  const Prescription = mongoose.model('Prescription', new mongoose.Schema({}, { strict: false }));
  const Patient = mongoose.model('Patient', new mongoose.Schema({}, { strict: false }));
  
  const h = await Patient.findOne({ firstName: /Habtamu/i });
  const pres = await Prescription.find({ patient: h._id });
  
  for(const p of pres) {
    console.log(`P: ${p.medicationName} (${p._id})`);
    if (p.medications && p.medications.length > 0) {
      for(const m of p.medications) {
         const exists = await NurseTask.findOne({ 
           patientId: h._id,
           'medicationDetails.prescriptionId': p._id,
           'medicationDetails.medicationName': m.name
         });
         if (!exists) {
            console.log(`🚨 CREATING: ${m.name}`);
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
                   authorizedDoses: 100,
                   lastUpdated: new Date()
                }
            });
            await nt.save();
         } else {
            console.log(`✅ EX: ${m.name}`);
         }
      }
    }
  }
}
forceSync().then(() => process.exit(0)).catch(console.error);
