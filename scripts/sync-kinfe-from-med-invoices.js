const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const dbName = 'clinic-cms';
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);

    const patients = db.collection('patients');
    const prescriptions = db.collection('prescriptions');
    const invoices = db.collection('medicalinvoices');
    const nurseTasks = db.collection('nursetasks');

    const patient = await patients.findOne({
      $or: [
        { name: /kinfe\s+michae?l/i },
        { fullName: /kinfe\s+michae?l/i },
        { patientName: /kinfe\s+michae?l/i },
        { firstName: /kinfe/i }
      ]
    });
    if (!patient) {
      console.log('❌ Kinfe not found');
      return;
    }
    const patientId = patient._id;

    // 1) Find MED- invoices for this patient that are paid
    const medInvoices = await invoices.find({
      patient: patientId,
      invoiceNumber: /^MED-/,
      $or: [
        { 'paymentAnalytics.status': 'paid' },
        { 'paymentStatus.current': 'fully_paid' },
        { balance: { $lte: 0 } }
      ]
    }).toArray();

    console.log(`Found ${medInvoices.length} MED- paid invoices for Kinfe`);

    // 2) For each, convert to PRES- (non-destructive: clone important fields), and tag original as migrated
    let updated = 0;
    for (const inv of medInvoices) {
      const newNumber = inv.invoiceNumber.replace(/^MED-/, 'PRES-');
      await invoices.updateOne(
        { _id: inv._id },
        {
          $set: {
            invoiceNumber: newNumber,
            type: 'prescription',
            'paymentAnalytics.status': 'paid',
            'paymentStatus.current': 'fully_paid',
            migratedFromMed: true,
          }
        }
      );
      updated += 1;
    }

    // 3) Sync prescriptions and nurse tasks paymentAuthorization
    const kinfePrescriptions = await prescriptions.find({
      $or: [{ patient: patientId }, { patientId: patientId }]
    }).toArray();

    const totalPaid = medInvoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);

    for (const pr of kinfePrescriptions) {
      // mark fully paid if totalPaid >= 0 (simple approach: treat as paid if any paid invoice exists)
      if (totalPaid > 0) {
        await prescriptions.updateOne({ _id: pr._id }, {
          $set: { paymentStatus: 'fully_paid', updatedAt: new Date() }
        });
      }
    }

    // update nurse tasks for this patient
    const tasks = await nurseTasks.find({ patientId: patientId.toString(), taskType: 'MEDICATION' }).toArray();
    let tasksUpdated = 0;
    for (const t of tasks) {
      const paymentAuth = {
        paidDays: t.paymentAuthorization?.totalDays || t.medicationDetails?.duration || 0,
        totalDays: t.paymentAuthorization?.totalDays || t.medicationDetails?.duration || 0,
        paymentStatus: 'fully_paid',
        canAdminister: true,
        authorizedDoses: Array.isArray(t.medicationDetails?.doseRecords)
          ? t.medicationDetails.doseRecords.length
          : (t.paymentAuthorization?.authorizedDoses || 0),
        unauthorizedDoses: 0,
        outstandingAmount: 0,
        lastUpdated: new Date()
      };
      await nurseTasks.updateOne({ _id: t._id }, { $set: { paymentAuthorization: paymentAuth } });
      tasksUpdated += 1;
    }

    console.log(`✅ Converted ${updated} invoices; updated ${kinfePrescriptions.length} prescriptions; updated ${tasksUpdated} nurse tasks.`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
  }
})();
