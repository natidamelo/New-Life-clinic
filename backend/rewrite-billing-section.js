const fs = require('fs');
const path = require('path');

const billingFile = path.join(__dirname, 'routes', 'billing.js');

function rewriteBillingSection() {
  try {
    console.log('🔧 Rewriting problematic billing section...');
    
    // Read the file
    let content = fs.readFileSync(billingFile, 'utf8');
    
    // Find the problematic section and replace it
    const problematicSection = `        }
        
        // Link the medicalInvoice back to the lab orders
        try {
          for (const labOrder of updatedLabOrders) {
            labOrder.serviceRequestId = medicalInvoice._id;
            await labOrder.save();
          }
        } catch (invoiceError) {
          console.warn('⚠️ Could not create/update MedicalInvoice:', invoiceError.message);
          // Don't fail the payment if invoice creation fails
        }`;
    
    const fixedSection = `        }
        
        // Link the medicalInvoice back to the lab orders
        try {
          for (const labOrder of updatedLabOrders) {
            labOrder.serviceRequestId = medicalInvoice._id;
            await labOrder.save();
          }
        } catch (invoiceError) {
          console.warn('⚠️ Could not create/update MedicalInvoice:', invoiceError.message);
          // Don't fail the payment if invoice creation fails
        }`;
    
    if (content.includes(problematicSection)) {
      content = content.replace(problematicSection, fixedSection);
      fs.writeFileSync(billingFile, content, 'utf8');
      console.log('✅ Billing section fixed!');
    } else {
      console.log('❌ Could not find the exact section to replace');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

rewriteBillingSection(); 
 