const mongoose = require('mongoose');
const Service = require('./backend/models/Service');

// MongoDB connection string
const MONGO_URI = 'mongodb://localhost:27017/clinic-cms';

// Comprehensive list of medical services
const defaultServices = [
  // Injection Services
  {
    name: 'IV Injection - 75 ETB',
    category: 'injection',
    price: 75,
    description: 'Intravenous (IV) medication administration',
    isActive: true
  },
  {
    name: 'IM Injection - 60 ETB',
    category: 'injection',
    price: 60,
    description: 'Intramuscular (IM) medication administration',
    isActive: true
  },
  {
    name: 'Subcutaneous Injection - 50 ETB',
    category: 'injection',
    price: 50,
    description: 'Subcutaneous (SC) medication administration',
    isActive: true
  },
  
  // Blood Tests
  {
    name: 'Fasting Glucose Test - 100 ETB',
    category: 'blood_test',
    price: 100,
    description: 'Blood sugar test after fasting',
    isActive: true
  },
  {
    name: 'HbA1c Test - 150 ETB',
    category: 'blood_test',
    price: 150,
    description: 'Glycated hemoglobin test for diabetes management',
    isActive: true
  },
  {
    name: 'Complete Blood Count (CBC) - 200 ETB',
    category: 'blood_test',
    price: 200,
    description: 'Comprehensive blood cell analysis',
    isActive: true
  },
  {
    name: 'Lipid Profile - 250 ETB',
    category: 'blood_test',
    price: 250,
    description: 'Cholesterol and triglyceride level test',
    isActive: true
  },
  
  // Consultation Services
  {
    name: 'General Consultation - 150 ETB',
    category: 'consultation',
    price: 150,
    description: 'Standard medical consultation',
    isActive: true
  },
  {
    name: 'Follow-up Consultation - 100 ETB',
    category: 'consultation',
    price: 100,
    description: 'Follow-up medical consultation',
    isActive: true
  },
  {
    name: 'Specialist Consultation - 250 ETB',
    category: 'consultation',
    price: 250,
    description: 'Consultation with a medical specialist',
    isActive: true
  },
  
  // Imaging Services
  {
    name: 'Blood Pressure Check - 50 ETB',
    category: 'imaging',
    price: 50,
    description: 'Basic blood pressure measurement',
    isActive: true
  },
  {
    name: 'ECG - 200 ETB',
    category: 'imaging',
    price: 200,
    description: 'Electrocardiogram heart test',
    isActive: true
  },
  {
    name: 'Ultrasound - Basic - 200 ETB',
    category: 'ultrasound',
    price: 200,
    description: 'Standard ultrasound imaging',
    isActive: true
  },
  {
    name: 'Ultrasound - Detailed - 350 ETB',
    category: 'ultrasound',
    price: 350,
    description: 'Comprehensive ultrasound imaging',
    isActive: true
  }
];

// Connect to MongoDB and seed services
async function seedServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Remove existing services
    await Service.deleteMany({});
    console.log('Existing services cleared');

    // Insert new services
    const insertedServices = await Service.insertMany(defaultServices);
    console.log('Services seeded successfully:');
    insertedServices.forEach(service => {
      console.log(`- ${service.name} (${service.category})`);
    });

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error seeding services:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedServices(); 
seedServices(); 