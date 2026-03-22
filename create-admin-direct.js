const mongoose = require('mongoose');
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminDirect() {
    try {
        console.log('🔧 Creating admin user directly in database...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/clinic-cms');
        console.log('✅ Connected to clinic-cms database');
        
        // Import User model
        const User = require('./backend/models/User');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`- Email: ${existingAdmin.email}`);
            console.log(`- Name: ${existingAdmin.name}`);
            console.log(`- Role: ${existingAdmin.role}`);
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        } else {
            console.log('Creating new admin user...');
            
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Create admin user
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
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        }
        
        // Test the login
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
            console.log('❌ Admin user not found after creation');
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
        console.log('\n🎉 Admin user setup complete!');
        console.log('You can now login with admin@clinic.com / admin123');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

createAdminDirect(); 
 
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminDirect() {
    try {
        console.log('🔧 Creating admin user directly in database...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/clinic-cms');
        console.log('✅ Connected to clinic-cms database');
        
        // Import User model
        const User = require('./backend/models/User');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`- Email: ${existingAdmin.email}`);
            console.log(`- Name: ${existingAdmin.name}`);
            console.log(`- Role: ${existingAdmin.role}`);
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        } else {
            console.log('Creating new admin user...');
            
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Create admin user
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
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        }
        
        // Test the login
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
            console.log('❌ Admin user not found after creation');
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
        console.log('\n🎉 Admin user setup complete!');
        console.log('You can now login with admin@clinic.com / admin123');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

createAdminDirect(); 
 
 
 
 
 
 
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminDirect() {
    try {
        console.log('🔧 Creating admin user directly in database...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/clinic-cms');
        console.log('✅ Connected to clinic-cms database');
        
        // Import User model
        const User = require('./backend/models/User');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`- Email: ${existingAdmin.email}`);
            console.log(`- Name: ${existingAdmin.name}`);
            console.log(`- Role: ${existingAdmin.role}`);
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        } else {
            console.log('Creating new admin user...');
            
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Create admin user
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
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        }
        
        // Test the login
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
            console.log('❌ Admin user not found after creation');
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
        console.log('\n🎉 Admin user setup complete!');
        console.log('You can now login with admin@clinic.com / admin123');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

createAdminDirect(); 
 
const bcrypt = require('./backend/node_modules/bcryptjs');

async function createAdminDirect() {
    try {
        console.log('🔧 Creating admin user directly in database...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/clinic-cms');
        console.log('✅ Connected to clinic-cms database');
        
        // Import User model
        const User = require('./backend/models/User');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`- Email: ${existingAdmin.email}`);
            console.log(`- Name: ${existingAdmin.name}`);
            console.log(`- Role: ${existingAdmin.role}`);
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        } else {
            console.log('Creating new admin user...');
            
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Create admin user
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
            console.log('\n🔑 Login credentials:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        }
        
        // Test the login
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
            console.log('❌ Admin user not found after creation');
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
        console.log('\n🎉 Admin user setup complete!');
        console.log('You can now login with admin@clinic.com / admin123');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

createAdminDirect(); 
 
 
 
 
 
 