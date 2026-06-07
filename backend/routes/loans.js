const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const { auth } = require('../middleware/auth');

// Helper: calculate monthly payment (server-side)
const calcMonthlyPayment = (principal, annualRate, termMonths) => {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (
    (principal * r * Math.pow(1 + r, termMonths)) /
    (Math.pow(1 + r, termMonths) - 1)
  );
};

// GET /api/loans — list active loans for this clinic
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.clinicId || req.user?.clinicId || 'new-life';
    const loans = await Loan.find({ clinicId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch (err) {
    console.error('GET /api/loans error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/loans — create loan with auto-calculated payment
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = req.clinicId || req.user?.clinicId || 'new-life';
    const { name, principal, annualRate, termMonths, startDate } = req.body;

    if (!name || principal == null || annualRate == null || !termMonths) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, principal, annualRate, termMonths' });
    }

    const monthlyPayment = calcMonthlyPayment(Number(principal), Number(annualRate), Number(termMonths));
    const totalRepayment = monthlyPayment * Number(termMonths);
    const totalInterest = totalRepayment - Number(principal);

    const loan = new Loan({
      clinicId,
      name,
      principal: Number(principal),
      annualRate: Number(annualRate),
      termMonths: Number(termMonths),
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalRepayment: Math.round(totalRepayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      startDate: startDate ? new Date(startDate) : new Date(),
      paidMonths: 0,
      isActive: true,
    });

    await loan.save();
    res.status(201).json({ success: true, data: loan });
  } catch (err) {
    console.error('POST /api/loans error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/loans/:id/pay — increment paidMonths by 1
router.patch('/:id/pay', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan || !loan.isActive) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    if (loan.paidMonths >= loan.termMonths) {
      return res.status(400).json({ success: false, message: 'All months already paid' });
    }
    loan.paidMonths += 1;
    await loan.save();
    res.json({ success: true, data: loan });
  } catch (err) {
    console.error('PATCH /api/loans/:id/pay error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/loans/:id — soft-delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    loan.isActive = false;
    await loan.save();
    res.json({ success: true, message: 'Loan deleted' });
  } catch (err) {
    console.error('DELETE /api/loans/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
