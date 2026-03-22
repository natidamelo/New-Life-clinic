require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/clinic-cms";

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: 'doctor@clinic.com' });
      
      if (existingUser) {
        console.log('User already exists with email: doctor@clinic.com');
        console.log('Updating password...');
        
        // Update the user's password (will be hashed by pre-save hook)
        existingUser.password = 'doctor123';
        await existingUser.save();
        
        console.log('Password updated successfully');
      } else {
        // Create new user
        const newUser = new User({
          username: 'doctor',
          email: 'doctor@clinic.com',
          password: 'doctor123', // Will be hashed by pre-save hook
          role: 'doctor',
          firstName: 'Doctor',
          lastName: 'User',
          specialization: 'General Medicine',
          isActive: true
        });
        
        await newUser.save();
        console.log('Doctor user created successfully');
      }
    } catch (error) {
      console.error('Error:', error);
    }
    
    // Close the connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  }); 
