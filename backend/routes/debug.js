const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Prescription = require('../models/Prescription');

// Debug endpoint to check payment notifications without auth
router.get('/payment-notifications', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking payment notifications...');

    // 1. Get all medication payment notifications
    const allMedicationNotifications = await Notification.find({
      type: 'medication_payment_required'
    }).sort({ timestamp: -1 }).limit(10);

    console.log(`Found ${allMedicationNotifications.length} medication payment notifications`);

    const notificationDetails = allMedicationNotifications.map((notif, index) => ({
      id: notif._id,
      read: notif.read || notif.isRead || false,
      amount: notif.data?.amount || 'No amount',
      totalAmount: notif.data?.totalAmount || 'No totalAmount',
      patientName: notif.data?.patientName || 'No patient name',
      created: notif.timestamp || notif.createdAt,
      prescriptionId: notif.data?.prescriptionId
    }));

    // 2. Check what would pass the frontend filter
    const frontendFiltered = notificationDetails.filter(notif => {
      const amount = notif.amount !== 'No amount' ? notif.amount : (notif.totalAmount !== 'No totalAmount' ? notif.totalAmount : 0);
      return !notif.read && amount > 0;
    });

    // 3. Check recent prescriptions
    const recentPrescriptions = await Prescription.find({
      totalCost: { $gt: 0 },
      datePrescribed: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).populate('patient', 'firstName lastName').sort({ datePrescribed: -1 }).limit(5);

    const prescriptionDetails = recentPrescriptions.map(pres => ({
      id: pres._id,
      patient: pres.patient ? `${pres.patient.firstName} ${pres.patient.lastName}` : 'Unknown',
      medication: pres.medicationName,
      totalCost: pres.totalCost,
      status: pres.status,
      paymentStatus: pres.paymentStatus,
      created: pres.datePrescribed
    }));

    res.json({
      success: true,
      summary: {
        totalNotifications: allMedicationNotifications.length,
        shouldShowInFrontend: frontendFiltered.length,
        recentPrescriptions: recentPrescriptions.length
      },
      data: {
        allNotifications: notificationDetails,
        frontendFiltered: frontendFiltered,
        recentPrescriptions: prescriptionDetails
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 