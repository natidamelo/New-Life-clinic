/**
 * CCTV Middleware
 * Role guard: only admin / super_admin may access CCTV endpoints.
 */

/**
 * Restrict CCTV access to admin roles only.
 */
const adminOnly = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const allowed = ['admin', 'super_admin'];
  if (!allowed.includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied — CCTV module is restricted to administrators'
    });
  }
  next();
};

module.exports = { adminOnly };
