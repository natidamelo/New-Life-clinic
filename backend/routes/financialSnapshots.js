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
              patientCount:      { $sum: { $cond: [{ $in: ['$status', ['paid', 'partial']] }, 1, 0] } },
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
              patientCount:      1,
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

    const getTrendData = async (Model, period, startDate, endDate) => {
      if (!Model) return [];
      try {
        const invoices = await Model.find({
          status: 'paid',
          $or: [
            { createdAt: { $gte: startDate, $lte: endDate } },
            { dateIssued: { $gte: startDate, $lte: endDate } },
            { issueDate:  { $gte: startDate, $lte: endDate } },
          ],
        });

        if (period === 'day') {
          const trend = Array.from({ length: 12 }, (_, i) => ({
            name: `${i * 2}:00`,
            Revenue: 0,
          }));
          invoices.forEach(inv => {
            const dateVal = inv.createdAt || inv.dateIssued || inv.issueDate;
            if (!dateVal) return;
            const date = new Date(dateVal);
            if (isNaN(date.getTime())) return;
            const hour = date.getHours();
            const blockIndex = Math.min(11, Math.floor(hour / 2));
            trend[blockIndex].Revenue += inv.total || 0;
          });
          return trend;
        }

        if (period === 'month') {
          const trend = Array.from({ length: 4 }, (_, i) => ({
            name: `Week ${i + 1}`,
            Revenue: 0,
          }));
          invoices.forEach(inv => {
            const dateVal = inv.createdAt || inv.dateIssued || inv.issueDate;
            if (!dateVal) return;
            const date = new Date(dateVal);
            if (isNaN(date.getTime())) return;
            const day = date.getDate();
            const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
            trend[weekIndex].Revenue += inv.total || 0;
          });
          return trend;
        }

        const trend = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(startDate.getFullYear(), i, 1);
          return {
            name: d.toLocaleString('default', { month: 'short' }),
            Revenue: 0,
          };
        });
        invoices.forEach(inv => {
          const dateVal = inv.createdAt || inv.dateIssued || inv.issueDate;
          if (!dateVal) return;
          const date = new Date(dateVal);
          if (isNaN(date.getTime())) return;
          const month = date.getMonth();
          if (month >= 0 && month < 12) {
            trend[month].Revenue += inv.total || 0;
          }
        });
        return trend;
      } catch (e) {
        console.warn('Trend calculation warning:', e.message);
        return [];
      }
    };

    let data = await aggregate(Invoice);
    let trend = await getTrendData(Invoice, period, startDate, endDate);
    if (!data || data.totalCount === 0) {
      data = await aggregate(MedicalInvoice);
      trend = await getTrendData(MedicalInvoice, period, startDate, endDate);
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

    // Load OperatingExpense model dynamically
    let OperatingExpense;
    try {
      OperatingExpense = mongoose.model('OperatingExpense');
    } catch (_) {
      try {
        OperatingExpense = require('../models/OperatingExpense');
      } catch (__) {
        OperatingExpense = null;
      }
    }

    let operatingExpenses = 0;
    if (OperatingExpense) {
      try {
        const tenantId = req.tenantId || req.user?.clinicId || 'default';
        const primary = (process.env.PRIMARY_CLINIC_ID || 'default').trim() || 'default';
        let tenantFilter;
        if (tenantId === primary || tenantId === 'default') {
          const slugSet = new Set(
            [tenantId, primary, 'default'].filter((s) => s != null && String(s).trim() !== '')
          );
          const or = [...slugSet].map((id) => ({ clinicId: id }));
          or.push(
            { clinicId: { $exists: false } },
            { clinicId: null },
            { clinicId: '' }
          );
          tenantFilter = { $or: or };
        } else {
          const slugSet = new Set(
            [tenantId, 'default'].filter((s) => s != null && String(s).trim() !== '')
          );
          const or = [...slugSet].map((id) => ({ clinicId: id }));
          tenantFilter = { $or: or };
        }

        const dateAndRecurringFilter = {
          $or: [
            { recurring: true },
            {
              expenseDate: {
                $gte: startDate,
                $lte: endDate
              }
            },
            {
              expenseDate: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
              }
            },
            {
              expenseDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
              }
            }
          ]
        };

        const expenseList = await OperatingExpense.collection.find({
          $and: [tenantFilter, dateAndRecurringFilter]
        }).toArray();
        operatingExpenses = expenseList.reduce((sum, exp) => sum + exp.amount, 0);
      } catch (err) {
        console.warn('Failed to calculate operating expenses in snapshot:', err.message);
      }
    }

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
      operatingExpenses,
      trend,
      createdAt: new Date(),
    };

    res.json({ success: true, data: snapshot });
  } catch (err) {
    console.error('GET /api/financial-snapshots error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
