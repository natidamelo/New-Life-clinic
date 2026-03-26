require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  const collections = ['users', 'patients', 'medicalrecords', 'medicalinvoices'];

  for (const name of collections) {
    const col = db.collection(name);
    const total = await col.countDocuments();
    const distinct = await col.distinct('clinicId');
    const counts = {};
    for (const cid of distinct) {
      counts[cid || '(empty)'] = await col.countDocuments({ clinicId: cid });
    }
    const noField = await col.countDocuments({ clinicId: { $exists: false } });
    if (noField > 0) counts['(no clinicId field)'] = noField;
    console.log(`${name}: total=${total}  clinicIds=${JSON.stringify(counts)}`);
  }

  const clinics = await db.collection('clinics').find({}).toArray();
  console.log('\nclinics collection:');
  clinics.forEach(c => console.log(`  ${c.name} | slug=${c.slug} | active=${c.isActive}`));

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
