// Permission middleware for role-based access control
const checkPermission = (permission) => {
  return (req, res, next) => {
    // Basic permission check - in a real app, this would check user permissions
    if (req.user && req.user.role) {
      // Allow admin access to everything
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Add specific permission checks here based on your requirements
      // For now, allow all authenticated users
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.'
    });
  };
};

const requirePermission = (permission) => {
  return checkPermission(permission);
};

module.exports = {
  checkPermission,
  requirePermission
}; 