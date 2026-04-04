const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

function runWithTenantContext(initialTenantId, callback) {
  const tenantId = initialTenantId || 'default';
  // `req` is set in tenantContextMiddleware so hooks can read req.tenantId after async auth
  // (setTenantInCurrentContext sometimes never runs if ALS store is missing).
  tenantStorage.run({ tenantId, req: null }, callback);
}

function setTenantInCurrentContext(tenantId) {
  const store = tenantStorage.getStore();
  if (store) {
    store.tenantId = tenantId || 'default';
  }
}

function getCurrentTenantId() {
  const store = tenantStorage.getStore();
  if (!store) return 'default';
  const fromReq =
    store.req &&
    store.req.tenantId != null &&
    String(store.req.tenantId).trim() !== ''
      ? String(store.req.tenantId).trim()
      : null;
  if (fromReq != null) return fromReq;
  return store.tenantId || 'default';
}

/** Called once per request so getCurrentTenantId() sees auth’s req.tenantId after async middleware. */
function bindTenantRequest(req) {
  const store = tenantStorage.getStore();
  if (store) store.req = req;
}

module.exports = {
  runWithTenantContext,
  setTenantInCurrentContext,
  getCurrentTenantId,
  bindTenantRequest
};
