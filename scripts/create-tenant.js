const mongoose = require('mongoose');
const readline = require('readline');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { connectDB } = require('../backend/config/db');
const Clinic = require('../backend/models/Clinic');
const User = require('../backend/models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

function toSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  console.log('==================================================');
  console.log('      🏥 SaaS Multi-Tenant Clinic Creator CLI      ');
  console.log('==================================================\n');

  try {
    // Connect to database
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB successfully.\n');

    console.log('--- Step 1: Register New Clinic ---');
    const name = await askQuestion('Clinic Name: ');
    if (!name.trim()) {
      throw new Error('Clinic Name cannot be empty.');
    }

    const defaultSlug = toSlug(name);
    let slug = await askQuestion(`Clinic Slug / Database ID [default: ${defaultSlug}]: `);
    slug = slug.trim() ? toSlug(slug) : defaultSlug;

    if (!slug) {
      throw new Error('Clinic Slug cannot be empty.');
    }

    // Check if slug exists
    const existingClinic = await Clinic.findOne({ slug });
    if (existingClinic) {
      throw new Error(`A clinic with the slug "${slug}" already exists.`);
    }

    const contactEmail = await askQuestion('Contact Email: ');
    const contactPhone = await askQuestion('Contact Phone: ');
    const address = await askQuestion('Clinic Address: ');

    console.log('\n--- Step 2: Create Clinic Administrator ---');
    const adminFirstName = await askQuestion('First Name: ');
    const adminLastName = await askQuestion('Last Name: ');
    const adminUsername = await askQuestion('Username: ');
    const adminEmail = await askQuestion('Admin Email: ');
    const adminPassword = await askQuestion('Admin Password: ');

    if (!adminFirstName.trim() || !adminLastName.trim() || !adminUsername.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      throw new Error('All admin fields are required.');
    }

    // Check if username or email already exists globally
    const existingUser = await User.findOne({
      $or: [
        { username: adminUsername.trim() },
        { email: adminEmail.trim().toLowerCase() }
      ]
    }).setOptions({ skipTenantScope: true });

    if (existingUser) {
      throw new Error('A user with this username or email already exists.');
    }

    console.log('\n🔄 Creating clinic and admin account...');

    // 1. Save Clinic
    const newClinic = new Clinic({
      name: name.trim(),
      slug,
      contactEmail: contactEmail.trim().toLowerCase() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      address: address.trim() || undefined,
      isActive: true
    });
    await newClinic.save();
    console.log(`✅ Clinic "${newClinic.name}" (Slug: ${newClinic.slug}) created successfully.`);

    // 2. Save Admin User (Mongoose pre-save hook will automatically hash the password)
    const newAdmin = new User({
      clinicId: slug,
      username: adminUsername.trim(),
      email: adminEmail.trim().toLowerCase(),
      password: adminPassword.trim(), // Plain text: mongoose hook hashes it automatically
      role: 'admin',
      firstName: adminFirstName.trim(),
      lastName: adminLastName.trim(),
      isActive: true,
      permissions: {
        manageUsers: true,
        managePatients: true,
        manageAppointments: true,
        manageBilling: true,
        manageInventory: true,
        generateReports: true,
        viewReports: true,
        deleteMessages: true
      }
    });

    await newAdmin.save();
    console.log(`✅ Admin user "${newAdmin.username}" created successfully.`);

    console.log('\n==================================================');
    console.log('🎉 Setup Complete!');
    console.log(`Clinic ID: ${newClinic.slug}`);
    console.log(`Admin Username: ${newAdmin.username}`);
    console.log(`Admin Password: [Provided above]`);
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ Error: ', error.message);
  } finally {
    rl.close();
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('\nDisconnected from database.');
    }
    process.exit(0);
  }
}

run();
