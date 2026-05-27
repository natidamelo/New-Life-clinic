const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const HealthPackage = require('./models/HealthPackage');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

const predefinedPackages = [
  {
    clinicId: 'default',
    name: 'Diabetic Package',
    description: 'Comprehensive tracking for patients with diabetes. Includes routine fasting/random blood sugar levels, HbA1c tests, lipid panels, and regular doctor reviews.',
    total_visits: 6,
    validity_days: 180, // 6 months
    price: 3000,
    services: [
      'FBS (Fasting Blood Sugar)',
      'RBS (Random Blood Sugar)',
      'HbA1c test',
      'Lipid Profile',
      'Nurse Vitals Check',
      'Doctor Consultation'
    ],
    is_active: true
  },
  {
    clinicId: 'default',
    name: 'Hypertension Package',
    description: 'Designed for patients managing hypertension. Focuses on regular blood pressure monitoring, ECG checks, and clinical evaluations.',
    total_visits: 4,
    validity_days: 90, // 3 months
    price: 1800,
    services: [
      'Blood Pressure Monitor',
      'ECG (Electrocardiogram)',
      'Nurse Vitals Check',
      'Doctor Consultation'
    ],
    is_active: true
  },
  {
    clinicId: 'default',
    name: 'Annual Checkup Package',
    description: 'A full-body checkup package to review overall health indicators, blood counts, organ functions, and key clinical vital metrics.',
    total_visits: 3,
    validity_days: 365, // 1 year
    price: 4500,
    services: [
      'CBC (Complete Blood Count)',
      'Urinalysis',
      'Renal Function Test (RFT)',
      'Liver Function Test (LFT)',
      'Lipid Profile',
      'Nurse Vitals Check',
      'Doctor Consultation'
    ],
    is_active: true
  }
];

async function seedPackages() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully!');

    // Check if packages already exist
    const count = await HealthPackage.countDocuments({ clinicId: 'default' });
    if (count > 0) {
      console.log(`Found ${count} existing packages in database.`);
      
      // Let's ask if we want to overwrite, but in non-interactive seed script we can just insert ones that don't exist yet by name
      for (const pkg of predefinedPackages) {
        const exists = await HealthPackage.findOne({ name: pkg.name, clinicId: 'default' });
        if (!exists) {
          const newPkg = new HealthPackage(pkg);
          await newPkg.save();
          console.log(`✔ Inserted new package: ${pkg.name}`);
        } else {
          console.log(`ℹ Package "${pkg.name}" already exists. Skipping.`);
        }
      }
    } else {
      // Empty, insert all
      console.log('Seeding predefined health packages catalog...');
      await HealthPackage.insertMany(predefinedPackages);
      console.log('✔ Successfully seeded all predefined health packages!');
    }
  } catch (error) {
    console.error('Error seeding packages:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

seedPackages();
