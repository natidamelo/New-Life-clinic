const mongoose = require('mongoose');
const Prescription = require('./backend/models/Prescription');
const Patient = require('./backend/models/Patient');

async function findLaloDexamethasone() {
    try {
        await mongoose.connect('mongodb://localhost:27017/clinic');
        console.log('Connected to database');
        
        // First, find Lalo in the Patient collection
        const laloPatient = await Patient.findOne({
            $or: [
                { firstName: { $regex: /lalo/i } },
                { lastName: { $regex: /lalo/i } },
                { patientId: { $regex: /lalo/i } }
            ]
        });
        
        if (laloPatient) {
            console.log(`\nFound Lalo:`);
            console.log(`   Patient ID: ${laloPatient.patientId}`);
            console.log(`   MongoDB ID: ${laloPatient._id}`);
            console.log(`   Name: ${laloPatient.firstName} ${laloPatient.lastName}`);
            
            // Find prescriptions for this patient
            const prescriptions = await Prescription.find({
                patient: laloPatient._id
            }).sort({createdAt: -1});
            
            console.log(`\nFound ${prescriptions.length} prescriptions for Lalo:`);
            
            prescriptions.forEach((prescription, index) => {
                console.log(`\n${index + 1}. Prescription ID: ${prescription._id}`);
                console.log(`   Medication: ${prescription.medicationName}`);
                console.log(`   Status: ${prescription.status}`);
                console.log(`   Payment Status: ${prescription.paymentStatus}`);
                console.log(`   Duration: ${prescription.duration}`);
                console.log(`   Created: ${prescription.createdAt}`);
                console.log(`   Patient ID: ${prescription.patient}`);
            });
            
            // Specifically look for Dexamethasone prescriptions for Lalo
            const laloDexamethasone = await Prescription.find({
                patient: laloPatient._id,
                medicationName: { $regex: /dexamethasone/i }
            }).sort({createdAt: -1});
            
            console.log(`\n\nFound ${laloDexamethasone.length} Dexamethasone prescriptions for Lalo:`);
            
            laloDexamethasone.forEach((prescription, index) => {
                console.log(`\n${index + 1}. Dexamethasone Prescription ID: ${prescription._id}`);
                console.log(`   Status: ${prescription.status}`);
                console.log(`   Payment Status: ${prescription.paymentStatus}`);
                console.log(`   Duration: ${prescription.duration}`);
                console.log(`   Created: ${prescription.createdAt}`);
                console.log(`   Dosage: ${prescription.dosage}`);
                console.log(`   Frequency: ${prescription.frequency}`);
                console.log(`   Instructions: ${prescription.instructions}`);
            });
            
        } else {
            console.log('\nLalo not found in Patient collection');
            
            // If Lalo not found, search for any patient with similar name
            const similarPatients = await Patient.find({
                $or: [
                    { firstName: { $regex: /la/i } },
                    { lastName: { $regex: /lo/i } }
                ]
            }).limit(10);
            
            if (similarPatients.length > 0) {
                console.log('\nSimilar patients found:');
                similarPatients.forEach((patient, index) => {
                    console.log(`${index + 1}. ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
                });
            }
        }
        
        // Also check for any active Dexamethasone prescriptions
        const activeDexamethasone = await Prescription.find({
            medicationName: { $regex: /dexamethasone/i },
            status: { $in: ['Active', 'Pending'] }
        }).populate('patient', 'firstName lastName patientId').sort({createdAt: -1});
        
        console.log(`\n\nFound ${activeDexamethasone.length} active Dexamethasone prescriptions:`);
        
        activeDexamethasone.forEach((prescription, index) => {
            const patientName = prescription.patient ? 
                `${prescription.patient.firstName} ${prescription.patient.lastName} (${prescription.patient.patientId})` : 
                'Unknown Patient';
            console.log(`\n${index + 1}. Prescription ID: ${prescription._id}`);
            console.log(`   Patient: ${patientName}`);
            console.log(`   Status: ${prescription.status}`);
            console.log(`   Payment Status: ${prescription.paymentStatus}`);
            console.log(`   Created: ${prescription.createdAt}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from database');
    }
}

findLaloDexamethasone();
