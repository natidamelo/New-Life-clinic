const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  deleteExpense
} = require('../controllers/operatingExpensesController');

// @route   GET /api/operating-expenses
// @desc    Get all operating expenses
// @access  Private
router.get('/', auth, getExpenses);

// @route   GET /api/operating-expenses/:id
// @desc    Get operating expense by ID
// @access  Private
router.get('/:id', auth, getExpenseById);

// @route   POST /api/operating-expenses
// @desc    Create new operating expense
// @access  Private
router.post('/', auth, addExpense);

// @route   PUT /api/operating-expenses/:id
// @desc    Update operating expense
// @access  Private
router.put('/:id', auth, updateExpense);

// @route   DELETE /api/operating-expenses/:id
// @desc    Delete operating expense
// @access  Private
router.delete('/:id', auth, deleteExpense);

module.exports = router;
