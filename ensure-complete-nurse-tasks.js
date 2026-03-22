const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('clinic-cms');
  const tasks = db.collection('nursetasks');
  const prescriptions = db.collection('prescriptions');
  const patients = db.collection('patients');

  console.log('🔧 Ensuring all nurse tasks have complete data...');

  // Get all medication tasks
  const allTasks = await tasks.find({ taskType: 'MEDICATION' }).toArray();
  let updated = 0;

  for (const task of allTasks) {
    const updates = {};
    let needsUpdate = false;

    // 1. Fix patient name if missing/unknown
    if (!task.patientName || task.patientName === 'Unknown' || task.patientName === 'Unknown Patient') {
      if (task.patientId) {
        const patient = await patients.findOne({ _id: new ObjectId(String(task.patientId)) });
        if (patient) {
          const name = ((patient.firstName || '') + ' ' + (patient.lastName || '')).trim() || (patient.name || '');
          if (name) {
            updates.patientName = name;
            needsUpdate = true;
          }
        }
      }
    }

    // 2. Ensure prescription linkage
    if (!task.prescriptionId && task.medicationDetails?.prescriptionId) {
      updates.prescriptionId = task.medicationDetails.prescriptionId;
      needsUpdate = true;
    }

    // 3. Fix paymentAuthorization for paid prescriptions
    if (task.prescriptionId) {
      const prescription = await prescriptions.findOne({ _id: new ObjectId(String(task.prescriptionId)) });
      if (prescription && (prescription.paymentStatus === 'paid' || prescription.paymentStatus === 'fully_paid')) {
        const duration = task.medicationDetails?.duration || 7;
        const frequency = task.medicationDetails?.frequency || 'Once daily (QD)';
        const dosesPerDay = /tid/i.test(frequency) ? 3 : /bid/i.test(frequency) ? 2 : /qid/i.test(frequency) ? 4 : 1;
        const totalDoses = duration * dosesPerDay;

        const completePaymentAuth = {
          paidDays: duration,
          totalDays: duration,
          paymentStatus: 'fully_paid',
          canAdminister: true,
          restrictionMessage: '',
          authorizedDoses: totalDoses,
          unauthorizedDoses: 0,
          outstandingAmount: 0,
          lastUpdated: new Date(),
          ...(task.paymentAuthorization || {})
        };

        updates.paymentAuthorization = completePaymentAuth;
        needsUpdate = true;
      }
    }

    // 4. Ensure instance labels exist
    if (!task.medicationDetails?.instanceOrder || !task.medicationDetails?.instanceLabel) {
      const medName = task.medicationDetails?.medicationName;
      if (medName && task.patientId) {
        const existingCount = await tasks.countDocuments({
          patientId: task.patientId,
          'medicationDetails.medicationName': medName,
          _id: { $lt: task._id }
        });
        const order = existingCount + 1;
        const suffix = (n) => {
          if (n % 10 === 1 && n % 100 !== 11) return 'st';
          if (n % 10 === 2 && n % 100 !== 12) return 'nd';
          if (n % 10 === 3 && n % 100 !== 13) return 'rd';
          return 'th';
        };
        const label = `${order}${suffix(order)}`;

        updates['medicationDetails.instanceOrder'] = order;
        updates['medicationDetails.instanceLabel'] = label;
        needsUpdate = true;
      }
    }

    // 5. Ensure dose records exist for paid tasks
    if (task.paymentAuthorization?.canAdminister && (!task.medicationDetails?.doseRecords || task.medicationDetails.doseRecords.length === 0)) {
      const duration = task.medicationDetails?.duration || 7;
      const frequency = task.medicationDetails?.frequency || 'Once daily (QD)';
      const dosesPerDay = /tid/i.test(frequency) ? 3 : /bid/i.test(frequency) ? 2 : /qid/i.test(frequency) ? 4 : 1;
      
      const doseRecords = [];
      for (let day = 1; day <= duration; day++) {
        for (let dose = 1; dose <= dosesPerDay; dose++) {
          const timeSlots = ['09:00', '14:00', '20:00', '06:00'];
          doseRecords.push({
            day,
            timeSlot: timeSlots[dose - 1] || '09:00',
            doseSequence: (day - 1) * dosesPerDay + dose,
            doseLabel: `${(day - 1) * dosesPerDay + dose}${suffix((day - 1) * dosesPerDay + dose)}`,
            administered: false,
            administeredAt: null,
            administeredBy: null,
            notes: '',
            period: 'active'
          });
        }
      }

      updates['medicationDetails.doseRecords'] = doseRecords;
      needsUpdate = true;
    }

    // Apply updates if needed
    if (needsUpdate) {
      await tasks.updateOne({ _id: task._id }, { $set: updates });
      updated++;
      console.log(`✅ Updated task ${task._id}: ${Object.keys(updates).join(', ')}`);
    }
  }

  console.log(`🎉 Completed: ${updated}/${allTasks.length} tasks updated`);
  await client.close();
})();

function suffix(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'st';
  if (n % 10 === 2 && n % 100 !== 12) return 'nd';
  if (n % 10 === 3 && n % 100 !== 13) return 'rd';
  return 'th';
}
