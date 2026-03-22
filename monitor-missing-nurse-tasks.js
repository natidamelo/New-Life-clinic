const { MongoClient, ObjectId } = require('mongodb');

/**
 * Monitor script to detect and fix missing nurse tasks for paid prescriptions
 * Run this periodically to catch any prescriptions that didn't get nurse tasks
 */
(async () => {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('clinic-cms');
  const prescriptions = db.collection('prescriptions');
  const tasks = db.collection('nursetasks');
  const patients = db.collection('patients');

  console.log('🔍 Monitoring for missing nurse tasks...');

  // Find paid prescriptions without nurse tasks
  const paidPrescriptions = await prescriptions.find({
    paymentStatus: { $in: ['paid', 'fully_paid', 'partial', 'partially_paid'] },
    sendToNurse: { $ne: false }
  }).toArray();

  const missingTasks = [];
  for (const prescription of paidPrescriptions) {
    const existingTask = await tasks.findOne({
      prescriptionId: prescription._id,
      taskType: 'MEDICATION'
    });
    
    if (!existingTask) {
      missingTasks.push(prescription);
    }
  }

  if (missingTasks.length === 0) {
    console.log('✅ All paid prescriptions have nurse tasks');
    await client.close();
    return;
  }

  console.log(`⚠️ Found ${missingTasks.length} paid prescriptions without nurse tasks:`);
  
  let created = 0;
  for (const prescription of missingTasks) {
    try {
      console.log(`Creating nurse task for: ${prescription.medicationName} (${prescription._id})`);
      
      // Get patient info
      const patient = await patients.findOne({ _id: new ObjectId(String(prescription.patient || prescription.patientId)) });
      const patientName = patient ? ((patient.firstName || '') + ' ' + (patient.lastName || '')).trim() || patient.name || 'Unknown' : 'Unknown';
      
      // Calculate task data
      const medName = prescription.medicationName || (prescription.medications && prescription.medications[0]?.name) || 'Medication';
      const frequency = prescription.frequency || (prescription.medications && prescription.medications[0]?.frequency) || 'Once daily (QD)';
      const durationNum = (m => m ? parseInt(m[1]) : 7)(String(prescription.duration || '').match(/(\d+)/));
      const route = prescription.route || (prescription.medications && prescription.medications[0]?.route) || 'Oral';
      const dosage = prescription.dosage || (prescription.medications && prescription.medications[0]?.dosage) || '';
      
      const dosesPerDay = /tid/i.test(frequency) ? 3 : /bid/i.test(frequency) ? 2 : /qid/i.test(frequency) ? 4 : 1;
      const totalDoses = durationNum * dosesPerDay;
      
      // Calculate instance order
      const instanceCount = await tasks.countDocuments({
        patientId: new ObjectId(String(prescription.patient || prescription.patientId)),
        'medicationDetails.medicationName': medName
      });
      
      const suffix = (n) => {
        if (n % 10 === 1 && n % 100 !== 11) return 'st';
        if (n % 10 === 2 && n % 100 !== 12) return 'nd';
        if (n % 10 === 3 && n % 100 !== 13) return 'rd';
        return 'th';
      };
      const label = `${instanceCount + 1}${suffix(instanceCount + 1)}`;
      
      // Generate dose records
      const doseRecords = [];
      for (let day = 1; day <= durationNum; day++) {
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
      
      // Create nurse task
      const taskDoc = {
        patientId: new ObjectId(String(prescription.patient || prescription.patientId)),
        patientName,
        taskType: 'MEDICATION',
        description: `Administer ${medName} - ${dosage} - ${frequency}`,
        status: 'PENDING',
        priority: 'MEDIUM',
        assignedBy: (prescription.doctor || prescription.doctorId) || new ObjectId(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: '',
        prescriptionId: prescription._id,
        paymentAuthorization: {
          paidDays: durationNum,
          totalDays: durationNum,
          paymentStatus: 'fully_paid',
          canAdminister: true,
          restrictionMessage: '',
          authorizedDoses: totalDoses,
          unauthorizedDoses: 0,
          outstandingAmount: 0,
          lastUpdated: new Date()
        },
        medicationDetails: {
          medicationName: medName,
          dosage,
          route,
          frequency,
          duration: durationNum,
          prescriptionId: prescription._id,
          instanceOrder: instanceCount + 1,
          instanceLabel: label,
          doseRecords
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await tasks.insertOne(taskDoc);
      created++;
      console.log(`✅ Created nurse task for ${medName}`);
      
    } catch (error) {
      console.error(`❌ Failed to create nurse task for ${prescription.medicationName}:`, error.message);
    }
  }
  
  console.log(`🎉 Created ${created}/${missingTasks.length} missing nurse tasks`);
  await client.close();
})();
