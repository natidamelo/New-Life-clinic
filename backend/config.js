// Set the PORT to 5002
const PORT = process.env.PORT || 5002;

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

// Export configuration
module.exports = {
  PORT,
  MONGODB_URI
}; 
