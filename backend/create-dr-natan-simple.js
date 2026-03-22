const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Simple user schema
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String,
      firstName: String,
      lastName: String,
      isActive: { type: Boolean, default: true }
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Check if DR Natan exists
    let user = await User.findOne({ username: 'DR Natan' });
    
    if (user) {
      console.log('✅ DR Natan already exists');
    } else {
      console.log('Creating DR Natan user...');
      
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
        isActive: true
      });
      
      await user.save();
      console.log('✅ DR Natan user created successfully');
    }
    
    // Test login
    const isPasswordValid = await bcrypt.compare('doctor123', user.password);
    console.log('✅ Password validation:', isPasswordValid);
    
    console.log('✅ User details:', {
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    
    mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });
