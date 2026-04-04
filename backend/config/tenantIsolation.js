const mongoose = require('mongoose');
const { getCurrentTenantId } = require('./tenantContext');

function primaryClinicId() {
  const p = (process.env.PRIMARY_CLINIC_ID || 'default').trim();
  return p || 'default';
}

/**
 * Rows for this tenant + PRIMARY_CLINIC_ID (e.g. clinicnew) + "default" + unstamped.
 * Set PRIMARY_CLINIC_ID on Render to match your users’ clinicId when it is not "default".
 */
function clinicIdOrLegacyMatch(tenantId) {
  const primary = primaryClinicId();
  const slugSet = new Set(
    [tenantId, primary, 'default'].filter((s) => s != null && String(s).trim() !== '')
  );
  const or = [...slugSet].map((id) => ({ clinicId: id }));
  or.push(
    { clinicId: { $exists: false } },
    { clinicId: null },
    { clinicId: '' }
  );
  return { $or: or };
}

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

    // Always merge tenant slug + PRIMARY_CLINIC_ID + "default" + unstamped rows.
    // Invoices/patients in Atlas often have no clinicId field; an exact { clinicId: user } filter hides them.
    this.and([clinicIdOrLegacyMatch(tenantId)]);
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

    if (!hasClinicMatch && tenantId !== '*') {
      pipeline.unshift({ $match: clinicIdOrLegacyMatch(tenantId) });
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

