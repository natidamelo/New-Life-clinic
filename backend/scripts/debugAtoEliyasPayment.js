const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('../models/Invoice');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');

async function debugAtoEliyasPayment() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find patient by name or ID
    const patient = await Patient.findOne({ 
      $or: [
        { name: { $regex: /ato\s*eliyas/i } },
        { _id: { $regex: /e1fe3d35/ } }
      ]
    });

    if (!patient) {
      console.error('❌ No patient found for Ato Eliyas');
      return;
    }

    console.log('👤 Patient Details:', {
      id: patient._id,
      name: patient.name,
      shortId: patient._id.toString().slice(0, 8)
    });

    // Find all prescriptions for this patient
    const prescriptions = await Prescription.find({ 
      $or: [
        { patient: patient._id },
        { patientId: { $regex: patient._id.toString().slice(0, 8) } }
      ]
    }).populate('medications');

    console.log(`\n📋 Total Prescriptions: ${prescriptions.length}`);

    // Aggregate medication details
    const medicationDetails = [];
    let totalPrescriptionCost = 0;

    prescriptions.forEach((prescription, index) => {
      console.log(`\n📝 Prescription ${index + 1}:`);
      
      prescription.medications.forEach(med => {
        const medCost = med.quantity * med.unitPrice;
        medicationDetails.push({
          medicationName: med.medicationName,
          quantity: med.quantity,
          unitPrice: med.unitPrice,
          totalCost: medCost
        });
        totalPrescriptionCost += medCost;
        
        console.log(`   💊 ${med.medicationName}: 
         Qty: ${med.quantity}, 
         Unit Price: ${med.unitPrice} ETB, 
         Total: ${medCost} ETB`);
      });
    });

    // Find invoices for this patient
    const invoices = await Invoice.find({ 
      $or: [
        { patient: patient._id },
        { patientId: { $regex: patient._id.toString().slice(0, 8) } }
      ]
    });

    console.log(`\n💰 Total Invoices: ${invoices.length}`);
    
    invoices.forEach((invoice, index) => {
      console.log(`\n💵 Invoice ${index + 1}:`, {
        id: invoice._id,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status
      });
    });

    console.log(`\n🧮 Summary:`);
    console.log(`   Total Prescription Cost: ${totalPrescriptionCost} ETB`);
    console.log(`   Medication Details:`, medicationDetails);

  } catch (error) {
    console.error('❌ Error in debugging:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

debugAtoEliyasPayment();
