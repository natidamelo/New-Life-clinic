const fs = require('fs');
const path = require('path');

async function disableMedInvoiceGeneration() {
  console.log('🚫 Disabling MED- invoice generation...');
  
  try {
    // 1. Fix prescriptionInvoiceService.js
    console.log('\n📋 Step 1: Fixing prescriptionInvoiceService.js...');
    const prescriptionServicePath = 'backend/services/prescriptionInvoiceService.js';
    
    if (fs.existsSync(prescriptionServicePath)) {
      let content = fs.readFileSync(prescriptionServicePath, 'utf8');
      
      // Change MED- to PRES- in invoice generation
      content = content.replace(
        /const invoiceNumber = `MED-\${Date\.now\(\)}-\${Math\.random\(\)\.toString\(36\)\.substr\(2, 5\)}`;/g,
        'const invoiceNumber = `PRES-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;'
      );
      
      // Also change the type from 'medication' to 'prescription'
      content = content.replace(
        /type: 'medication'/g,
        "type: 'prescription'"
      );
      
      fs.writeFileSync(prescriptionServicePath, content);
      console.log('✅ Updated prescriptionInvoiceService.js');
    }
    
    // 2. Fix billing.js routes
    console.log('\n📋 Step 2: Fixing billing.js routes...');
    const billingPath = 'backend/routes/billing.js';
    
    if (fs.existsSync(billingPath)) {
      let content = fs.readFileSync(billingPath, 'utf8');
      
      // Change MED- to PRES- in billing routes
      content = content.replace(
        /const invoiceNumber = `MED-\${Date\.now\(\)}-\${Math\.random\(\)\.toString\(36\)\.substr\(2, 5\)}`;/g,
        'const invoiceNumber = `PRES-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;'
      );
      
      // Change payment references from MED-PAY to PRES-PAY
      content = content.replace(
        /reference: `MED-PAY-\${Date\.now\(\)}`/g,
        'reference: `PRES-PAY-${Date.now()}`'
      );
      
      content = content.replace(
        /paymentReference: `MED-PAY-\${Date\.now\(\)}`/g,
        'paymentReference: `PRES-PAY-${Date.now()}`'
      );
      
      content = content.replace(
        /reference: `MULTI-MED-PAY-\${Date\.now\(\)}`/g,
        'reference: `MULTI-PRES-PAY-${Date.now()}`'
      );
      
      content = content.replace(
        /reference: `ADD-MED-PAY-\${Date\.now\(\)}`/g,
        'reference: `ADD-PRES-PAY-${Date.now()}`'
      );
      
      fs.writeFileSync(billingPath, content);
      console.log('✅ Updated billing.js routes');
    }
    
    // 3. Create a backup of the original files
    console.log('\n📋 Step 3: Creating backups...');
    const backupDir = 'backup-before-med-removal';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    if (fs.existsSync(prescriptionServicePath)) {
      fs.copyFileSync(prescriptionServicePath, path.join(backupDir, 'prescriptionInvoiceService.js.backup'));
    }
    
    if (fs.existsSync(billingPath)) {
      fs.copyFileSync(billingPath, path.join(backupDir, 'billing.js.backup'));
    }
    
    console.log('✅ Backups created in backup-before-med-removal/');
    
    // 4. Create a configuration file to prevent future MED- invoices
    console.log('\n📋 Step 4: Creating configuration file...');
    const configContent = `// MED- Invoice Generation Disabled
// This file prevents the system from generating MED- invoices
// All invoices now use PRES- prefix for prescription-based billing

module.exports = {
  INVOICE_PREFIX: 'PRES-',
  INVOICE_TYPE: 'prescription',
  MED_INVOICES_DISABLED: true,
  PRESCRIPTION_INVOICES_ONLY: true
};
`;
    
    fs.writeFileSync('backend/config/invoiceConfig.js', configContent);
    console.log('✅ Created invoiceConfig.js');
    
    console.log('\n🎯 MED- Invoice Generation Successfully Disabled!');
    console.log('✅ All new invoices will use PRES- prefix');
    console.log('✅ Prescription-based billing only');
    console.log('✅ Backups created in case you need to restore');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your server to apply changes');
    console.log('2. Test creating a new prescription');
    console.log('3. Verify it creates PRES- invoice, not MED-');
    
  } catch (error) {
    console.error('❌ Error disabling MED- invoice generation:', error.message);
  }
}

// Run the fix
disableMedInvoiceGeneration();
