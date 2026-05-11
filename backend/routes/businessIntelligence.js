const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const MedicalInvoice = require('../models/MedicalInvoice');
const OperatingExpense = require('../models/OperatingExpense');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Visit = require('../models/Visit');
const AuditLog = require('../models/AuditLog');
const FinancialSnapshot = require('../models/FinancialSnapshot');

// Helper: get date range for a given year/month
function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

// ═══════════════════════════════════════════════
// FINANCIAL INTELLIGENCE
// ═══════════════════════════════════════════════

router.get('/financial/monthly-summary', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const { start, end } = getMonthRange(year, month);

    // Revenue from invoices
    const invoiceAgg = await Invoice.aggregate([
      { $match: { issueDate: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } } },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: '$items.itemType',
        amount: { $sum: '$items.total' },
        count: { $sum: 1 }
      }}
    ]);

    // Also try MedicalInvoice
    let medInvoiceTotal = 0;
    try {
      const medAgg = await MedicalInvoice.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end }, status: { $nin: ['cancelled', 'voided'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      medInvoiceTotal = medAgg[0]?.total || 0;
    } catch (e) { /* MedicalInvoice may not exist */ }

    const revenueByType = {};
    let totalRevenue = 0;
    for (const item of invoiceAgg) {
      const type = item._id || 'other';
      revenueByType[type] = (revenueByType[type] || 0) + (item.amount || 0);
      totalRevenue += item.amount || 0;
    }
    if (medInvoiceTotal > 0 && totalRevenue === 0) totalRevenue = medInvoiceTotal;

    // Expenses
    const expenseAgg = await OperatingExpense.aggregate([
      { $match: { $or: [
        { expenseDate: { $gte: start, $lt: end } },
        { recurring: true }
      ]}},
      { $group: { _id: '$category', amount: { $sum: '$amount' } } }
    ]);
    const expensesByType = {};
    let totalExpenses = 0;
    for (const item of expenseAgg) {
      expensesByType[item._id || 'other'] = item.amount || 0;
      totalExpenses += item.amount || 0;
    }

    // Visit count
    const visitCount = await Patient.countDocuments({
      createdAt: { $gte: start, $lt: end }
    });
    const appointmentCount = await Appointment.countDocuments({
      appointmentDateTime: { $gte: start, $lt: end }
    });
    const totalVisits = Math.max(visitCount, appointmentCount) || 1;

    // RCM
    const rcmAgg = await Invoice.aggregate([
      { $match: { issueDate: { $gte: start, $lt: end } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$total' }
      }}
    ]);
    const rcm = { totalInvoices: 0, paidInvoices: 0, pendingInvoices: 0, overdueInvoices: 0, cancelledInvoices: 0 };
    for (const r of rcmAgg) {
      rcm.totalInvoices += r.count;
      if (r._id === 'paid') rcm.paidInvoices = r.count;
      if (r._id === 'pending' || r._id === 'partial') rcm.pendingInvoices += r.count;
      if (r._id === 'overdue') rcm.overdueInvoices = r.count;
      if (r._id === 'cancelled') rcm.cancelledInvoices = r.count;
    }
    rcm.collectionRate = rcm.totalInvoices > 0 ? Math.round((rcm.paidInvoices / rcm.totalInvoices) * 100) : 0;

    // No-shows
    const noShows = await Appointment.countDocuments({
      appointmentDateTime: { $gte: start, $lt: end },
      status: 'No Show'
    });
    const scheduled = await Appointment.countDocuments({
      appointmentDateTime: { $gte: start, $lt: end }
    });

    const netIncome = totalRevenue - totalExpenses;
    const costPerVisit = totalVisits > 0 ? Math.round(totalExpenses / totalVisits) : 0;
    const revenuePerVisit = totalVisits > 0 ? Math.round(totalRevenue / totalVisits) : 0;
    const profitMargin = totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        period: { year, month },
        revenue: { total: totalRevenue, breakdown: revenueByType },
        expenses: { total: totalExpenses, breakdown: expensesByType },
        rcm,
        visits: { totalVisits, noShows, noShowRate: scheduled > 0 ? Math.round((noShows / scheduled) * 100) : 0 },
        kpis: { netIncome, costPerVisit, revenuePerVisit, profitMargin }
      }
    });
  } catch (error) {
    console.error('[BI] Monthly summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/financial/trend', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const now = new Date();
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const { start, end } = getMonthRange(year, month);

      // Check snapshot first
      let snapshot = await FinancialSnapshot.findOne({ year, month });
      if (snapshot) {
        results.push({
          year, month,
          label: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          revenue: snapshot.revenue.total,
          expenses: snapshot.expenses.total,
          netIncome: snapshot.kpis.netIncome,
          visits: snapshot.visits.totalVisits
        });
        continue;
      }

      const revAgg = await Invoice.aggregate([
        { $match: { issueDate: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const expAgg = await OperatingExpense.aggregate([
        { $match: { $or: [{ expenseDate: { $gte: start, $lt: end } }, { recurring: true }] } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const visits = await Appointment.countDocuments({ appointmentDateTime: { $gte: start, $lt: end } });
      const rev = revAgg[0]?.total || 0;
      const exp = expAgg[0]?.total || 0;
      results.push({
        year, month,
        label: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        revenue: rev, expenses: exp, netIncome: rev - exp, visits
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[BI] Trend error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// APPOINTMENT ENGINE
// ═══════════════════════════════════════════════

router.get('/appointments/daily-dashboard', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd = new Date(dateStr + 'T23:59:59.999Z');

    const appointments = await Appointment.find({
      appointmentDateTime: { $gte: dayStart, $lte: dayEnd }
    }).populate('patientId', 'firstName lastName patientId').populate('doctorId', 'firstName lastName');

    const summary = { scheduled: 0, checkedIn: 0, completed: 0, noShow: 0, cancelled: 0 };
    const byDoctor = {};

    for (const apt of appointments) {
      summary.scheduled++;
      if (apt.status === 'Checked In') summary.checkedIn++;
      else if (apt.status === 'Completed') summary.completed++;
      else if (apt.status === 'No Show') summary.noShow++;
      else if (apt.status === 'Cancelled') summary.cancelled++;

      const docName = apt.doctorId ? `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}` : 'Unassigned';
      if (!byDoctor[docName]) byDoctor[docName] = { scheduled: 0, completed: 0, noShow: 0 };
      byDoctor[docName].scheduled++;
      if (apt.status === 'Completed') byDoctor[docName].completed++;
      if (apt.status === 'No Show') byDoctor[docName].noShow++;
    }

    res.json({
      success: true,
      data: {
        date: dateStr,
        summary,
        noShowRate: summary.scheduled > 0 ? Math.round((summary.noShow / summary.scheduled) * 100) : 0,
        byDoctor: Object.entries(byDoctor).map(([name, stats]) => ({ name, ...stats })),
        appointments: appointments.slice(0, 50).map(a => ({
          id: a._id,
          patient: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : 'Unknown',
          patientDisplayId: a.patientId?.patientId,
          doctor: a.doctorId ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName}` : 'Unassigned',
          time: a.appointmentDateTime,
          type: a.type,
          status: a.status,
          duration: a.durationMinutes
        }))
      }
    });
  } catch (error) {
    console.error('[BI] Daily dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/appointments/no-show-analysis', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    const analysis = await Appointment.aggregate([
      { $match: { appointmentDateTime: { $gte: startDate } } },
      { $group: {
        _id: {
          year: { $year: '$appointmentDateTime' },
          month: { $month: '$appointmentDateTime' }
        },
        total: { $sum: 1 },
        noShows: { $sum: { $cond: [{ $eq: ['$status', 'No Show'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: {
        year: '$_id.year', month: '$_id.month',
        total: 1, noShows: 1, completed: 1,
        noShowRate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$noShows', '$total'] }, 100] }, 0] }
      }}
    ]);

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[BI] No-show analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// MARKET ANALYSIS
// ═══════════════════════════════════════════════

router.get('/market/patient-heatmap', async (req, res) => {
  try {
    const pipeline = [
      { $match: { isActive: { $ne: false } } },
      { $addFields: {
        subCity: {
          $cond: {
            if: { $eq: [{ $type: '$address' }, 'object'] },
            then: { $ifNull: ['$address.subCity', { $ifNull: ['$address.city', 'Unknown'] }] },
            else: { $cond: { if: { $eq: [{ $type: '$address' }, 'string'] }, then: '$address', else: 'Unknown' } }
          }
        }
      }},
      { $group: {
        _id: '$subCity',
        count: { $sum: 1 },
        avgAge: { $avg: '$age' },
        genders: { $push: '$gender' }
      }},
      { $sort: { count: -1 } },
      { $project: {
        subCity: '$_id', _id: 0, count: 1,
        avgAge: { $round: ['$avgAge', 1] },
        maleCount: { $size: { $filter: { input: '$genders', cond: { $in: ['$$this', ['male', 'Male']] } } } },
        femaleCount: { $size: { $filter: { input: '$genders', cond: { $in: ['$$this', ['female', 'Female']] } } } }
      }}
    ];

    const heatmapData = await Patient.aggregate(pipeline);
    const total = heatmapData.reduce((s, d) => s + d.count, 0);

    res.json({
      success: true,
      data: {
        totalPatients: total,
        areas: heatmapData.map(d => ({
          ...d,
          percentage: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0
        }))
      }
    });
  } catch (error) {
    console.error('[BI] Heatmap error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/market/referral-analytics', async (req, res) => {
  try {
    // Referral source from patients
    const sourceAgg = await Patient.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: {
        _id: { $ifNull: ['$referralSource', 'walk-in'] },
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    // Growth trend
    const months = parseInt(req.query.months) || 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    const growthAgg = await Patient.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        newPatients: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        referralSources: sourceAgg.map(s => ({ source: s._id, count: s.count })),
        growthTrend: growthAgg.map(g => ({
          year: g._id.year, month: g._id.month, newPatients: g.newPatients,
          label: new Date(g._id.year, g._id.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        }))
      }
    });
  } catch (error) {
    console.error('[BI] Referral analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/market/patient-demographics', async (req, res) => {
  try {
    const genderAgg = await Patient.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    const ageAgg = await Patient.aggregate([
      { $match: { isActive: { $ne: false }, age: { $exists: true, $ne: null } } },
      { $bucket: {
        groupBy: '$age',
        boundaries: [0, 5, 13, 18, 30, 45, 60, 120],
        default: 'Unknown',
        output: { count: { $sum: 1 } }
      }}
    ]);
    const ageLabels = ['0-4', '5-12', '13-17', '18-29', '30-44', '45-59', '60+', 'Unknown'];

    res.json({
      success: true,
      data: {
        gender: genderAgg.map(g => ({ gender: g._id || 'Unknown', count: g.count })),
        ageGroups: ageAgg.map((a, i) => ({ range: ageLabels[i] || String(a._id), count: a.count }))
      }
    });
  } catch (error) {
    console.error('[BI] Demographics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════

router.get('/audit/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.resourceType) filter.resourceType = req.query.resourceType;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.search) {
      filter.$or = [
        { userName: { $regex: req.query.search, $options: 'i' } },
        { resourceName: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
      if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { logs, total, page, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[BI] Audit logs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/audit/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 86400000);

    const [byAction, byResource, byUser, totalCount] = await Promise.all([
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$resourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: { userId: '$userId', userName: '$userName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.countDocuments({ timestamp: { $gte: since } })
    ]);

    res.json({
      success: true,
      data: {
        totalEntries: totalCount, days,
        byAction: byAction.map(a => ({ action: a._id, count: a.count })),
        byResource: byResource.map(r => ({ resource: r._id, count: r.count })),
        topUsers: byUser.map(u => ({ userId: u._id.userId, userName: u._id.userName, count: u.count }))
      }
    });
  } catch (error) {
    console.error('[BI] Audit summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
