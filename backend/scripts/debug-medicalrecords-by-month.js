const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const coll = mongoose.connection.db.collection('medicalrecords');
  const pipeline = [
    { $match: { isDeleted: { $ne: true }, createdAt: { $type: 'date' } } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } }
  ];

  const rows = await coll.aggregate(pipeline).toArray();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(rows, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

