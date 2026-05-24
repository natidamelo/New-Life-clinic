const mongoose = require('mongoose');

async function run() {
  const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  
  try {
    await mongoose.connect(uri);
    const MedicalInvoice = mongoose.connection.collection('medicalinvoices');

    const inv = await MedicalInvoice.findOne({ invoiceNumber: 'FS NO.00000723' });
    console.log("Invoice FS NO.00000723:", JSON.stringify(inv, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
