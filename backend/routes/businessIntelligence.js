const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');
const OperatingExpense = require('../models/OperatingExpense');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const FinancialSnapshot = require('../models/FinancialSnapshot');
const Loan = require('../models/Loan');

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

// Helper: get revenue + expense for a month
async function getMonthFinancials(start, end) {
  // Revenue from MedicalInvoice (the ACTUAL billing model used)
  const revAgg = await MedicalInvoice.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, status: { $nin: ['cancelled'] } } },
    { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
    { $group: { _id: { $ifNull: ['$items.itemType', '$items.category'] }, amount: { $sum: '$items.total' }, count: { $sum: 1 } } }
  ]);
  const revTotalAgg = await MedicalInvoice.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, status: { $nin: ['cancelled'] } } },
    { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' } } }
  ]);

  const revenueByType = {};
  let totalRevenue = revTotalAgg[0]?.total || 0;
  let totalPaid = revTotalAgg[0]?.paid || 0;
  for (const item of revAgg) { revenueByType[item._id || 'other'] = item.amount || 0; }

  // Expenses
  const expAgg = await OperatingExpense.aggregate([
    { $match: { $or: [{ expenseDate: { $gte: start, $lt: end } }, { recurring: true }] } },
    { $group: { _id: '$category', amount: { $sum: '$amount' } } }
  ]);
  const expensesByType = {};
  let totalExpenses = 0;
  for (const item of expAgg) { expensesByType[item._id || 'other'] = item.amount || 0; totalExpenses += item.amount || 0; }

  // Loan payments
  const loans = await Loan.find({ status: 'active' });
  const totalLoanPayments = loans.reduce((s, l) => s + (l.monthlyPayment || 0), 0);

  return { totalRevenue, totalPaid, revenueByType, totalExpenses, expensesByType, totalLoanPayments, loans };
}

// ═══ FINANCIAL INTELLIGENCE (FIXED — uses MedicalInvoice) ═══

router.get('/financial/monthly-summary', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const { start, end } = getMonthRange(year, month);

    const fin = await getMonthFinancials(start, end);

    // RCM from MedicalInvoice
    const rcmAgg = await MedicalInvoice.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$total' } } }
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

    // Visits
    const appointmentCount = await Appointment.countDocuments({ appointmentDateTime: { $gte: start, $lt: end } });
    const noShows = await Appointment.countDocuments({ appointmentDateTime: { $gte: start, $lt: end }, status: 'No Show' });
    const totalVisits = Math.max(appointmentCount, 1);

    const grossProfit = fin.totalRevenue - fin.totalExpenses;
    const trueNetCashFlow = grossProfit - fin.totalLoanPayments;
    const costPerVisit = totalVisits > 0 ? Math.round(fin.totalExpenses / totalVisits) : 0;
    const revenuePerVisit = totalVisits > 0 ? Math.round(fin.totalRevenue / totalVisits) : 0;
    const profitMargin = fin.totalRevenue > 0 ? Math.round((trueNetCashFlow / fin.totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        period: { year, month },
        revenue: { total: fin.totalRevenue, collected: fin.totalPaid, breakdown: fin.revenueByType },
        expenses: { total: fin.totalExpenses, breakdown: fin.expensesByType },
        loans: { totalMonthlyPayments: fin.totalLoanPayments, count: fin.loans.length },
        rcm,
        visits: { totalVisits: appointmentCount, noShows, noShowRate: appointmentCount > 0 ? Math.round((noShows / appointmentCount) * 100) : 0 },
        kpis: { grossProfit, trueNetCashFlow, costPerVisit, revenuePerVisit, profitMargin }
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
      const year = d.getFullYear(); const month = d.getMonth() + 1;
      const { start, end } = getMonthRange(year, month);
      const revAgg = await MedicalInvoice.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const expAgg = await OperatingExpense.aggregate([
        { $match: { $or: [{ expenseDate: { $gte: start, $lt: end } }, { recurring: true }] } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const visits = await Appointment.countDocuments({ appointmentDateTime: { $gte: start, $lt: end } });
      const rev = revAgg[0]?.total || 0; const exp = expAgg[0]?.total || 0;
      results.push({ year, month, label: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }), revenue: rev, expenses: exp, netIncome: rev - exp, visits });
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══ STRATEGY ENDPOINTS ═══

// --- Loan CRUD ---
router.get('/strategy/loans', async (req, res) => {
  try {
    const loans = await Loan.find().sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/strategy/loans', async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, createdBy: req.user?._id || req.user?.id });
    res.json({ success: true, data: loan });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/strategy/loans/:id', async (req, res) => {
  try {
    const loan = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: loan });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/strategy/loans/:id', async (req, res) => {
  try {
    await Loan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// --- Forecast & Gap Analysis ---
router.get('/strategy/forecast', async (req, res) => {
  try {
    const now = new Date();
    const targetProfit = parseFloat(req.query.targetProfit) || 0;

    // Get last 3 months data
    const monthsData = [];
    for (let i = 3; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const { start, end } = getMonthRange(d.getFullYear(), d.getMonth() + 1);
      const fin = await getMonthFinancials(start, end);
      const visits = await Appointment.countDocuments({ appointmentDateTime: { $gte: start, $lt: end } });
      monthsData.push({ year: d.getFullYear(), month: d.getMonth() + 1, ...fin, visits });
    }

    // Simple linear regression on expenses
    const expValues = monthsData.map(m => m.totalExpenses);
    const revValues = monthsData.map(m => m.totalRevenue);
    const n = expValues.length;
    const avgExp = expValues.reduce((a, b) => a + b, 0) / n;
    const avgRev = revValues.reduce((a, b) => a + b, 0) / n;

    // Linear trend: y = mx + b
    let sumXY_exp = 0, sumX2 = 0, sumXY_rev = 0;
    for (let i = 0; i < n; i++) {
      sumXY_exp += i * expValues[i]; sumXY_rev += i * revValues[i]; sumX2 += i * i;
    }
    const avgX = (n - 1) / 2;
    const slopeExp = sumX2 - n * avgX * avgX !== 0 ? (sumXY_exp - n * avgX * avgExp) / (sumX2 - n * avgX * avgX) : 0;
    const slopeRev = sumX2 - n * avgX * avgX !== 0 ? (sumXY_rev - n * avgX * avgRev) / (sumX2 - n * avgX * avgX) : 0;

    const forecastExpenses = Math.max(0, Math.round(avgExp + slopeExp * n));
    const forecastRevenue = Math.max(0, Math.round(avgRev + slopeRev * n));

    // Loans
    const loans = await Loan.find({ status: 'active' });
    const totalLoanPayments = loans.reduce((s, l) => s + (l.monthlyPayment || 0), 0);
    const totalDebt = loans.reduce((s, l) => s + (l.remainingBalance || 0), 0);

    // Gap analysis
    const fixedOpEx = forecastExpenses;
    const requiredRevenue = fixedOpEx + totalLoanPayments + targetProfit;
    const revenueGap = Math.max(0, requiredRevenue - forecastRevenue);
    
    // Fallback to 1000 ETB per visit if no historical visits exist to avoid division by zero
    let avgRevenuePerVisit = avgRev > 0 && monthsData.reduce((s, m) => s + m.visits, 0) > 0
      ? avgRev / (monthsData.reduce((s, m) => s + m.visits, 0) / n)
      : 1000;
    
    const additionalVisitsNeeded = Math.ceil(revenueGap / avgRevenuePerVisit);

    // Daily targets
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyTargetRevenue = Math.round(requiredRevenue / daysInMonth);
    const dailyTargetVisits = Math.ceil(dailyTargetRevenue / avgRevenuePerVisit);

    // Breakeven
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const currentRevAgg = await MedicalInvoice.aggregate([
      { $match: { createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd }, status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const currentRevenue = currentRevAgg[0]?.total || 0;
    const breakevenTarget = forecastExpenses + totalLoanPayments;
    const breakevenProgress = breakevenTarget > 0 ? Math.min(100, Math.round((currentRevenue / breakevenTarget) * 100)) : 0;

    // Debt-to-income ratio
    const monthlyIncome = avgRev || forecastRevenue || 1;
    const debtToIncome = Math.round((totalLoanPayments / monthlyIncome) * 100);

    // Action items
    const actionItems = [];
    if (forecastExpenses > avgExp * 1.05) actionItems.push({ type: 'warning', text: `Expenses trending up ${Math.round(((forecastExpenses - avgExp) / avgExp) * 100)}%. Consider reducing OpEx by ${Math.round(forecastExpenses - avgExp)} ETB.` });
    if (debtToIncome > 30) actionItems.push({ type: 'danger', text: `Debt-to-income ratio is ${debtToIncome}% (above 30% threshold). Prioritize loan repayment.` });
    if (revenueGap > 0) actionItems.push({ type: 'info', text: `Need ${additionalVisitsNeeded} more appointments (${revenueGap.toLocaleString()} ETB) to reach target profit.` });
    if (forecastRevenue < forecastExpenses + totalLoanPayments) actionItems.push({ type: 'danger', text: `Forecast shows negative cash flow next month. Revenue shortfall: ${(forecastExpenses + totalLoanPayments - forecastRevenue).toLocaleString()} ETB.` });
    if (breakevenProgress < 50 && now.getDate() > 15) actionItems.push({ type: 'warning', text: `Breakeven progress is only ${breakevenProgress}% with ${30 - now.getDate()} days left this month.` });

    res.json({
      success: true,
      data: {
        forecast: { expenses: forecastExpenses, revenue: forecastRevenue, netCashFlow: forecastRevenue - forecastExpenses - totalLoanPayments },
        gapAnalysis: { targetProfit, requiredRevenue, forecastRevenue, revenueGap, avgRevenuePerVisit: Math.round(avgRevenuePerVisit), additionalVisitsNeeded, dailyTargetRevenue, dailyTargetVisits },
        breakeven: { target: breakevenTarget, currentRevenue, progress: breakevenProgress, daysLeft: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() },
        debtProfile: { totalDebt, totalMonthlyPayments: totalLoanPayments, debtToIncomeRatio: debtToIncome, loans: loans.map(l => ({ name: l.name, monthlyPayment: l.monthlyPayment, remaining: l.remainingBalance, rate: l.interestRate })) },
        actionItems,
        historicalData: monthsData.map(m => ({ month: m.month, year: m.year, revenue: m.totalRevenue, expenses: m.totalExpenses, visits: m.visits }))
      }
    });
  } catch (error) {
    console.error('[BI] Forecast error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══ APPOINTMENT ENGINE ═══

router.get('/appointments/daily-dashboard', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd = new Date(dateStr + 'T23:59:59.999Z');
    const appointments = await Appointment.find({ appointmentDateTime: { $gte: dayStart, $lte: dayEnd } })
      .populate('patientId', 'firstName lastName patientId').populate('doctorId', 'firstName lastName');
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
    res.json({ success: true, data: { date: dateStr, summary, noShowRate: summary.scheduled > 0 ? Math.round((summary.noShow / summary.scheduled) * 100) : 0, byDoctor: Object.entries(byDoctor).map(([name, stats]) => ({ name, ...stats })), appointments: appointments.slice(0, 50).map(a => ({ id: a._id, patient: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : 'Unknown', patientDisplayId: a.patientId?.patientId, doctor: a.doctorId ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName}` : 'Unassigned', time: a.appointmentDateTime, type: a.type, status: a.status, duration: a.durationMinutes })) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/appointments/no-show-analysis', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth() - months, 1);
    const analysis = await Appointment.aggregate([
      { $match: { appointmentDateTime: { $gte: startDate } } },
      { $group: { _id: { year: { $year: '$appointmentDateTime' }, month: { $month: '$appointmentDateTime' } }, total: { $sum: 1 }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'No Show'] }, 1, 0] } }, completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: { year: '$_id.year', month: '$_id.month', total: 1, noShows: 1, completed: 1, noShowRate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$noShows', '$total'] }, 100] }, 0] } } }
    ]);
    res.json({ success: true, data: analysis });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ═══ MARKET ANALYSIS ═══

router.get('/market/patient-heatmap', async (req, res) => {
  try {
    const pipeline = [
      { $match: { isActive: { $ne: false } } },
      { $addFields: { subCity: { $cond: { if: { $eq: [{ $type: '$address' }, 'object'] }, then: { $ifNull: ['$address.subCity', { $ifNull: ['$address.city', 'Unknown'] }] }, else: { $cond: { if: { $eq: [{ $type: '$address' }, 'string'] }, then: '$address', else: 'Unknown' } } } } } },
      { $group: { _id: '$subCity', count: { $sum: 1 }, avgAge: { $avg: '$age' }, genders: { $push: '$gender' } } },
      { $sort: { count: -1 } },
      { $project: { subCity: '$_id', _id: 0, count: 1, avgAge: { $round: ['$avgAge', 1] }, maleCount: { $size: { $filter: { input: '$genders', cond: { $in: ['$$this', ['male', 'Male']] } } } }, femaleCount: { $size: { $filter: { input: '$genders', cond: { $in: ['$$this', ['female', 'Female']] } } } } } }
    ];
    const heatmapData = await Patient.aggregate(pipeline);
    const total = heatmapData.reduce((s, d) => s + d.count, 0);
    res.json({ success: true, data: { totalPatients: total, areas: heatmapData.map(d => ({ ...d, percentage: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0 })) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/market/referral-analytics', async (req, res) => {
  try {
    const sourceAgg = await Patient.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: { $ifNull: ['$referralSource', 'walk-in'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const months = parseInt(req.query.months) || 6;
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth() - months, 1);
    const growthAgg = await Patient.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, newPatients: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ success: true, data: { referralSources: sourceAgg.map(s => ({ source: s._id, count: s.count })), growthTrend: growthAgg.map(g => ({ year: g._id.year, month: g._id.month, newPatients: g.newPatients, label: new Date(g._id.year, g._id.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) })) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/market/patient-demographics', async (req, res) => {
  try {
    const genderAgg = await Patient.aggregate([{ $match: { isActive: { $ne: false } } }, { $group: { _id: '$gender', count: { $sum: 1 } } }]);
    const ageAgg = await Patient.aggregate([
      { $match: { isActive: { $ne: false }, age: { $exists: true, $ne: null } } },
      { $bucket: { groupBy: '$age', boundaries: [0, 5, 13, 18, 30, 45, 60, 120], default: 'Unknown', output: { count: { $sum: 1 } } } }
    ]);
    const ageLabels = ['0-4', '5-12', '13-17', '18-29', '30-44', '45-59', '60+', 'Unknown'];
    res.json({ success: true, data: { gender: genderAgg.map(g => ({ gender: g._id || 'Unknown', count: g.count })), ageGroups: ageAgg.map((a, i) => ({ range: ageLabels[i] || String(a._id), count: a.count })) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ═══ AUDIT LOGS ═══

router.get('/audit/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.resourceType) filter.resourceType = req.query.resourceType;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.search) filter.$or = [{ userName: { $regex: req.query.search, $options: 'i' } }, { resourceName: { $regex: req.query.search, $options: 'i' } }, { description: { $regex: req.query.search, $options: 'i' } }];
    const [logs, total] = await Promise.all([AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(), AuditLog.countDocuments(filter)]);
    res.json({ success: true, data: { logs, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/audit/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 86400000);
    const [byAction, byResource, byUser, totalCount] = await Promise.all([
      AuditLog.aggregate([{ $match: { timestamp: { $gte: since } } }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AuditLog.aggregate([{ $match: { timestamp: { $gte: since } } }, { $group: { _id: '$resourceType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AuditLog.aggregate([{ $match: { timestamp: { $gte: since } } }, { $group: { _id: { userId: '$userId', userName: '$userName' }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      AuditLog.countDocuments({ timestamp: { $gte: since } })
    ]);
    res.json({ success: true, data: { totalEntries: totalCount, days, byAction: byAction.map(a => ({ action: a._id, count: a.count })), byResource: byResource.map(r => ({ resource: r._id, count: r.count })), topUsers: byUser.map(u => ({ userId: u._id.userId, userName: u._id.userName, count: u.count })) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
