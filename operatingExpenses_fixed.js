const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const { authenticate, authorize } = require('../src/middleware/auth');
const expenseController = require('../controllers/operatingExpenseController');

// Protect all routes & restrict to admin or finance roles
router.use(authenticate, authorize('admin', 'finance'));

// Define route handlers
router.get('/', expenseController.getExpenses);
router.post('/', expenseController.addExpense);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router; 