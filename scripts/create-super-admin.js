const mongoose = require('mongoose');
const readline = require('readline');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { connectDB } = require('../backend/config/db');
const User = require('../backend/models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
  console.log('==================================================');
  console.log('      👑 Create Super Admin Account CLI            ');
  console.log('==================================================\n');

  try {
    // Connect to database
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB successfully.\n');

    console.log('--- Enter Super Admin Details ---');
    
    let username = await askQuestion('Username [default: superadmin]: ');
    username = username.trim() ? username.trim() : 'superadmin';

    let email = await askQuestion('Email [default: superadmin@clinic.com]: ');
    email = email.trim() ? email.trim().toLowerCase() : 'superadmin@clinic.com';

    const password = await askQuestion('Password: ');
    if (!password.trim()) {
      throw new Error('Password is required.');
    }

    let firstName = await askQuestion('First Name [default: Super]: ');
    firstName = firstName.trim() ? firstName.trim() : 'Super';

    let lastName = await askQuestion('Last Name [default: Admin]: ');
    lastName = lastName.trim() ? lastName.trim() : 'Admin';

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email }
      ]
    }).setOptions({ skipTenantScope: true });

    if (existingUser) {
      throw new Error(`A user with the username "${username}" or email "${email}" already exists.`);
    }

    console.log('\n🔄 Creating Super Admin account...');

    // Save Super Admin User (Mongoose pre-save hook hashes the password automatically)
    const newSuperAdmin = new User({
      clinicId: 'default', // Super admins belong to 'default' but have global access
      username,
      email,
      password: password.trim(),
      role: 'super_admin',
      firstName,
      lastName,
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

    await newSuperAdmin.save();

    console.log('\n==================================================');
    console.log('🎉 Super Admin Created Successfully!');
    console.log(`Username: ${newSuperAdmin.username}`);
    console.log(`Email: ${newSuperAdmin.email}`);
    console.log(`Role: ${newSuperAdmin.role}`);
    console.log('Use these credentials to log in to the Super Admin panel.');
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
