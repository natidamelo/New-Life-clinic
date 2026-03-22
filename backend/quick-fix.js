const fs = require('fs');

// Quick fix for the syntax error
const billingFile = './routes/billing.js';
let content = fs.readFileSync(billingFile, 'utf8');

// Remove the duplicate catch block
content = content.replace(
  `      } catch (invoiceError) {
        console.warn('⚠️ Could not create/update MedicalInvoice:', invoiceError.message);
        // Don't fail the payment if invoice creation fails
      }`,
  ''
);

fs.writeFileSync(billingFile, content, 'utf8');
console.log('✅ Syntax error fixed!'); 
 