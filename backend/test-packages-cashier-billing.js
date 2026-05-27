const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const HealthPackage = require('./models/HealthPackage');
const PatientPackage = require('./models/PatientPackage');
const Patient = require('./models/Patient');
const MedicalInvoice = require('./models/MedicalInvoice');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function runTests() {
  console.log('=== HEALTH PACKAGE CASHIER BILLING TEST ===');
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully!');

  let testPatient = null;
  let testPackageTemplate = null;
  let testPatientPackage = null;
  let testInvoice = null;
  let testStaff = null;

  try {
    // 1. Create/Find a test user/staff
    console.log('\n[Step 1] Finding/Creating test staff...');
    testStaff = await User.findOne({ role: 'admin' });
    if (!testStaff) {
      testStaff = new User({
        username: 'test_admin_billing',
        email: 'test_admin_billing@clinic.com',
        password: 'password123',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin',
        clinicId: 'default'
      });
      await testStaff.save();
      console.log('Created new test admin:', testStaff._id);
    } else {
      console.log('Using existing admin:', testStaff.firstName, testStaff.lastName);
    }

    // 2. Create a test patient
    console.log('\n[Step 2] Creating test patient...');
    testPatient = new Patient({
      patientId: 'PBILL999',
      firstName: 'Test-Billing-Patient',
      lastName: 'Melo',
      age: 38,
      dateOfBirth: new Date('1988-06-20'),
      gender: 'female',
      contactNumber: '+251911223344',
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
      name: 'TEST Cashier Billing Package',
      description: 'A test package for checking cashier billing integration.',
      total_visits: 3,
      validity_days: 60,
      price: 3000,
      services: ['Blood Pressure Check', 'Physiotherapy Consultation'],
      is_active: true
    });
    await testPackageTemplate.save();
    console.log('Created package template:', testPackageTemplate.name, 'Price:', testPackageTemplate.price);

    // 4. Simulate patient subscription via endpoint routing logic
    console.log('\n[Step 4] Subscribing patient to package (initial unpaid)...');
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + testPackageTemplate.validity_days);

    // Initial state is unpaid: amount_paid = 0, balance_due = price, payment_status = pending
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
      payment_status: 'pending',
      amount_paid: 0,
      balance_due: testPackageTemplate.price
    });
    await testPatientPackage.save();
    console.log('Assigned patient package. Status:', testPatientPackage.status, 'Payment Status:', testPatientPackage.payment_status, 'Balance Due:', testPatientPackage.balance_due);

    // Create the MedicalInvoice as healthPackages.js router does
    const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
    testInvoice = new MedicalInvoice({
      clinicId: 'default',
      invoiceNumber,
      patient: testPatient._id,
      patientId: testPatient.patientId,
      patientName: `${testPatient.firstName} ${testPatient.lastName}`.trim(),
      issueDate: startDate,
      dueDate: expiryDate,
      items: [{
        itemType: 'service',
        category: 'service',
        description: `Health Package Subscription: ${testPackageTemplate.name}`,
        quantity: 1,
        unitPrice: testPackageTemplate.price,
        total: testPackageTemplate.price,
        notes: `Predefined package containing ${testPackageTemplate.total_visits} visits.`
      }],
      subtotal: testPackageTemplate.price,
      total: testPackageTemplate.price,
      amountPaid: 0,
      balance: testPackageTemplate.price,
      status: 'pending',
      paymentStatus: {
        current: 'unpaid',
        percentage: 0,
        lastUpdated: new Date()
      },
      createdBy: testStaff._id,
      finalized: true,
      finalizedAt: new Date(),
      finalizedBy: testStaff._id
    });
    await testInvoice.save();
    console.log('Created MedicalInvoice. Invoice Number:', testInvoice.invoiceNumber, 'Status:', testInvoice.status, 'Balance:', testInvoice.balance);

    // Assert initial invoice state
    if (testInvoice.status !== 'pending' || testInvoice.paymentStatus.current !== 'unpaid') {
      throw new Error(`Assertion failed: Initial invoice status should be pending/unpaid. Got status: ${testInvoice.status}, current: ${testInvoice.paymentStatus.current}`);
    }

    // 5. Process partial payment (amount: 1200) using method: 'card' (Cashier simulation)
    console.log('\n[Step 5] Cashier collects partial payment (1200 ETB via card)...');
    const payment1Reference = `CARD-PAY-${Date.now()}`;
    
    // In EMR Billing, payments are pushed to payments array
    testInvoice.payments.push({
      amount: 1200,
      method: 'card',
      reference: payment1Reference,
      date: new Date(),
      processedBy: testStaff._id,
      notes: 'Partial payment on card'
    });
    
    // And to paymentHistory
    testInvoice.paymentHistory.push({
      amount: 1200,
      method: 'card',
      reference: payment1Reference,
      date: new Date(),
      processedBy: testStaff._id,
      notes: 'Partial payment on card',
      paymentType: 'partial',
      previousBalance: 3000,
      newBalance: 1800,
      paymentPercentage: 40
    });

    // Save invoice to trigger pre-save hook and check if PatientPackage synced
    await testInvoice.save();
    console.log('Saved invoice. Invoice Number:', testInvoice.invoiceNumber, 'Status:', testInvoice.status, 'Amount Paid:', testInvoice.amountPaid, 'Balance:', testInvoice.balance);

    // Re-fetch PatientPackage to verify it updated
    const updatedPkg1 = await PatientPackage.findById(testPatientPackage._id);
    console.log('Refetched PatientPackage. Amount Paid:', updatedPkg1.amount_paid, 'Balance Due:', updatedPkg1.balance_due, 'Payment Status:', updatedPkg1.payment_status);

    if (updatedPkg1.payment_status !== 'partial') {
      throw new Error(`Assertion failed: PatientPackage payment_status should be partial. Got: ${updatedPkg1.payment_status}`);
    }
    if (updatedPkg1.amount_paid !== 1200) {
      throw new Error(`Assertion failed: PatientPackage amount_paid should be 1200. Got: ${updatedPkg1.amount_paid}`);
    }
    if (updatedPkg1.balance_due !== 1800) {
      throw new Error(`Assertion failed: PatientPackage balance_due should be 1800. Got: ${updatedPkg1.balance_due}`);
    }
    console.log('✔ Partial payment via Card synchronized perfectly!');

    // 6. Process final payment (amount: 1800) using method: 'cash' (Cashier simulation)
    console.log('\n[Step 6] Cashier collects final payment (1800 ETB via cash)...');
    const payment2Reference = `CASH-PAY-${Date.now()}`;

    testInvoice.payments.push({
      amount: 1800,
      method: 'cash',
      reference: payment2Reference,
      date: new Date(),
      processedBy: testStaff._id,
      notes: 'Final payment cash'
    });

    testInvoice.paymentHistory.push({
      amount: 1800,
      method: 'cash',
      reference: payment2Reference,
      date: new Date(),
      processedBy: testStaff._id,
      notes: 'Final payment cash',
      paymentType: 'full',
      previousBalance: 1800,
      newBalance: 0,
      paymentPercentage: 60
    });

    await testInvoice.save();
    console.log('Saved invoice. Invoice Number:', testInvoice.invoiceNumber, 'Status:', testInvoice.status, 'Amount Paid:', testInvoice.amountPaid, 'Balance:', testInvoice.balance);

    // Re-fetch PatientPackage to verify it updated
    const updatedPkg2 = await PatientPackage.findById(testPatientPackage._id);
    console.log('Refetched PatientPackage. Amount Paid:', updatedPkg2.amount_paid, 'Balance Due:', updatedPkg2.balance_due, 'Payment Status:', updatedPkg2.payment_status);

    if (updatedPkg2.payment_status !== 'paid') {
      throw new Error(`Assertion failed: PatientPackage payment_status should be paid. Got: ${updatedPkg2.payment_status}`);
    }
    if (updatedPkg2.amount_paid !== 3000) {
      throw new Error(`Assertion failed: PatientPackage amount_paid should be 3000. Got: ${updatedPkg2.amount_paid}`);
    }
    if (updatedPkg2.balance_due !== 0) {
      throw new Error(`Assertion failed: PatientPackage balance_due should be 0. Got: ${updatedPkg2.balance_due}`);
    }
    console.log('✔ Final payment via Cash synchronized perfectly!');

    console.log('\n================================================');
    console.log('🎉 ALL CASHIER BILLING INTEGRATION TESTS PASSED!');
    console.log('================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  } finally {
    // Cleanup test records
    console.log('\nCleaning up test records...');
    if (testInvoice) {
      await MedicalInvoice.findByIdAndDelete(testInvoice._id);
      console.log('Deleted MedicalInvoice:', testInvoice._id);
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

    // Close DB Connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

runTests();
