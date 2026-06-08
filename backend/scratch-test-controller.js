const mongoose = require('mongoose');
require('dotenv').config();
const OperatingExpense = require('./models/OperatingExpense');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  // ===== Test 1: Raw collection query (same as controller) =====
  const startDate = '2000-01-01';
  const endDate = '2100-01-01';
  const startD = new Date(startDate);
  const endD = new Date(endDate);

  const filter = {
    $or: [
      { expenseDate: { $gte: startD, $lte: endD } },
      { expenseDate: { $gte: startDate, $lte: endDate } },
      { expenseDate: { $gte: startD.toISOString(), $lte: endD.toISOString() } }
    ]
  };

  console.log('\n=== Test 1: Raw collection.find (controller logic) ===');
  const rawDocs = await OperatingExpense.collection.find(filter)
    .sort({ expenseDate: -1 })
    .limit(50)
    .toArray();
  console.log('Raw collection results:', rawDocs.length);

  // ===== Test 2: Mongoose find (with tenant plugin) =====
  console.log('\n=== Test 2: Mongoose find ===');
  const mongooseDocs = await OperatingExpense.find({}).limit(50);
  console.log('Mongoose results:', mongooseDocs.length);

  // ===== Test 3: No filter at all on raw collection =====
  console.log('\n=== Test 3: Raw collection no filter ===');
  const allDocs = await OperatingExpense.collection.find({}).limit(50).toArray();
  console.log('All raw results:', allDocs.length);

  // ===== Test 4: Hydrate + populate (same as controller) =====
  if (rawDocs.length > 0) {
    console.log('\n=== Test 4: Hydrate + populate ===');
    try {
      const expenses = rawDocs.map(doc => OperatingExpense.hydrate(doc));
      await OperatingExpense.populate(expenses, { path: 'createdBy', select: 'firstName lastName' });
      console.log('Hydrate + populate succeeded. First item:', JSON.stringify(expenses[0], null, 2));
    } catch (err) {
      console.error('Hydrate/populate ERROR:', err.message);
    }
  }

  // ===== Test 5: Summary aggregation (same as controller) =====
  console.log('\n=== Test 5: Summary aggregation ===');
  try {
    const summary = await OperatingExpense.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    console.log('Summary:', JSON.stringify(summary));
  } catch (err) {
    console.error('Aggregation ERROR:', err.message);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

test().catch(err => { console.error('FATAL:', err); process.exit(1); });
