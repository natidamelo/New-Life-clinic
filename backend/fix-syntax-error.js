const fs = require('fs');
const path = require('path');

const billingFile = path.join(__dirname, 'routes', 'billing.js');

function fixSyntaxError() {
  try {
    console.log('🔧 Fixing billing.js syntax error...');
    
    // Read the file
    let content = fs.readFileSync(billingFile, 'utf8');
    
    // The error is around line 580 - there's a catch without a try
    // Let's find and fix the specific problematic area
    
    // Look for the pattern that's causing the issue
    const problematicPattern = `        // Link the medicalInvoice back to the lab orders
        for (const labOrder of updatedLabOrders) {
          labOrder.serviceRequestId = medicalInvoice._id;
          await labOrder.save();
        }
      } catch (invoiceError) {`;
    
    const fixedPattern = `        // Link the medicalInvoice back to the lab orders
        try {
          for (const labOrder of updatedLabOrders) {
            labOrder.serviceRequestId = medicalInvoice._id;
            await labOrder.save();
          }
        } catch (invoiceError) {`;
    
    if (content.includes(problematicPattern)) {
      content = content.replace(problematicPattern, fixedPattern);
      fs.writeFileSync(billingFile, content, 'utf8');
      console.log('✅ Syntax error fixed!');
    } else {
      console.log('❌ Could not find the exact pattern');
      console.log('Trying alternative approach...');
      
      // Alternative: find the specific lines and fix them
      const lines = content.split('\n');
      let fixed = false;
      
      for (let i = 0; i < lines.length - 3; i++) {
        if (lines[i] && lines[i].includes('Link the medicalInvoice back to the lab orders') &&
            lines[i + 1] && lines[i + 1].includes('for (const labOrder of updatedLabOrders)') &&
            lines[i + 4] && lines[i + 4].includes('} catch (invoiceError) {')) {
          
          // Insert the missing try block
          lines.splice(i + 1, 0, '        try {');
          lines.splice(i + 5, 0, '        }');
          
          content = lines.join('\n');
          fs.writeFileSync(billingFile, content, 'utf8');
          console.log('✅ Syntax error fixed using alternative approach!');
          fixed = true;
          break;
        }
      }
      
      if (!fixed) {
        console.log('❌ Could not locate the problematic code');
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing syntax:', error);
  }
}

fixSyntaxError(); 
 