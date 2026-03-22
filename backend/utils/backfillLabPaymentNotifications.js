const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const LabPricingService = require('../services/labPricingService');

/**
 * Backfill unread lab_payment_required notifications for existing pending lab orders.
 * - Groups pending lab orders by patient
 * - If an unread notification exists for that patient, updates it to include any missing orders
 * - Otherwise, creates a new unread notification
 * Returns a summary object with counts.
 */
async function backfillLabPaymentNotifications({ days = 30 } = {}) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  // Fetch pending/unpaid lab orders from the last N days
  // EXCLUDE partially_paid orders to prevent backfill for orders that already have payments
  const pendingLabOrders = await LabOrder.find({
    $and: [
      {
        $or: [
          { paymentStatus: { $in: ['pending', 'unpaid'] } },
          { paymentStatus: { $exists: false } },
          {
            $and: [
              { status: { $in: ['Pending Payment', 'Ordered'] } },
              { paymentStatus: { $nin: ['paid', 'partially_paid'] } }
            ]
          }
        ]
      },
      { createdAt: { $gte: sinceDate } }
    ]
  })
    .populate('patientId', 'firstName lastName patientId')
    .sort({ createdAt: -1 })
    .lean();

  const groupedByPatient = new Map();
  for (const order of pendingLabOrders) {
    const pid = (order.patientId && order.patientId._id ? order.patientId._id : order.patientId).toString();
    if (!groupedByPatient.has(pid)) groupedByPatient.set(pid, []);
    groupedByPatient.get(pid).push(order);
  }

  let created = 0;
  let updated = 0;

  for (const [patientId, orders] of groupedByPatient.entries()) {
    // findByAnyId returns a document, not a Query – do NOT call .lean() on it
    const patientDoc = await Patient.findByAnyId(patientId);
    const patientName = patientDoc ? `${patientDoc.firstName} ${patientDoc.lastName}`.trim() : 'Unknown Patient';
    const standardizedPatientId = patientDoc?.getStandardizedId ? patientDoc.getStandardizedId() : (patientDoc?._id?.toString?.() || patientId);

    let existing = await Notification.findOne({
      type: 'lab_payment_required',
      'data.patientId': standardizedPatientId,
      read: false,
    });

    const tests = [];
    let totalAmount = 0;
    for (const order of orders) {
      const priceInfo = await LabPricingService.findInventoryPrice(order.testName || '');
      const price = priceInfo?.price ?? order.totalPrice ?? 0;
      totalAmount += Number(price) || 0;
      tests.push({ testName: order.testName, price, labOrderId: order._id });
    }

    const labOrderIds = orders.map(o => o._id);
    const testNames = tests.map(t => t.testName).join(', ');

    if (existing) {
      // Merge missing labOrderIds/tests and update amounts
      const existingIds = new Set((existing.data?.labOrderIds || []).map(id => id.toString()));
      const mergedIds = [...existingIds];
      for (const id of labOrderIds) {
        const s = id.toString();
        if (!existingIds.has(s)) mergedIds.push(id);
      }
      existing.data = existing.data || {};
      existing.data.labOrderIds = mergedIds;
      // Merge tests by labOrderId
      const byId = new Map((existing.data.tests || []).map(t => [t.labOrderId?.toString?.() || '', t]));
      for (const t of tests) {
        const key = t.labOrderId?.toString?.() || '';
        if (key && !byId.has(key)) byId.set(key, t);
      }
      existing.data.tests = Array.from(byId.values());
      existing.data.testNames = Array.from(new Set(existing.data.tests.map(t => t.testName)));
      existing.data.amount = existing.data.tests.reduce((s, t) => s + (Number(t.price) || 0), 0);
      existing.data.totalAmount = existing.data.amount;
      existing.data.itemCount = existing.data.tests.length;
      existing.message = `Payment required for lab tests: ${existing.data.testNames.join(', ')} (Total: ETB ${existing.data.totalAmount})`;
      await existing.save();
      updated += 1;
    } else {
      await Notification.create({
        type: 'lab_payment_required',
        title: 'Lab Tests Payment Required',
        message: `Payment required for ${orders.length} lab test${orders.length > 1 ? 's' : ''}: ${testNames}`,
        recipientRole: 'reception',
        senderRole: 'doctor',
        senderId: (orders[0]?.orderingDoctorId || '').toString(),
        data: {
          labOrderIds,
          patientId: standardizedPatientId,
          patientName,
          testNames,
          tests,
          amount: totalAmount,
          totalAmount,
          itemCount: orders.length,
          paymentStatus: 'pending'
        },
        priority: 'high',
        read: false,
        timestamp: new Date()
      });
      created += 1;
    }
  }

  return { created, updated, scannedOrders: pendingLabOrders.length, affectedPatients: groupedByPatient.size };
}

module.exports = { backfillLabPaymentNotifications };



