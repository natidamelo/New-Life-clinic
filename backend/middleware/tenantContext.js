const { runWithTenantContext } = require('../config/tenantContext');

function tenantContextMiddleware(req, res, next) {
  const headerTenantId = req.headers['x-clinic-id'];
  runWithTenantContext(headerTenantId || 'default', () => next());
}

module.exports = {
  tenantContextMiddleware
};
