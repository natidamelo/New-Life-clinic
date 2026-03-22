const fs = require('fs');
const path = require('path');

const billingFile = path.join(__dirname, 'routes', 'billing.js');

async function fixBillingSyntax() {
  try {
    console.log('🔧 Fixing billing.js syntax error...');
    
    // Read the file
    let content = fs.readFileSync(billingFile, 'utf8');
    
    // Find the problematic area around line 580
    const lines = content.split('\n');
    
    console.log('📄 Analyzing billing.js file...');
    
    // Look for the area around line 580
    for (let i = 570; i < 590; i++) {
      if (lines[i] && lines[i].includes('Link the medicalInvoice back to the lab orders')) {
        console.log(`\n🔍 Found the problematic area around line ${i + 1}:`);
        console.log(`   Line ${i}: ${lines[i]}`);
        console.log(`   Line ${i + 1}: ${lines[i + 1]}`);
        console.log(`   Line ${i + 2}: ${lines[i + 2]}`);
        console.log(`   Line ${i + 3}: ${lines[i + 3]}`);
        console.log(`   Line ${i + 4}: ${lines[i + 4]}`);
        console.log(`   Line ${i + 5}: ${lines[i + 5]}`);
        
        // Check if there's a missing try block
        if (lines[i + 1] && lines[i + 1].includes('for (const labOrder of updatedLabOrders)')) {
          console.log('\n⚠️  Found missing try block!');
          
          // Insert the missing try block
          const newLines = [
            ...lines.slice(0, i + 1),
            '        try {',
            ...lines.slice(i + 1, i + 5),
            '        } catch (invoiceError) {',
            '          console.warn(\'⚠️ Could not create/update MedicalInvoice:\', invoiceError.message);',
            '          // Don\'t fail the payment if invoice creation fails',
            '        }',
            ...lines.slice(i + 5)
          ];
          
          content = newLines.join('\n');
          
          console.log('✅ Fixed the syntax error by adding missing try block');
          break;
        }
      }
    }
    
    // Write the fixed content back
    fs.writeFileSync(billingFile, content, 'utf8');
    console.log('\n✅ Billing.js syntax error fixed!');
    console.log('   The server should now start properly');
    
  } catch (error) {
    console.error('❌ Error fixing syntax:', error);
  }
}

fixBillingSyntax(); 
 