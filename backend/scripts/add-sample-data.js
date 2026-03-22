const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const MedicalInvoice = require('../models/MedicalInvoice');
const NurseTask = require('../models/NurseTask');
const LabOrder = require('../models/LabOrder');
const Notification = require('../models/Notification');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const addSampleData = async () => {
  try {
    await connectDB();

    // Check if data already exists
    const existingPatients = await Patient.countDocuments();
    if (existingPatients > 0) {
      console.log(`Found ${existingPatients} existing patients. Dashboard should show real data.`);
      console.log('Sample data already exists. Skipping...');
      return;
    }

    console.log('Adding sample data...');

    // Add sample patients
    const patients = [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male',
        phone: '+251911234567',
        contactNumber: '+251911234567',
        email: 'john.doe@email.com',
        address: 'Addis Ababa, Ethiopia',
        registrationDate: new Date('2024-01-15')
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-08-22'),
        gender: 'female',
        phone: '+251922345678',
        contactNumber: '+251922345678',
        email: 'jane.smith@email.com',
        address: 'Addis Ababa, Ethiopia',
        registrationDate: new Date('2024-02-10')
      },
      {
        firstName: 'Ahmed',
        lastName: 'Hassan',
        dateOfBirth: new Date('1978-12-03'),
        gender: 'male',
        phone: '+251933456789',
        contactNumber: '+251933456789',
        email: 'ahmed.hassan@email.com',
        address: 'Addis Ababa, Ethiopia',
        registrationDate: new Date('2024-03-05')
      }
    ];

    const createdPatients = await Patient.insertMany(patients);
    console.log(`Added ${createdPatients.length} patients`);

    // Add sample staff
    const staff = [
      {
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@clinic.com',
        role: 'doctor',
        phone: '+251944567890',
        department: 'General Medicine'
      },
      {
        firstName: 'Nurse Mary',
        lastName: 'Williams',
        email: 'mary.williams@clinic.com',
        role: 'nurse',
        phone: '+251955678901',
        department: 'Emergency'
      }
    ];

    const createdStaff = await User.insertMany(staff);
    console.log(`Added ${createdStaff.length} staff members`);

    // Add sample appointments
    const appointments = [
      {
        patient: createdPatients[0]._id,
        doctor: createdStaff[0]._id,
        date: new Date(),
        time: '09:00',
        status: 'scheduled',
        type: 'consultation'
      },
      {
        patient: createdPatients[1]._id,
        doctor: createdStaff[0]._id,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        time: '10:30',
        status: 'scheduled',
        type: 'follow-up'
      }
    ];

    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`Added ${createdAppointments.length} appointments`);

    // Add sample invoices
    const invoices = [
      {
        patient: createdPatients[0]._id,
        total: 500,
        amountPaid: 500,
        balance: 0,
        status: 'paid',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        patient: createdPatients[1]._id,
        total: 750,
        amountPaid: 300,
        balance: 450,
        status: 'partial',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];

    const createdInvoices = await MedicalInvoice.insertMany(invoices);
    console.log(`Added ${createdInvoices.length} invoices`);

    // Add sample tasks
    const tasks = [
      {
        title: 'Patient vitals check',
        description: 'Check blood pressure and temperature',
        assignedTo: createdStaff[1]._id,
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000)
      },
      {
        title: 'Medication administration',
        description: 'Administer prescribed medication',
        assignedTo: createdStaff[1]._id,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000)
      }
    ];

    const createdTasks = await NurseTask.insertMany(tasks);
    console.log(`Added ${createdTasks.length} tasks`);

    // Add sample lab orders
    const labOrders = [
      {
        patient: createdPatients[0]._id,
        testType: 'Blood Test',
        status: 'pending',
        orderedBy: createdStaff[0]._id,
        orderDate: new Date()
      },
      {
        patient: createdPatients[1]._id,
        testType: 'Urine Analysis',
        status: 'completed',
        orderedBy: createdStaff[0]._id,
        orderDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];

    const createdLabOrders = await LabOrder.insertMany(labOrders);
    console.log(`Added ${createdLabOrders.length} lab orders`);

    // Add sample notifications
    const notifications = [
      {
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight at 2 AM',
        type: 'system',
        status: 'active',
        read: false
      },
      {
        title: 'New Patient Registration',
        message: 'New patient registered in the system',
        type: 'info',
        status: 'active',
        read: false
      }
    ];

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`Added ${createdNotifications.length} notifications`);

    console.log('Sample data added successfully!');
    console.log('Dashboard should now show real data instead of zeros.');

  } catch (error) {
    console.error('Error adding sample data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
addSampleData();
