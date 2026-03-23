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
    if (!this.clinicId) {
      const tenantId = getCurrentTenantId();
      this.clinicId = tenantId === '*' ? 'default' : tenantId;
    }
    next();
  });
}

mongoose.plugin(tenantScopePlugin);

