const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI/MONGO_URI env variable is missing in backend/.env.');
  process.exit(1);
}

const defaultServices = [
  // Pharmacy Services
  {
    name: 'Prescription Filling & Dispensing',
    category: 'pharmacy',
    price: 50,
    description: 'Review and dispensing of physician-prescribed medications with dosage counseling.',
    isActive: true
  },
  {
    name: 'Chronic Disease Medication Therapy Management',
    category: 'pharmacy',
    price: 150,
    description: 'Comprehensive medication review, drug interaction check, and alignment counseling for diabetes, hypertension, or asthma.',
    isActive: true
  },
  {
    name: 'Over-The-Counter Medication Consultation',
    category: 'pharmacy',
    price: 30,
    description: 'Pharmacist consultation for minor ailments and over-the-counter medicine recommendation.',
    isActive: true
  },
  {
    name: 'Vaccination / Immunization Service',
    category: 'pharmacy',
    price: 100,
    description: 'On-site administration of routine vaccines (Flu, Tetanus, Hepatitis, etc.) by a licensed pharmacist/nurse.',
    isActive: true
  },
  {
    name: 'Home Medication Delivery Setup',
    category: 'pharmacy',
    price: 80,
    description: 'Setup and enrollment in periodic home delivery of recurring clinical prescription renewals.',
    isActive: true
  },

  // Lab Services
  {
    name: 'Complete Blood Count (CBC)',
    category: 'lab',
    price: 200,
    description: 'Comprehensive blood cells analysis (RBC, WBC, platelets) to screen for anemia, infections, or leukemia.',
    isActive: true
  },
  {
    name: 'Fasting Blood Sugar (FBS)',
    category: 'lab',
    price: 100,
    description: 'Measures blood glucose levels after fasting to screen for diabetes or prediabetes.',
    isActive: true
  },
  {
    name: 'HbA1c (Glycated Hemoglobin)',
    category: 'lab',
    price: 180,
    description: 'Three-month average blood glucose level test for tracking diabetes control.',
    isActive: true
  },
  {
    name: 'Lipid Profile',
    category: 'lab',
    price: 250,
    description: 'Measures cholesterol and triglyceride levels to assess cardiovascular risk.',
    isActive: true
  },
  {
    name: 'Urinalysis',
    category: 'lab',
    price: 120,
    description: 'Chemical and microscopic examination of urine to detect kidney disease or urinary tract infections.',
    isActive: true
  },

  // Imaging Services
  {
    name: 'Basic Ultrasound Scan',
    category: 'imaging',
    price: 300,
    description: 'Ultrasonic sound wave imaging for abdominal, pelvic, or soft tissue evaluations.',
    isActive: true
  },
  {
    name: 'Electrocardiogram (ECG)',
    category: 'imaging',
    price: 200,
    description: 'Records electrical activity of the heart to monitor heart rhythm and cardiovascular health.',
    isActive: true
  },
  {
    name: 'Chest X-Ray',
    category: 'imaging',
    price: 250,
    description: 'Standard radiographic check of the lungs, heart, and chest wall bones.',
    isActive: true
  },

  // Consultation Services
  {
    name: 'General Practitioner Consultation',
    category: 'consultation',
    price: 150,
    description: 'Standard medical consultation and checkup with a general practitioner doctor.',
    isActive: true
  },
  {
    name: 'Specialist Medical Consultation',
    category: 'consultation',
    price: 300,
    description: 'In-depth consultation with a specialized medical consultant (Cardiologist, Pediatrician, Gynecologist).',
    isActive: true
  },
  {
    name: 'Follow-up Review Consultation',
    category: 'consultation',
    price: 100,
    description: 'Review session to track treatment outcomes or adjust medication prescriptions.',
    isActive: true
  },

  // Nursing Services
  {
    name: 'Intravenous (IV) Injection & Fluid Setup',
    category: 'nursing',
    price: 120,
    description: 'Clinical administration of IV medications, fluids, or saline.',
    isActive: true
  },
  {
    name: 'Intramuscular (IM) Injection',
    category: 'nursing',
    price: 80,
    description: 'Administration of intramuscular injections (e.g. pain relief, Depo contraceptives).',
    isActive: true
  },
  {
    name: 'Standard Wound Dressing',
    category: 'nursing',
    price: 100,
    description: 'Clinical cleaning, disinfecting, and dressing of cuts, surgical wounds, or ulcers.',
    isActive: true
  },
  {
    name: 'Vital Signs Baseline Check',
    category: 'nursing',
    price: 50,
    description: 'Measures blood pressure, pulse rate, oxygen levels, body temperature, and BMI calculation.',
    isActive: true
  }
];

async function seed() {
  console.log('Connecting to database: ' + MONGO_URI.substring(0, 30) + '...');
  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully!');

    // Require model (now resolves to the exact same mongoose instance)
    const Service = require('./models/Service');

    console.log('Clearing existing services catalog...');
    await Service.deleteMany({});
    console.log('Existing services catalog cleared.');

    const inserted = await Service.insertMany(defaultServices);
    console.log(`Successfully seeded ${inserted.length} services:`);
    inserted.forEach(s => {
      console.log(`- ${s.name} (${s.category})`);
    });

    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
