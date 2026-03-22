// Dummy authentication middleware for development
function auth() {
  return (req, res, next) => {
    // In production, check JWT or session here
    const mongoose = require('mongoose');
    req.user = { 
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // MongoDB ObjectId format
      id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), 
      role: 'admin', 
      email: 'admin@clinic.com',
      firstName: 'Admin',
      lastName: 'User'
    }; // mock user
    next();
  };
}

// Dummy role check middleware
function checkRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: no user found' });
    }
    
    // Handle both single role and array of roles
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    if (requiredRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  };
}

module.exports = { auth, checkRole }; 
