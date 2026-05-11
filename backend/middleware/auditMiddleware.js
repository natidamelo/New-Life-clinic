const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry. Call directly from route handlers for fine-grained control.
 */
async function logAudit({ userId, userName, userRole, action, resourceType, resourceId, resourceName, description, req, metadata }) {
  try {
    await AuditLog.create({
      userId,
      userName: userName || 'Unknown',
      userRole: userRole || 'unknown',
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      resourceName,
      description,
      ipAddress: req ? (req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress) : undefined,
      userAgent: req ? req.headers['user-agent'] : undefined,
      metadata
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('[AuditLog] Failed to write audit entry:', err.message);
  }
}

/**
 * Express middleware that auto-logs access to sensitive routes.
 * Attach to routes like: router.get('/patients/:id', auditAccess('Patient', 'VIEW'), handler)
 */
function auditAccess(resourceType, action = 'VIEW') {
  return (req, res, next) => {
    // Log after the response is sent so we don't block
    const originalEnd = res.end;
    res.end = function (...args) {
      originalEnd.apply(res, args);

      // Only log successful requests
      if (res.statusCode >= 200 && res.statusCode < 400 && req.user) {
        const resourceId = req.params.id || req.params.patientId || req.params.certificateId || undefined;
        logAudit({
          userId: req.user._id || req.user.id,
          userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
          userRole: req.user.role || 'unknown',
          action,
          resourceType,
          resourceId,
          description: `${action} ${resourceType}${resourceId ? ` (${resourceId})` : ''} via ${req.method} ${req.originalUrl}`,
          req
        });
      }
    };
    next();
  };
}

module.exports = { logAudit, auditAccess };
