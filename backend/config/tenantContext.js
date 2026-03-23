const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

function runWithTenantContext(initialTenantId, callback) {
  const tenantId = initialTenantId || 'default';
  tenantStorage.run({ tenantId }, callback);
}

function setTenantInCurrentContext(tenantId) {
  const store = tenantStorage.getStore();
  if (store) {
    store.tenantId = tenantId || 'default';
  }
}

function getCurrentTenantId() {
  const store = tenantStorage.getStore();
  return store?.tenantId || 'default';
}

module.exports = {
  runWithTenantContext,
  setTenantInCurrentContext,
  getCurrentTenantId
};
