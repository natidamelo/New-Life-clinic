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
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected successfully!');
    const db = client.db('clinic-cms');

    // 1. Find patient Abebe Debel
    const patient = await db.collection('patients').findOne({ firstName: /Abebe/i, lastName: /Debel/i });
    if (!patient) {
      console.error('Patient Abebe Debel not found!');
      return;
    }
    console.log(`Found Patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);

    // 2. Find the invoice for Abebe Debel's health package subscription
    const invoice = await db.collection('medicalinvoices').findOne({
      patient: patient._id,
      'items.description': /Health Package Subscription: Diabetic Package/i
    });
    
    if (!invoice) {
      console.error('Invoice for Abebe Debel not found!');
      return;
    }
    console.log(`Found Invoice: ${invoice.invoiceNumber}, Status: ${invoice.status}, Total: ${invoice.total}, Paid: ${invoice.amountPaid}, Balance: ${invoice.balance}`);

    // 3. Find the duplicate HealthPackage templates
    const templates = await db.collection('healthpackages').find({ name: /Diabetic Package/i }).toArray();
    const templateIds = templates.map(t => t._id);
    console.log(`Matching HealthPackage template IDs:`, templateIds);

    // 4. Find the active subscription for Abebe Debel
    const patientPackage = await db.collection('patientpackages').findOne({
      patient_id: patient._id,
      package_id: { $in: templateIds },
      status: 'active'
    });

    if (!patientPackage) {
      console.error('Active PatientPackage subscription not found for Abebe Debel!');
      return;
    }
    console.log(`Found PatientPackage subscription: ${patientPackage._id}, Current Paid: ${patientPackage.amount_paid}, Balance Due: ${patientPackage.balance_due}`);

    // 5. Update the PatientPackage subscription with the invoice details
    const amountPaid = invoice.amountPaid;
    const balanceDue = invoice.balance;
    let paymentStatus = 'pending';
    if (balanceDue === 0) {
      paymentStatus = 'paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partial';
    }

    console.log(`Updating PatientPackage to: Paid=${amountPaid}, Balance=${balanceDue}, Status=${paymentStatus}...`);
    const updateResult = await db.collection('patientpackages').updateOne(
      { _id: patientPackage._id },
      {
        $set: {
          amount_paid: amountPaid,
          balance_due: balanceDue,
          payment_status: paymentStatus,
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('✅ Reconciled PatientPackage subscription successfully!');
    } else {
      console.log('ℹ️ PatientPackage was already up-to-date.');
    }

  } catch (err) {
    console.error('Error during reconciliation:', err);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

run();
