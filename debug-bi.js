const mongoose = require('mongoose');
const MedicalInvoice = require('./backend/models/MedicalInvoice');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const now = new Date();
  for (let i = 3; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d;
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    
    const revAgg = await MedicalInvoice.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: { $nin: ['cancelled'] } } },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
      { $group: { _id: { $ifNull: ['$items.itemType', '$items.category'] }, amount: { $sum: '$items.total' }, count: { $sum: 1 } } }
    ]);
    console.log(`Month ${i} ago:`, revAgg);
  }
  process.exit();
}
check();
