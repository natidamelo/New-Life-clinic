/**
 * QR Code Type Utilities
 * Provides consistent type mapping between URL parameters and database storage
 */

/**
 * Map URL type to database type
 * @param {string} urlType - Type from URL parameter (e.g., 'checkin', 'checkout', 'staff-registration')
 * @returns {string} - Database type (e.g., 'qr-checkin', 'qr-checkout', 'staff-registration')
 */
function mapUrlTypeToDbType(urlType) {
  const typeMap = {
    'checkin': 'qr-checkin',
    'checkout': 'qr-checkout',
    'staff-registration': 'staff-registration'
  };
  
  return typeMap[urlType] || urlType;
}

/**
 * Map database type to URL type
 * @param {string} dbType - Type from database (e.g., 'qr-checkin', 'qr-checkout', 'staff-registration')
 * @returns {string} - URL type (e.g., 'checkin', 'checkout', 'staff-registration')
 */
function mapDbTypeToUrlType(dbType) {
  const typeMap = {
    'qr-checkin': 'checkin',
    'qr-checkout': 'checkout',
    'staff-registration': 'staff-registration'
  };
  
  return typeMap[dbType] || dbType;
}

/**
 * Validate QR code type
 * @param {string} type - Type to validate
 * @returns {boolean} - Whether the type is valid
 */
function isValidQrType(type) {
  const validTypes = ['checkin', 'checkout', 'staff-registration', 'qr-checkin', 'qr-checkout'];
  return validTypes.includes(type);
}

/**
 * Get all possible types for a given base type
 * @param {string} baseType - Base type (e.g., 'checkin')
 * @returns {string[]} - Array of possible types
 */
function getAllPossibleTypes(baseType) {
  const typeVariations = {
    'checkin': ['checkin', 'qr-checkin'],
    'checkout': ['checkout', 'qr-checkout'],
    'staff-registration': ['staff-registration']
  };
  
  return typeVariations[baseType] || [baseType];
}

module.exports = {
  mapUrlTypeToDbType,
  mapDbTypeToUrlType,
  isValidQrType,
  getAllPossibleTypes
};
