const mongoose = require('mongoose');
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to clinic-cms database');
    
    const User = require('./backend/models/User');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- Role: ${existingAdmin.role}`);
      console.log('\nYou can use these credentials to login:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        email: 'admin@clinic.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
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
      console.log('\nLogin credentials:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdminUser(); 
 
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to clinic-cms database');
    
    const User = require('./backend/models/User');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- Role: ${existingAdmin.role}`);
      console.log('\nYou can use these credentials to login:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        email: 'admin@clinic.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
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
      console.log('\nLogin credentials:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdminUser(); 
 
 
 
 
 
 
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to clinic-cms database');
    
    const User = require('./backend/models/User');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- Role: ${existingAdmin.role}`);
      console.log('\nYou can use these credentials to login:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        email: 'admin@clinic.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
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
      console.log('\nLogin credentials:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdminUser(); 
 
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to clinic-cms database');
    
    const User = require('./backend/models/User');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- Role: ${existingAdmin.role}`);
      console.log('\nYou can use these credentials to login:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        email: 'admin@clinic.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
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
      console.log('\nLogin credentials:');
      console.log('Email: admin@clinic.com');
      console.log('Password: admin123');
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdminUser(); 
 
 
 
 
 
 