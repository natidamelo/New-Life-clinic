const mongoose = require('mongoose');

async function analyzeMissing() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);

    const Patient = mongoose.connection.collection('patients');

    const sample = await Patient.find({
      $or: [
        { age: null },
        { gender: '' },
        { contactNumber: '' }
      ]
    }).limit(10).toArray();

    console.log('Sample of missing-details patients:');
    sample.forEach((p, i) => {
      console.log(`\nPatient #${i + 1}:`);
      console.log(`ID: ${p._id}`);
      console.log(`patientId: ${p.patientId}`);
      console.log(`Name: ${p.firstName} ${p.lastName}`);
      console.log(`Age: ${p.age}`);
      console.log(`Gender: "${p.gender}"`);
      console.log(`Phone: "${p.contactNumber}"`);
      console.log(`createdAt: ${p.createdAt}`);
      console.log(`updatedAt: ${p.updatedAt}`);
      console.log(`clinicId: ${p.clinicId}`);
      console.log(`cardStatus: ${p.cardStatus}`);
      console.log(`Keys:`, Object.keys(p).join(', '));
    });

    // Let's group by createdAt to see if they were created in a batch
    const createdTimes = await Patient.aggregate([
      {
        $match: {
          $or: [
            { age: null },
            { gender: '' },
            { contactNumber: '' }
          ]
        }
      },
      {
        $group: {
          _id: "$createdAt",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    console.log('\nTop 10 createdAt values for missing-details patients:');
    createdTimes.forEach(t => {
      console.log(`Time: ${t._id} - Count: ${t.count}`);
    });

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeMissing();
