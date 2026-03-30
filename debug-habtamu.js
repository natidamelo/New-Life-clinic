require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const Patient = require('./backend/models/Patient');
const Prescription = require('./backend/models/Prescription');
const NurseTask = require('./backend/models/NurseTask');
const MedicalInvoice = require('./backend/models/MedicalInvoice');

async function run() {
  console.log('Starting debug script...');
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('Connecting to MongoDB...');
    console.log('Using URI (masked):', uri ? uri.replace(/\/\/.*@/, '//***@') : 'MISSING');
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, 
    });
    console.log('Connected to MongoDB');

    const patient = await Patient.findOne({ 
      $or: [
        { firstName: /Habtamu/i },
        { lastName: /Habtamu/i }
      ]
    });

    if (!patient) {
      console.log('Patient Habtamu not found');
      process.exit(0);
    }

    console.log(`\n========================================`);
    console.log(`Found Patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);
    console.log(`========================================\n`);

    const prescriptions = await Prescription.find({ 
      $or: [
        { patient: patient._id },
        { patientId: patient._id }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${prescriptions.length} Prescriptions:`);
    prescriptions.forEach(p => {
      console.log(`- ${p.medicationName} (${p._id}):`);
      console.log(`  * Status: ${p.status}, PaymentStatus: ${p.paymentStatus}`);
      console.log(`  * Created: ${p.createdAt}`);
      console.log(`  * InvoiceId: ${p.invoiceId}`);
      if (p.medications && p.medications.length > 0) {
        console.log(`  * Array medications: ${p.medications.map(m => m.name || m.medicationName).join(', ')}`);
      }
    });

    console.log(`\n----------------------------------------\n`);

    const tasks = await NurseTask.find({ patientId: patient._id }).sort({ createdAt: -1 });
    console.log(`Found ${tasks.length} Nurse Tasks:`);
    tasks.forEach(t => {
      console.log(`- ${t.medicationDetails?.medicationName} (${t._id}):`);
      console.log(`  * Status: ${t.status}, Type: ${t.taskType}`);
      console.log(`  * PrescriptionId: ${t.prescriptionId || t.medicationDetails?.prescriptionId}`);
      console.log(`  * Created: ${t.createdAt}`);
      console.log(`  * PaymentStatus: ${t.paymentStatus}, CanAdminister: ${t.paymentAuthorization?.canAdminister}`);
    });

    console.log(`\n----------------------------------------\n`);

    const invoices = await MedicalInvoice.find({ patient: patient._id }).sort({ createdAt: -1 });
    console.log(`Found ${invoices.length} Invoices:`);
    for (const inv of invoices) {
      console.log(`- Invoice ${inv.invoiceNumber} (${inv._id}):`);
      console.log(`  * Status: ${inv.status}, Total: ${inv.total}, Balance: ${inv.balance}`);
      console.log(`  * Items (${inv.items.length}):`);
      inv.items.forEach(item => {
        console.log(`    - Item: ${item.description}`);
        console.log(`      * Metadata PrescriptionId: ${item.metadata?.prescriptionId || item.prescriptionId}`);
      });
    }

  } catch (err) {
    console.error('Error during debug:', err);
  } finally {
    console.log('\nShutting down...');
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Global timeout to prevent hanging
setTimeout(() => {
  console.log('Debug script timed out after 30 seconds');
  process.exit(1);
}, 30000);

run();
