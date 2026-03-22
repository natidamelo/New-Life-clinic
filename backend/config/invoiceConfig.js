// MED- Invoice Generation Disabled
// This file prevents the system from generating MED- invoices
// All invoices now use PRES- prefix for prescription-based billing

module.exports = {
  INVOICE_PREFIX: 'PRES-',
  INVOICE_TYPE: 'prescription',
  MED_INVOICES_DISABLED: true,
  PRESCRIPTION_INVOICES_ONLY: true
};
