const mongoose = require('mongoose');
require('dotenv').config();

async function checkAntenehService() {
  try {
    console.log('🔍 Checking Anteneh Tesfaye service requests and lab orders...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find Anteneh Tesfaye patient
    const Patient = mongoose.model('Patient', new mongoose.Schema({
      firstName: String,
      lastName: String,
      patientId: String
    }, { collection: 'patients' }));

    const anteneh = await Patient.findOne({
      $or: [
        { firstName: 'Anteneh', lastName: 'Tesfaye' },
        { firstName: 'Anteneh' },
        { patientId: { $regex: 'anteneh', $options: 'i' } }
      ]
    });

    if (anteneh) {
      console.log('✅ Found Anteneh:', {
        id: anteneh._id,
        name: anteneh.firstName + ' ' + anteneh.lastName,
        patientId: anteneh.patientId
      });

      // Check service requests for this patient
      const ServiceRequest = mongoose.model('ServiceRequest', new mongoose.Schema({
        patient: mongoose.Schema.Types.ObjectId,
        service: mongoose.Schema.Types.ObjectId,
        status: String,
        requestDate: Date,
        notes: String
      }, { collection: 'servicerequests' }));

      console.log('\n🔍 Checking service requests for Anteneh...');
      const serviceRequests = await ServiceRequest.find({ patient: anteneh._id })
        .populate('service', 'name category')
        .sort({ requestDate: -1 })
        .limit(5);

      if (serviceRequests.length > 0) {
        console.log(`✅ Found ${serviceRequests.length} service requests:`);
        serviceRequests.forEach((req, index) => {
          console.log(`  ${index + 1}. Service: ${req.service ? req.service.name : 'Unknown'}`);
          console.log(`     Category: ${req.service ? req.service.category : 'Unknown'}`);
          console.log(`     Status: ${req.status}`);
          console.log(`     Date: ${req.requestDate}`);
          console.log(`     Notes: ${req.notes || 'None'}`);
          console.log('');
        });
      } else {
        console.log('❌ No service requests found for Anteneh');
      }

      // Check lab orders for this patient
      const LabOrder = mongoose.model('LabOrder', new mongoose.Schema({
        patientId: mongoose.Schema.Types.ObjectId,
        testName: String,
        status: String,
        paymentStatus: String,
        invoiceId: mongoose.Schema.Types.ObjectId,
        createdAt: Date
      }, { collection: 'laborders' }));

      console.log('🔍 Checking lab orders for Anteneh...');
      const labOrders = await LabOrder.find({ patientId: anteneh._id })
        .sort({ createdAt: -1 })
        .limit(5);

      if (labOrders.length > 0) {
        console.log(`✅ Found ${labOrders.length} lab orders:`);
        labOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. Test: ${order.testName}`);
          console.log(`     Status: ${order.status}`);
          console.log(`     Payment Status: ${order.paymentStatus}`);
          console.log(`     Invoice ID: ${order.invoiceId}`);
          console.log(`     Created: ${order.createdAt}`);
          console.log('');
        });
      } else {
        console.log('❌ No lab orders found for Anteneh');
      }

    } else {
      console.log('❌ Anteneh Tesfaye patient not found');

      // List recent patients to help find the correct name
      const recentPatients = await Patient.find({})
        .sort({ createdAt: -1 })
        .limit(10);

      console.log('\n📋 Recent patients:');
      recentPatients.forEach(p => {
        console.log(`  - ${p.firstName} ${p.lastName} (ID: ${p.patientId})`);
      });
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

checkAntenehService();
