const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema (simplified)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, required: true, default: 'admin' },
  isActive: { type: Boolean, default: true },
  permissions: {
    manageUsers: { type: Boolean, default: true },
    managePatients: { type: Boolean, default: true },
    manageAppointments: { type: Boolean, default: true },
    manageBilling: { type: Boolean, default: true },
    manageInventory: { type: Boolean, default: true },
    generateReports: { type: Boolean, default: true },
    viewReports: { type: Boolean, default: true }
  }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Username: ${existingAdmin.username}`);
      console.log(`- Role: ${existingAdmin.role}`);
      console.log(`- Active: ${existingAdmin.isActive}`);
    } else {
      console.log('👤 Creating admin user...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create admin user
      const adminUser = new User({
        email: 'admin@clinic.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        permissions: {
          manageUsers: true,
          managePatients: true,
          manageAppointments: true,
          manageBilling: true,
          manageInventory: true,
          generateReports: true,
          viewReports: true
        }
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('\n🔑 Login credentials:');
    console.log('Email: admin@clinic.com');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    // Test login
    console.log('\n🧪 Testing login...');
    const testUser = await User.findOne({ email: 'admin@clinic.com' });
    
    if (testUser) {
      const isValidPassword = await bcrypt.compare('admin123', testUser.password);
      if (isValidPassword) {
        console.log('✅ Login test successful!');
        console.log('✅ Admin user is ready to use');
      } else {
        console.log('❌ Password verification failed');
      }
    } else {
      console.log('❌ Admin user not found');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    console.log('\n🎉 Admin setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
