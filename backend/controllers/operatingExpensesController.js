const OperatingExpense = require('../models/OperatingExpense');
const asyncHandler = require('express-async-handler');

// @desc    Get all operating expenses
// @route   GET /api/operating-expenses
// @access  Private
const getExpenses = asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query filter to support both Date object and String formats stored in DB
    const filter = {};
    if (startDate && endDate) {
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      filter.$or = [
        {
          expenseDate: {
            $gte: startD,
            $lte: endD
          }
        },
        {
          expenseDate: {
            $gte: startDate,
            $lte: endDate
          }
        },
        {
          expenseDate: {
            $gte: startD.toISOString(),
            $lte: endD.toISOString()
          }
        }
      ];
    }
    
    // Get expenses with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Query raw MongoDB collection directly to bypass Mongoose type coercion for expenseDate
    const expenseDocs = await OperatingExpense.collection.find(filter)
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    // Hydrate raw documents to full Mongoose documents to support population
    const expenses = expenseDocs.map(doc => OperatingExpense.hydrate(doc));
    await OperatingExpense.populate(expenses, { path: 'createdBy', select: 'firstName lastName' });
    
    // Get total count for pagination via raw collection
    const total = await OperatingExpense.collection.countDocuments(filter);
    
    // Calculate summary via raw collection
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
    
    res.json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: summary[0] || { total: 0, count: 0 }
    });
  } catch (error) {
    console.error('Error fetching operating expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operating expenses',
      error: error.message
    });
  }
});

// @desc    Get operating expense by ID
// @route   GET /api/operating-expenses/:id
// @access  Private
const getExpenseById = asyncHandler(async (req, res) => {
  try {
    const expense = await OperatingExpense.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Operating expense not found'
      });
    }
    
    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching operating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operating expense',
      error: error.message
    });
  }
});

// @desc    Create new operating expense
// @route   POST /api/operating-expenses
// @access  Private
const addExpense = asyncHandler(async (req, res) => {
  try {
    const { description, category, amount, expenseDate, recurring } = req.body;
    
    // Validate required fields
    if (!description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Description and amount are required'
      });
    }
    
    // Create new expense
    const expense = new OperatingExpense({
      description,
      category: category || 'other',
      amount: parseFloat(amount),
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      recurring: Boolean(recurring),
      createdBy: req.user.id
    });
    
    const savedExpense = await expense.save();
    
    // Populate createdBy field
    await savedExpense.populate('createdBy', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      message: 'Operating expense created successfully',
      data: savedExpense
    });
  } catch (error) {
    console.error('Error creating operating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create operating expense',
      error: error.message
    });
  }
});

// @desc    Update operating expense
// @route   PUT /api/operating-expenses/:id
// @access  Private
const updateExpense = asyncHandler(async (req, res) => {
  try {
    const { description, category, amount, expenseDate, recurring } = req.body;
    
    // Find and update expense
    const expense = await OperatingExpense.findByIdAndUpdate(
      req.params.id,
      {
        description,
        category,
        amount: parseFloat(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        recurring: Boolean(recurring)
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Operating expense not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Operating expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error updating operating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update operating expense',
      error: error.message
    });
  }
});

// @desc    Delete operating expense
// @route   DELETE /api/operating-expenses/:id
// @access  Private
const deleteExpense = asyncHandler(async (req, res) => {
  try {
    const expense = await OperatingExpense.findByIdAndDelete(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Operating expense not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Operating expense deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('Error deleting operating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete operating expense',
      error: error.message
    });
  }
});

module.exports = {
  getExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  deleteExpense
};
