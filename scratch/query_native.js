const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('MONGODB_URI not found in env!');
  process.exit(1);
}

async function run() {
  console.log('Connecting to:', MONGO_URI.substring(0, 30) + '...');
  const client = new MongoClient(MONGO_URI, { connectTimeoutMS: 5000 });
  
  try {
    await client.connect();
    console.log('Connected successfully using native driver!');
    const db = client.db('clinic-cms'); // The database name in the URI is clinic-cms

    console.log('\n--- HEALTH PACKAGES CATALOG ---');
    const templates = await db.collection('healthpackages').find().toArray();
    console.log(`Found ${templates.length} templates:`);
    templates.forEach(t => console.log(`Template ID: ${t._id}, Name: "${t.name}", Price: ${t.price}`));

    console.log('\n--- ABEBE DEBEL PATIENT INFO ---');
    const patient = await db.collection('patients').findOne({ firstName: /Abebe/i, lastName: /Debel/i });
    if (!patient) {
      console.log('Patient Abebe Debel not found!');
    } else {
      console.log(`Patient ID: ${patient._id}, patientId: "${patient.patientId}", Name: "${patient.firstName} ${patient.lastName}"`);

      console.log('\n--- PATIENT PACKAGES ---');
      const pkgs = await db.collection('patientpackages').find({ patient_id: patient._id }).toArray();
      console.log(`Found ${pkgs.length} packages:`);
      pkgs.forEach(p => {
        console.log(`Pkg ID: ${p._id}, package_id: ${p.package_id}, Status: ${p.status}, Payment Status: ${p.payment_status}, Paid: ${p.amount_paid}, Balance: ${p.balance_due}`);
      });

      console.log('\n--- PATIENT INVOICES ---');
      const invoices = await db.collection('medicalinvoices').find({ patient: patient._id }).toArray();
      console.log(`Found ${invoices.length} invoices:`);
      invoices.forEach(inv => {
        console.log(`Invoice ID: ${inv._id}, Num: ${inv.invoiceNumber}, Status: ${inv.status}, Total: ${inv.total}, Paid: ${inv.amountPaid}, Balance: ${inv.balance}`);
        console.log('Items:', JSON.stringify(inv.items, null, 2));
        console.log('Payments:', JSON.stringify(inv.payments, null, 2));
      });
    }

  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

run();
