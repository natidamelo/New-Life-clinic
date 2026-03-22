/**
 * Server start script with enhanced debugging for CORS issues
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

// Load env variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Simple login route with permissions
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid password' 
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-key-1234567890';
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Ensure permissions exist
    const permissions = user.permissions || {};
    
    // Special permissions for admin
    if (user.role === 'admin') {
      permissions.manageUsers = true;
      permissions.managePatients = true;
      permissions.manageAppointments = true;
      permissions.manageBilling = true;
      permissions.manageInventory = true;
      permissions.generateReports = true;
      permissions.viewReports = true;
    }
    
    // Ensure billing roles have billing permissions
    if (['admin', 'finance', 'reception', 'billing'].includes(user.role)) {
      permissions.manageBilling = true;
    }

    // Create response with guaranteed permissions
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: permissions
    };
    
    console.log('Login response:', {
      token: token.substring(0, 20) + '...',
      user: userResponse
    });

    res.json({
      status: 'success',
      data: {
        token,
        user: userResponse
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
});

// Start server
const PORT = process.env.PORT || 5002;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer(); 
