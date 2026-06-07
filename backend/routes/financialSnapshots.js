const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

/**
 * GET /api/financial-snapshots?period=day|month|year&key=2026-06
 *
 * Aggregates data from existing invoices/billing collections for the given period
 * and returns a FinancialSnapshot-shaped response.
 *
 * key formats:
 *   day   → "2026-06-07"
 *   month → "2026-06"
 *   year  → "2026"
 */
router.get('/', auth, async (req, res) => {
  try {
    const { period = 'month', key } = req.query;
    const clinicId = req.clinicId || req.user?.clinicId || 'new-life';

    // Build date range from period + key
    let startDate, endDate;
    const now = new Date();

    if (period === 'day') {
      const base = key ? new Date(key) : new Date(now.toDateString());
      startDate = new Date(base);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(base);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      const [y, m] = key ? key.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
      startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
      endDate   = new Date(y, m,     0, 23, 59, 59, 999);
    } else { // year
      const y = key ? parseInt(key) : now.getFullYear();
      startDate = new Date(y, 0, 1, 0, 0, 0, 0);
      endDate   = new Date(y, 11, 31, 23, 59, 59, 999);
    }

    // Try to load Invoice model (it may be registered under different names)
    let Invoice;
    try {
      Invoice = mongoose.model('Invoice');
    } catch (_) {
      try { Invoice = require('../models/Invoice'); } catch (__) {
        Invoice = null;
      }
    }

    // Also try MedicalInvoice as fallback
    let MedicalInvoice;
    try {
      MedicalInvoice = mongoose.model('MedicalInvoice');
    } catch (_) {
      try { MedicalInvoice = require('../models/MedicalInvoice'); } catch (__) {
        MedicalInvoice = null;
      }
    }

    const baseMatch = {
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { dateIssued: { $gte: startDate, $lte: endDate } },
        { issueDate:  { $gte: startDate, $lte: endDate } },
      ],
    };

    const aggregate = async (Model) => {
      if (!Model) return null;
      try {
        const result = await Model.aggregate([
          { $match: baseMatch },
          {
            $group: {
              _id: null,
              totalRevenue:      { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
              paidInvoices:      { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
              pendingInvoices:   { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              partialPayments:   { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
              outstandingAmount: { $sum: { $cond: [{ $in:  ['$status', ['pending', 'overdue', 'partial']] }, '$total', 0] } },
              patientCount:      { $addToSet: '$patientId' },
              totalCount:        { $sum: 1 },
            },
          },
          {
            $project: {
              totalRevenue:      1,
              paidInvoices:      1,
              pendingInvoices:   1,
              partialPayments:   1,
              outstandingAmount: 1,
              patientCount:      { $size: '$patientCount' },
              totalCount:        1,
            },
          },
        ]);
        return result[0] || null;
      } catch (e) {
        console.warn('Aggregation warning:', e.message);
        return null;
      }
    };

    let data = await aggregate(Invoice);
    if (!data || data.totalCount === 0) {
      data = await aggregate(MedicalInvoice);
    }

    const totalRevenue      = data?.totalRevenue      ?? 0;
    const paidInvoices      = data?.paidInvoices      ?? 0;
    const pendingInvoices   = data?.pendingInvoices   ?? 0;
    const partialPayments   = data?.partialPayments   ?? 0;
    const outstandingAmount = data?.outstandingAmount ?? 0;
    const patientCount      = data?.patientCount      ?? 0;
    const totalBilled       = totalRevenue + outstandingAmount;
    const collectionRate    = totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : 100;
    const avgRevenuePerPatient = patientCount > 0 ? Math.round(totalRevenue / patientCount) : 0;

    const snapshot = {
      clinicId,
      period,
      periodKey: key || (period === 'day' ? now.toISOString().split('T')[0] : period === 'month' ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` : String(now.getFullYear())),
      totalRevenue,
      paidInvoices,
      pendingInvoices,
      partialPayments,
      outstandingAmount,
      collectionRate,
      patientCount,
      avgRevenuePerPatient,
      createdAt: new Date(),
    };

    res.json({ success: true, data: snapshot });
  } catch (err) {
    console.error('GET /api/financial-snapshots error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
