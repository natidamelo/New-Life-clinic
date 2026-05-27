const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const HealthPackage = require('./models/HealthPackage');
const PatientPackage = require('./models/PatientPackage');
const PackageVisit = require('./models/PackageVisit');
const Patient = require('./models/Patient');
const NurseTask = require('./models/NurseTask');
const LabOrder = require('./models/LabOrder');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function runTests() {
  console.log('=== HEALTH PACKAGE BUNDLES INTEGRATION TEST ===');
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully!');

  let testPatient = null;
  let testPackageTemplate = null;
  let testPatientPackage = null;
  let testVisit = null;
  let testDoctor = null;
  let testNurse = null;

  try {
    // 1. Create/Find a test doctor and nurse
    console.log('\n[Step 1] Creating test staff...');
    testDoctor = await User.findOne({ role: 'doctor' });
    if (!testDoctor) {
      testDoctor = new User({
        username: 'test_doctor_pkg',
        email: 'test_doc_pkg@clinic.com',
        password: 'password123',
        role: 'doctor',
        firstName: 'Test',
        lastName: 'Doctor',
        clinicId: 'default'
      });
      await testDoctor.save();
      console.log('Created new test doctor:', testDoctor._id);
    } else {
      console.log('Using existing doctor:', testDoctor.firstName, testDoctor.lastName);
    }

    testNurse = await User.findOne({ role: 'nurse' });
    if (!testNurse) {
      testNurse = new User({
        username: 'test_nurse_pkg',
        email: 'test_nurse_pkg@clinic.com',
        password: 'password123',
        role: 'nurse',
        firstName: 'Test',
        lastName: 'Nurse',
        clinicId: 'default'
      });
      await testNurse.save();
      console.log('Created new test nurse:', testNurse._id);
    } else {
      console.log('Using existing nurse:', testNurse.firstName, testNurse.lastName);
    }

    // 2. Create a test patient
    console.log('\n[Step 2] Creating test patient...');
    testPatient = new Patient({
      patientId: 'PTEST999',
      firstName: 'Test-Pkg-Patient',
      lastName: 'Melo',
      age: 45,
      dateOfBirth: new Date('1981-05-15'),
      gender: 'male',
      contactNumber: '+251912345678',
      address: 'Addis Ababa, Ethiopia',
      status: 'Outpatient',
      clinicId: 'default'
    });
    await testPatient.save();
    console.log('Created patient:', testPatient.firstName, 'ID:', testPatient.patientId);

    // 3. Create a HealthPackage Catalog template
    console.log('\n[Step 3] Creating health package template...');
    testPackageTemplate = new HealthPackage({
      clinicId: 'default',
      name: 'TEST Diabetic Bundle Package',
      description: 'A test package for tracking diabetic patients including FBS, HbA1c tests.',
      total_visits: 5,
      validity_days: 90,
      price: 2500,
      services: ['FBS (Fasting Blood Sugar)', 'HbA1c test', 'Doctor Consultation', 'Vitals Check'],
      is_active: true
    });
    await testPackageTemplate.save();
    console.log('Created package template:', testPackageTemplate.name, 'Price:', testPackageTemplate.price);

    // 4. Subscribe Patient to Package (Assign PatientPackage)
    console.log('\n[Step 4] Subscribing patient to package...');
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + testPackageTemplate.validity_days);

    testPatientPackage = new PatientPackage({
      clinicId: 'default',
      patient_id: testPatient._id,
      package_id: testPackageTemplate._id,
      purchased_date: startDate,
      expiry_date: expiryDate,
      total_visits: testPackageTemplate.total_visits,
      visits_used: 0,
      visits_remaining: testPackageTemplate.total_visits,
      status: 'active',
      payment_status: 'partial',
      amount_paid: 1500, // Partial payment
      balance_due: 1000  // 2500 - 1500 = 1000
    });
    await testPatientPackage.save();
    console.log('Assigned patient package. Status:', testPatientPackage.status, 'Balance Due:', testPatientPackage.balance_due);

    // Assert partial payment calculations
    if (testPatientPackage.payment_status !== 'partial') {
      throw new Error('Assertion failed: Payment status should be partial');
    }
    if (testPatientPackage.balance_due !== 1000) {
      throw new Error('Assertion failed: Balance due should be 1000');
    }
    console.log('✔ Package Assignment validations passed!');

    // 5. Log visit & route to Nurse, Doctor, and Lab
    console.log('\n[Step 5] Recording package visit and routing...');
    
    // Simulate reception logging visit #1
    // Request routing to: Nurse (vitals), Doctor (consultation), Lab (tests FBS & HbA1c)
    // Pay remaining balance of 500 ETB
    const visitNumber = 1;
    testVisit = new PackageVisit({
      clinicId: 'default',
      patient_package_id: testPatientPackage._id,
      patient_id: testPatient._id,
      visit_date: new Date(),
      visit_number: visitNumber,
      attended_by: testDoctor._id,
      blood_pressure_systolic: 125,
      blood_pressure_diastolic: 82,
      blood_sugar_fasting: 110,
      weight_kg: 72,
      bmi: 23.5,
      diagnosis_notes: 'Patient exhibits stable blood pressure. Fasting sugar is slightly high. Ordering HbA1c.',
      medications_given: ['Metformin 500mg'],
      lab_results: [],
      next_visit_due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // in 2 weeks
      next_visit_notes: 'Follow up in 2 weeks.',
      payment_collected: 500, // collected 500 ETB
      needs_consultation: true,
      needs_vitals: true,
      needs_lab: true,
      lab_services_ordered: ['HbA1c test']
    });
    await testVisit.save();
    console.log('Created visit record #', testVisit.visit_number);

    // Apply updates to PatientPackage
    testPatientPackage.visits_used += 1;
    testPatientPackage.visits_remaining -= 1;
    testPatientPackage.amount_paid += 500;
    testPatientPackage.balance_due = Math.max(0, testPatientPackage.balance_due - 500);
    if (testPatientPackage.balance_due === 0) {
      testPatientPackage.payment_status = 'paid';
    } else {
      testPatientPackage.payment_status = 'partial';
    }
    await testPatientPackage.save();
    console.log('Updated patient package visits used:', testPatientPackage.visits_used, 'remaining:', testPatientPackage.visits_remaining);
    console.log('Updated payment: amount_paid =', testPatientPackage.amount_paid, 'balance_due =', testPatientPackage.balance_due, 'status =', testPatientPackage.payment_status);

    // Check updates
    if (testPatientPackage.visits_remaining !== 4) {
      throw new Error('Assertion failed: visits_remaining should be 4');
    }
    if (testPatientPackage.balance_due !== 500) {
      throw new Error('Assertion failed: balance_due should be 500');
    }
    if (testPatientPackage.payment_status !== 'partial') {
      throw new Error('Assertion failed: payment_status should remain partial');
    }
    console.log('✔ Visit consumption metrics updated successfully!');

    // 6. Perform dynamic routing to patient queues
    console.log('\n[Step 6] Verifying routing updates on Patient record...');
    const patientObj = await Patient.findById(testPatient._id);
    patientObj.assignedNurseId = testNurse._id;
    patientObj.assignedDoctorId = testDoctor._id;
    
    // routed to wait for nurse vitals
    patientObj.status = 'waiting';
    await patientObj.save();
    console.log('Updated patient status:', patientObj.status, 'Assigned Nurse:', patientObj.assignedNurseId, 'Assigned Doctor:', patientObj.assignedDoctorId);

    if (patientObj.status !== 'waiting') {
      throw new Error('Assertion failed: Patient status should be waiting');
    }
    console.log('✔ Patient record routing updated successfully!');

    // 7. Verify NurseTask generation
    console.log('\n[Step 7] Generating NurseTask for vitals signs...');
    const nurseTask = new NurseTask({
      patientId: patientObj._id,
      patientName: `${patientObj.firstName} ${patientObj.lastName}`,
      taskType: 'VITAL_SIGNS',
      description: `Vital signs check for ${patientObj.firstName} ${patientObj.lastName} (Package: Visit ${visitNumber})`,
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedBy: testDoctor._id,
      assignedByName: 'Test Doctor',
      assignedTo: testNurse._id,
      dueDate: new Date(),
      notes: `Vitals check needed for health package visit. Please record temperature, BP, blood sugar, weight and BMI.`,
      metadata: { packageVisitId: testVisit._id }
    });
    await nurseTask.save();
    console.log('Created NurseTask. ID:', nurseTask._id, 'Status:', nurseTask.status, 'Assigned To Nurse:', nurseTask.assignedTo);

    const foundNurseTask = await NurseTask.findOne({ 'metadata.packageVisitId': testVisit._id });
    if (!foundNurseTask) {
      throw new Error('Assertion failed: NurseTask not found by packageVisitId metadata');
    }
    if (foundNurseTask.status !== 'PENDING' || foundNurseTask.taskType !== 'VITAL_SIGNS') {
      throw new Error('Assertion failed: NurseTask details are incorrect');
    }
    console.log('✔ NurseTask generated and validated successfully!');

    // 8. Verify LabOrder generation
    console.log('\n[Step 8] Generating LabOrder for HbA1c test...');
    const labOrder = new LabOrder({
      patientId: patientObj._id,
      orderingDoctorId: testDoctor._id,
      createdBy: testDoctor._id,
      source: 'reception',
      testName: 'HbA1c test',
      status: 'Ordered',
      paymentStatus: 'paid', // Pre-paid as part of package
      orderDateTime: new Date(),
      notes: `Ordered under package visit #${visitNumber}`
    });
    await labOrder.save();
    console.log('Created LabOrder. ID:', labOrder._id, 'Status:', labOrder.status, 'Payment Status:', labOrder.paymentStatus);

    const foundLabOrder = await LabOrder.findOne({ patientId: patientObj._id, testName: 'HbA1c test' });
    if (!foundLabOrder) {
      throw new Error('Assertion failed: LabOrder not found for test patient');
    }
    if (foundLabOrder.status !== 'Ordered' || foundLabOrder.paymentStatus !== 'paid') {
      throw new Error('Assertion failed: LabOrder status or payment status is incorrect');
    }
    console.log('✔ LabOrder generated and validated successfully!');

    console.log('\n================================================');
    console.log('🎉 ALL BACKEND & CLINICAL ROUTING INTEGRATION TESTS PASSED!');
    console.log('================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  } finally {
    // Cleanup test records
    console.log('\nCleaning up test records...');
    
    if (testVisit) {
      await PackageVisit.findByIdAndDelete(testVisit._id);
      console.log('Deleted PackageVisit:', testVisit._id);
    }
    if (testPatientPackage) {
      await PatientPackage.findByIdAndDelete(testPatientPackage._id);
      console.log('Deleted PatientPackage:', testPatientPackage._id);
    }
    if (testPackageTemplate) {
      await HealthPackage.findByIdAndDelete(testPackageTemplate._id);
      console.log('Deleted HealthPackage template:', testPackageTemplate._id);
    }
    if (testPatient) {
      await Patient.findByIdAndDelete(testPatient._id);
      console.log('Deleted Patient:', testPatient._id);
    }

    // Delete NurseTask and LabOrder created during test
    if (testPatient) {
      const nurseTasksDel = await NurseTask.deleteMany({ patientId: testPatient._id });
      console.log(`Deleted ${nurseTasksDel.deletedCount} test NurseTasks`);
      const labOrdersDel = await LabOrder.deleteMany({ patientId: testPatient._id });
      console.log(`Deleted ${labOrdersDel.deletedCount} test LabOrders`);
    }

    // Close DB Connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

runTests();
