const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function fixDrNatan() {
  try {
    // Connect to the correct database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    // Check if DR Natan exists
    let user = await User.findOne({ 
      $or: [
        { username: 'DR Natan' },
        { email: 'doctor@clinic.com' }
      ]
    });
    
    if (user) {
      console.log('✅ DR Natan already exists:', {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      });
      
      // Test password
      const isPasswordValid = await bcrypt.compare('doctor123', user.password);
      console.log('✅ Password validation:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('🔄 Updating password...');
        user.password = await bcrypt.hash('doctor123', 12);
        await user.save();
        console.log('✅ Password updated');
      }
    } else {
      console.log('🔄 Creating DR Natan user...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash('doctor123', 12);
      
      // Create user
      user = new User({
        username: 'DR Natan',
        email: 'doctor@clinic.com',
        password: hashedPassword,
        role: 'doctor',
        firstName: 'DR',
        lastName: 'Natan',
        isActive: true,
        specialization: 'General Medicine'
      });
      
      await user.save();
      console.log('✅ DR Natan user created successfully');
    }
    
    // Test the authService login
    const authService = require('./services/authService');
    try {
      const result = await authService.loginUser('DR Natan', 'doctor123');
      console.log('✅ AuthService login test successful:', {
        userId: result.user._id,
        role: result.user.role,
        hasToken: !!result.token
      });
    } catch (authError) {
      console.error('❌ AuthService login test failed:', authError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

fixDrNatan();
