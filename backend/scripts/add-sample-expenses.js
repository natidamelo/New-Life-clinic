const mongoose = require('mongoose');
const OperatingExpense = require('../models/OperatingExpense');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_new_life', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sampleExpenses = [
  {
    description: 'Electricity bill for August',
    category: 'utilities',
    amount: 2500,
    expenseDate: new Date('2025-08-15'),
    createdBy: null // Will be set to a real user ID if needed
  },
  {
    description: 'Medical supplies restock',
    category: 'other',
    amount: 15000,
    expenseDate: new Date('2025-08-20'),
    createdBy: null
  },
  {
    description: 'HVAC system maintenance',
    category: 'maintenance',
    amount: 8000,
    expenseDate: new Date('2025-08-22'),
    createdBy: null
  },
  {
    description: 'Office cleaning services',
    category: 'other',
    amount: 3000,
    expenseDate: new Date('2025-08-25'),
    createdBy: null
  },
  {
    description: 'Internet and phone services',
    category: 'utilities',
    amount: 1200,
    expenseDate: new Date('2025-08-28'),
    createdBy: null
  }
];

async function addSampleExpenses() {
  try {
    console.log('Adding sample operating expenses...');
    
    // Clear existing sample data (optional)
    // await OperatingExpense.deleteMany({});
    
    // Add sample expenses
    const expenses = await OperatingExpense.insertMany(sampleExpenses);
    
    console.log(`Successfully added ${expenses.length} sample expenses:`);
    expenses.forEach(expense => {
      console.log(`- ${expense.description}: ${expense.amount} ETB (${expense.category})`);
    });
    
    console.log('Sample expenses added successfully!');
  } catch (error) {
    console.error('Error adding sample expenses:', error);
  } finally {
    mongoose.connection.close();
  }
}

addSampleExpenses();
