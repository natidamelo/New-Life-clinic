const mongoose = require('mongoose');
require('dotenv').config(); // Ensure environment variables are loaded

const Invoice = require('../models/Invoice');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');

async function checkAtoEliyasData() {
  try {
    // Use environment variable or fallback to local connection
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('Connecting to MongoDB at:', mongoURI);

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully');

    // Find patient by name or ID fragment
    const patient = await Patient.findOne({ 
      $or: [
        { name: { $regex: /ato\s*eliyas/i } },
        { _id: { $regex: /e1fe3d35/ } }
      ]
    });

    if (!patient) {
      console.log('❌ No patient found for Ato Eliyas');
      return;
    }

    console.log('👤 Patient Found:', {
      id: patient._id,
      name: patient.name,
      shortId: patient._id.toString().slice(0, 8)
    });

    // Find prescriptions for this patient
    const prescriptions = await Prescription.find({ 
      $or: [
        { patient: patient._id },
        { patientId: { $regex: patient._id.toString().slice(0, 8) } }
      ]
    }).populate('medications');

    console.log(`📋 Found ${prescriptions.length} prescriptions`);
    
    prescriptions.forEach((prescription, index) => {
      console.log(`\n📝 Prescription ${index + 1}:`, {
        id: prescription._id,
        patientId: prescription.patientId,
        medications: prescription.medications.map(med => ({
          name: med.medicationName,
          quantity: med.quantity,
          unitPrice: med.unitPrice
        }))
      });
    });

    // Find invoices for this patient
    const invoices = await Invoice.find({ 
      $or: [
        { patient: patient._id },
        { patientId: { $regex: patient._id.toString().slice(0, 8) } }
      ]
    });

    console.log(`💰 Found ${invoices.length} invoices`);
    invoices.forEach((invoice, index) => {
      console.log(`\n💵 Invoice ${index + 1}:`, {
        id: invoice._id,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status
      });
    });

  } catch (error) {
    console.error('❌ Error checking Ato Eliyas data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

checkAtoEliyasData();
