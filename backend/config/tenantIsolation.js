const mongoose = require('mongoose');
const { getCurrentTenantId } = require('./tenantContext');

function tenantScopePlugin(schema) {
  if (!schema.path('clinicId')) {
    return;
  }

  const scopedQueryHooks = [
    'countDocuments',
    'find',
    'findOne',
    'findOneAndDelete',
    'findOneAndUpdate',
    'updateMany',
    'updateOne',
    'deleteMany',
    'deleteOne'
  ];

  const applyTenantFilter = function applyTenantFilter() {
    const options = typeof this.getOptions === 'function' ? this.getOptions() : {};
    if (options?.skipTenantScope) {
      return;
    }

    const currentQuery = typeof this.getQuery === 'function' ? this.getQuery() : {};
    if (currentQuery.clinicId) {
      return;
    }

    const tenantId = getCurrentTenantId();
    if (tenantId === '*') {
      return;
    }
    this.where({ clinicId: tenantId });
  };

  scopedQueryHooks.forEach((hook) => {
    schema.pre(hook, applyTenantFilter);
  });

  schema.pre('aggregate', function applyAggregateTenantScope() {
    const options = this.options || {};
    if (options.skipTenantScope) {
      return;
    }

    const tenantId = getCurrentTenantId();
    if (tenantId === '*') {
      return;
    }
    const pipeline = this.pipeline();
    const hasClinicMatch = pipeline.some((stage) => stage.$match && stage.$match.clinicId);

    if (!hasClinicMatch) {
      pipeline.unshift({ $match: { clinicId: tenantId } });
    }
  });

  schema.pre('validate', function setClinicIdOnWrite(next) {
    const tenantId = getCurrentTenantId();
    if (tenantId && tenantId !== '*') {
      // For new documents, always stamp the current tenant's clinicId so the
      // schema default of 'default' doesn't win over the real tenant value.
      if (this.isNew || !this.clinicId || this.clinicId === 'default') {
        this.clinicId = tenantId;
      }
    } else if (!this.clinicId) {
      this.clinicId = 'default';
    }
    next();
  });
}

mongoose.plugin(tenantScopePlugin);

