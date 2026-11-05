const { runWithTenantContext, bindTenantRequest } = require('../config/tenantContext');

/**
 * Initialise AsyncLocalStorage with a tenant id.
 *
 * The value set here is a *starting default* only.  For authenticated
 * requests the `auth` middleware calls `setTenantInCurrentContext()` and
 * overwrites this with the user's own clinicId (regular users) or the
 * requested scope (super_admin).  Regular users can never override their
 * tenant — even if the x-clinic-id header is manipulated, auth.js
 * ignores it for non-super-admin roles.
 */
function tenantContextMiddleware(req, res, next) {
  const rawClinic = req.headers['x-clinic-id'] || req.query?.clinicId;
  const initialTenant = (typeof rawClinic === 'string' && rawClinic.trim())
    ? rawClinic.trim()
    : (process.env.PRIMARY_CLINIC_ID || 'default');

  req.tenantId = initialTenant;
  runWithTenantContext(initialTenant, () => {
    bindTenantRequest(req);
    next();
  });
}

module.exports = {
  tenantContextMiddleware
};
