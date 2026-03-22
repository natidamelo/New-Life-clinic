
const mongoose = require('mongoose');
require('dotenv').config();

// Define models briefly
const Patient = mongoose.model('Patient', new mongoose.Schema({
    patientId: String,
    firstName: String,
    lastName: String,
    status: String,
    cardStatus: String,
    isActive: Boolean
}));

const PatientCard = mongoose.model('PatientCard', new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    status: String,
    amountPaid: Number
}));

const Notification = mongoose.model('Notification', new mongoose.Schema({
    type: String,
    data: mongoose.Schema.Types.Mixed
}));

const MedicalInvoice = mongoose.model('MedicalInvoice', new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    status: String,
    balance: Number
}));

async function checkMeklit() {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to DB');

    const meklit = await Patient.findOne({ firstName: /Meklit/i });
    if (!meklit) {
        console.log('Patient Meklit not found');
        process.exit(0);
    }

    console.log('Patient Found:', {
        id: meklit._id,
        name: `${meklit.firstName} ${meklit.lastName}`,
        status: meklit.status,
        cardStatus: meklit.cardStatus,
        active: meklit.isActive
    });

    const card = await PatientCard.findOne({ patient: meklit._id });
    console.log('Card Found:', card ? {
        status: card.status,
        amountPaid: card.amountPaid
    } : 'No card found');

    const notifications = await Notification.find({
        $or: [
            { 'data.patientId': meklit._id },
            { 'data.patientName': /Meklit/i }
        ]
    });
    console.log('Notifications Found:', notifications.length);
    notifications.forEach(n => console.log(` - ${n.type} (Read: ${n.read})`));

    const invoices = await MedicalInvoice.find({
        patient: meklit._id,
        status: { $in: ['pending', 'overdue'] }
    });
    console.log('Unpaid Invoices Found:', invoices.length);
    invoices.forEach(i => console.log(` - ${i.status} (Balance: ${i.balance})`));

    const partialInvoices = await MedicalInvoice.find({
        patient: meklit._id,
        status: 'partial',
        balance: { $gt: 0 }
    });
    console.log('Partial with Balance:', partialInvoices.length);

    process.exit(0);
}

checkMeklit();
