const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function run() {
  console.log('Connecting to:', MONGO_URI.substring(0, 30) + '...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const HealthPackage = require('../backend/models/HealthPackage');
  const PatientPackage = require('../backend/models/PatientPackage');
  const Patient = require('../backend/models/Patient');
  const MedicalInvoice = require('../backend/models/MedicalInvoice');

  console.log('\n--- HEALTH PACKAGES CATALOG ---');
  const templates = await HealthPackage.find();
  templates.forEach(t => console.log(`Template ID: ${t._id}, Name: "${t.name}", Price: ${t.price}`));

  console.log('\n--- ABEBE DEBEL PATIENT INFO ---');
  const patient = await Patient.findOne({ firstName: /Abebe/i, lastName: /Debel/i });
  if (!patient) {
    console.log('Patient Abebe Debel not found!');
  } else {
    console.log(`Patient ID: ${patient._id}, patientId: "${patient.patientId}", Name: "${patient.firstName} ${patient.lastName}"`);

    console.log('\n--- PATIENT PACKAGES ---');
    const pkgs = await PatientPackage.find({ patient_id: patient._id });
    pkgs.forEach(p => {
      console.log(`Pkg ID: ${p._id}, package_id: ${p.package_id}, Status: ${p.status}, Payment Status: ${p.payment_status}, Paid: ${p.amount_paid}, Balance: ${p.balance_due}`);
    });

    console.log('\n--- PATIENT INVOICES ---');
    const invoices = await MedicalInvoice.find({ patient: patient._id });
    invoices.forEach(inv => {
      console.log(`Invoice ID: ${inv._id}, Num: ${inv.invoiceNumber}, Status: ${inv.status}, Total: ${inv.total}, Paid: ${inv.amountPaid}, Balance: ${inv.balance}`);
      console.log('Items:', JSON.stringify(inv.items, null, 2));
      console.log('Payments:', JSON.stringify(inv.payments, null, 2));
    });
  }

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
});
