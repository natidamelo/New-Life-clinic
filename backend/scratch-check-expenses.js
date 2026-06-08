const mongoose = require('mongoose');
require('dotenv').config();

async function checkExpenses() {
  console.log('Connecting to database:', process.env.MONGODB_URI ? 'URI found' : 'URI missing');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');
    
    const collection = mongoose.connection.db.collection('operatingexpenses');
    const count = await collection.countDocuments({});
    console.log('Total operating expenses count:', count);
    
    if (count > 0) {
      const samples = await collection.find({}).limit(10).toArray();
      console.log('Sample operating expenses:', JSON.stringify(samples, null, 2));
    } else {
      console.log('No documents found in operatingexpenses collection.');
    }
  } catch (error) {
    console.error('Error running check:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

checkExpenses();
