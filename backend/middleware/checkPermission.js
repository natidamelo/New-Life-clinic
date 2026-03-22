/**
 * Middleware to check if user has required permissions/roles
 * Can be used with multiple roles as arguments
 */
const checkPermission = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Handle case where user roles is not an array
    if (!Array.isArray(req.user.roles)) {
      // If we have a single role property, convert it to an array
      if (req.user.role) {
        req.user.roles = [req.user.role];
      } else {
        return res.status(403).json({ 
          success: false, 
          message: 'User roles not set or invalid' 
        });
      }
    }
    
    // Check if user has any of the required roles
    const hasPermission = requiredRoles.some(role => 
      req.user.roles.includes(role) || req.user.role === role
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: `Permission denied. Requires one of these roles: ${requiredRoles.join(', ')}` 
      });
    }
    
    next();
  };
};

module.exports = checkPermission; 
