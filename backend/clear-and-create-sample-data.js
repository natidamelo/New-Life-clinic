const mongoose = require('mongoose');
require('dotenv').config();

async function clearAndCreateSampleData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const Patient = require('./models/Patient');
    const LabOrder = require('./models/LabOrder');
    const MedicalInvoice = require('./models/MedicalInvoice');
    const Appointment = require('./models/Appointment');
    const NurseTask = require('./models/NurseTask');
    const User = require('./models/User');
    
    console.log('\n🗑️ Clearing existing sample data...');
    
    // Clear existing data
    await Promise.all([
      Patient.deleteMany({}),
      LabOrder.deleteMany({}),
      MedicalInvoice.deleteMany({}),
      Appointment.deleteMany({}),
      NurseTask.deleteMany({})
    ]);
    
    console.log('✅ Cleared existing data');
    
    console.log('\n📊 Creating fresh sample data...');
    
    // Get a doctor for assignments
    const doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      console.log('❌ No doctor found. Please create a doctor user first.');
      process.exit(1);
    }
    
    // Create sample patients
    const patients = [
      {
        firstName: 'John',
        lastName: 'Doe',
        patientId: 'P001',
        email: 'john.doe@example.com',
        contactNumber: '+1234567890',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'male',
        address: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'USA'
        },
        assignedDoctorId: doctor._id,
        status: 'Active'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        patientId: 'P002',
        email: 'jane.smith@example.com',
        contactNumber: '+1234567891',
        dateOfBirth: new Date('1985-05-20'),
        gender: 'female',
        address: {
          street: '456 Oak Ave',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'USA'
        },
        assignedDoctorId: doctor._id,
        status: 'Active'
      },
      {
        firstName: 'Bob',
        lastName: 'Johnson',
        patientId: 'P003',
        email: 'bob.johnson@example.com',
        contactNumber: '+1234567892',
        dateOfBirth: new Date('1978-12-10'),
        gender: 'male',
        address: {
          street: '789 Pine St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'USA'
        },
        assignedDoctorId: doctor._id,
        status: 'Active'
      }
    ];
    
    const createdPatients = await Patient.insertMany(patients);
    console.log(`✅ Created ${createdPatients.length} patients`);
    
    // Create sample appointments
    const today = new Date();
    const appointments = [
      {
        patientId: createdPatients[0]._id,
        doctorId: doctor._id,
        appointmentDateTime: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        durationMinutes: 30,
        type: 'Consultation',
        status: 'Scheduled',
        reason: 'Regular checkup'
      },
      {
        patientId: createdPatients[1]._id,
        doctorId: doctor._id,
        appointmentDateTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        durationMinutes: 45,
        type: 'Follow-up',
        status: 'Scheduled',
        reason: 'Follow-up visit'
      }
    ];
    
    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`✅ Created ${createdAppointments.length} appointments`);
    
    // Create sample lab orders
    const labOrders = [
      {
        patientId: createdPatients[0]._id,
        orderingDoctorId: doctor._id,
        testName: 'Blood Test - Complete Blood Count',
        status: 'Ordered',
        paymentStatus: 'pending',
        orderDateTime: new Date(),
        notes: 'Routine blood work'
      },
      {
        patientId: createdPatients[1]._id,
        orderingDoctorId: doctor._id,
        testName: 'Urine Analysis',
        status: 'Results Available',
        paymentStatus: 'paid',
        orderDateTime: new Date(),
        notes: 'Urine culture and sensitivity'
      }
    ];
    
    const createdLabOrders = await LabOrder.insertMany(labOrders);
    console.log(`✅ Created ${createdLabOrders.length} lab orders`);
    
    // Create sample invoices
    const invoices = [
      {
        patient: createdPatients[0]._id,
        patientId: createdPatients[0].patientId,
        patientName: `${createdPatients[0].firstName} ${createdPatients[0].lastName}`,
        invoiceNumber: 'INV001',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        total: 150.00,
        balance: 0.00, // Fully paid
        amountPaid: 150.00,
        status: 'paid',
        createdBy: doctor._id,
        items: [
          {
            itemType: 'consultation',
            description: 'Consultation',
            quantity: 1,
            unitPrice: 100.00,
            total: 100.00
          },
          {
            itemType: 'lab',
            description: 'Blood Test',
            quantity: 1,
            unitPrice: 50.00,
            total: 50.00
          }
        ]
      },
      {
        patient: createdPatients[1]._id,
        patientId: createdPatients[1].patientId,
        patientName: `${createdPatients[1].firstName} ${createdPatients[1].lastName}`,
        invoiceNumber: 'INV002',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        total: 200.00,
        balance: 200.00, // Unpaid
        amountPaid: 0.00,
        status: 'pending',
        createdBy: doctor._id,
        items: [
          {
            itemType: 'consultation',
            description: 'Follow-up Consultation',
            quantity: 1,
            unitPrice: 120.00,
            total: 120.00
          },
          {
            itemType: 'lab',
            description: 'Urine Analysis',
            quantity: 1,
            unitPrice: 80.00,
            total: 80.00
          }
        ]
      }
    ];
    
    const createdInvoices = await MedicalInvoice.insertMany(invoices);
    console.log(`✅ Created ${createdInvoices.length} invoices`);
    
    // Create sample nurse tasks
    const nurseTasks = [
      {
        patientId: createdPatients[0]._id,
        patientName: `${createdPatients[0].firstName} ${createdPatients[0].lastName}`,
        taskType: 'VITAL_SIGNS',
        description: 'Take blood pressure and temperature',
        priority: 'MEDIUM',
        status: 'PENDING',
        assignedBy: doctor._id,
        assignedByName: `${doctor.firstName} ${doctor.lastName}`,
        assignedTo: doctor._id,
        assignedToName: `${doctor.firstName} ${doctor.lastName}`,
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      },
      {
        patientId: createdPatients[1]._id,
        patientName: `${createdPatients[1].firstName} ${createdPatients[1].lastName}`,
        taskType: 'MEDICATION',
        description: 'Administer prescribed medication',
        priority: 'HIGH',
        status: 'PENDING',
        assignedBy: doctor._id,
        assignedByName: `${doctor.firstName} ${doctor.lastName}`,
        assignedTo: doctor._id,
        assignedToName: `${doctor.firstName} ${doctor.lastName}`,
        dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour from now
      }
    ];
    
    const createdTasks = await NurseTask.insertMany(nurseTasks);
    console.log(`✅ Created ${createdTasks.length} nurse tasks`);
    
    console.log('\n🎉 Sample data created successfully!');
    console.log('Dashboard should now show real data:');
    console.log('- 3 patients');
    console.log('- 2 appointments');
    console.log('- 2 lab orders (1 pending, 1 completed)');
    console.log('- 2 invoices (1 paid, 1 pending)');
    console.log('- 2 nurse tasks (both pending)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    process.exit(1);
  }
}

clearAndCreateSampleData();
