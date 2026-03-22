const Patient = require('../models/Patient');
const mongoose = require('mongoose');

/**
 * Find patient by either standardized patient ID or MongoDB ObjectId
 * @param {string} patientId - Can be either standardized ID (PXXXXX-XXXX) or MongoDB ObjectId
 * @returns {Promise<Object|null>} Patient document or null
 */
async function findPatientById(patientId) {
  if (!patientId) return null;
  
  try {
    // First, try to find by standardized patient ID
    if (patientId.startsWith('P')) {
      const patient = await Patient.findOne({ patientId: patientId });
      if (patient) return patient;
    }
    
    // If not found or not a standardized ID, try MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      const patient = await Patient.findById(patientId);
      if (patient) return patient;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding patient by ID:', error);
    return null;
  }
}

/**
 * Get patient ID for display (prioritizes standardized ID)
 * @param {Object} patient - Patient document
 * @returns {string} Display-friendly patient ID
 */
function getDisplayPatientId(patient) {
  if (!patient) return 'N/A';
  
  // Prioritize standardized patient ID
  if (patient.patientId && patient.patientId.startsWith('P')) {
    return patient.patientId;
  }
  
  // Fallback to MongoDB ObjectId
  if (patient._id) {
    return patient._id.toString();
  }
  
  return 'N/A';
}

/**
 * Validate if a patient ID is in the correct format
 * @param {string} patientId - Patient ID to validate
 * @returns {boolean} True if valid format
 */
function isValidPatientId(patientId) {
  if (!patientId) return false;
  
  // Check for standardized format (PXXXXX-XXXX)
  const standardizedPattern = /^P\d{5}-\d{4}$/;
  if (standardizedPattern.test(patientId)) {
    return true;
  }
  
  // Check for MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(patientId)) {
    return true;
  }
  
  return false;
}

/**
 * Find multiple patients by an array of IDs in a single DB query
 * Handles both standardized IDs (P12345-6789) and MongoDB ObjectIds
 * @param {string[]} patientIds - Array of patient IDs
 * @returns {Promise<Map<string, Object>>} Map of patientId string -> patient doc
 */
async function findPatientsByIds(patientIds) {
  if (!patientIds || patientIds.length === 0) return new Map();

  const uniqueIds = [...new Set(patientIds.filter(Boolean))];

  const objectIds = uniqueIds.filter(id => mongoose.Types.ObjectId.isValid(id) && !String(id).startsWith('P'));
  const standardIds = uniqueIds.filter(id => String(id).startsWith('P'));

  const queries = [];
  if (objectIds.length > 0) queries.push({ _id: { $in: objectIds } });
  if (standardIds.length > 0) queries.push({ patientId: { $in: standardIds } });

  if (queries.length === 0) return new Map();

  try {
    const patients = await Patient.find({ $or: queries })
      .select('_id patientId firstName lastName gender dateOfBirth dob age contactNumber phone')
      .lean();

    const map = new Map();
    patients.forEach(p => {
      map.set(p._id.toString(), p);
      if (p.patientId) map.set(p.patientId, p);
    });
    return map;
  } catch (error) {
    console.error('Error batch-finding patients:', error);
    return new Map();
  }
}

// Alias kept for backward compatibility
const safeFindPatient = findPatientById;

module.exports = {
  findPatientById,
  safeFindPatient,
  findPatientsByIds,
  getDisplayPatientId,
  isValidPatientId
}; 