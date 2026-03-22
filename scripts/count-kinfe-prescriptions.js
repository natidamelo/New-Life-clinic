const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const dbName = 'clinic-cms';

  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);

    const patientsCol = db.collection('patients');
    const prescriptionsCol = db.collection('prescriptions');

    // Build flexible name query for Kinfe Michael/Micheal
    const nameRegexes = [
      /^kinfe\s+michael$/i,
      /^kinfe\s+micheal$/i,
      /kinfe/i
    ];

    const patient = await patientsCol.findOne({
      $or: [
        { name: { $in: nameRegexes } },
        { fullName: { $in: nameRegexes } },
        { patientName: { $in: nameRegexes } },
        { patientFullName: { $in: nameRegexes } },
        { displayName: { $in: nameRegexes } },
        { $and: [ { firstName: /kinfe/i }, { lastName: /michae?l/i } ] }
      ]
    });

    if (!patient) {
      console.log('❌ Patient "Kinfe Michael/Micheal" not found');
      const sample = await patientsCol.find({ firstName: /kinfe/i }).limit(5).toArray();
      if (sample.length) {
        console.log('Found possible matches:');
        sample.forEach(p => console.log(` - ${p.firstName || ''} ${p.lastName || ''} | name: ${p.name || ''} | _id: ${p._id}`));
      }
      process.exit(0);
    }

    const patientId = patient._id;

    const count = await prescriptionsCol.countDocuments({
      $or: [
        { patient: new ObjectId(patientId) },
        { patientId: new ObjectId(patientId) }
      ]
    });

    console.log(`✅ Kinfe (_id: ${patientId}) has ${count} prescription(s).`);

    // Optional: show brief summary
    const list = await prescriptionsCol
      .find({ $or: [{ patient: patientId }, { patientId: patientId }] })
      .project({ medicationName: 1, dosage: 1, frequency: 1, duration: 1, createdAt: 1 })
      .limit(20)
      .toArray();

    if (list.length) {
      console.log('— Sample prescriptions:');
      for (const p of list) {
        const when = p.createdAt ? new Date(p.createdAt).toISOString() : 'n/a';
        console.log(`  • ${p.medicationName || 'Unknown'} | ${p.dosage || ''} | ${p.frequency || ''} | ${p.duration || ''}d | ${when}`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
})();
