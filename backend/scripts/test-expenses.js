const mongoose = require('mongoose');
const OperatingExpense = require('../models/OperatingExpense');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_new_life', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testExpenses() {
  try {
    console.log('Testing operating expenses database...');
    
    // Count total expenses
    const count = await OperatingExpense.countDocuments();
    console.log(`Total expenses in database: ${count}`);
    
    // Get all expenses
    const expenses = await OperatingExpense.find().sort({ expenseDate: -1 });
    
    if (expenses.length > 0) {
      console.log('\nSample expenses:');
      expenses.forEach((expense, index) => {
        console.log(`${index + 1}. ${expense.description}`);
        console.log(`   Category: ${expense.category}`);
        console.log(`   Amount: ${expense.amount} ETB`);
        console.log(`   Date: ${expense.expenseDate}`);
        console.log(`   ID: ${expense._id}`);
        console.log('');
      });
    } else {
      console.log('No expenses found in database');
    }
    
  } catch (error) {
    console.error('Error testing expenses:', error);
  } finally {
    mongoose.connection.close();
  }
}

testExpenses();
