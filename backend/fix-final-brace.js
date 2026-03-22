const fs = require('fs');
const path = require('path');

const billingPath = path.join(__dirname, 'routes', 'billing.js');

try {
  console.log('🔧 Adding final missing closing brace in billing.js...');
  
  // Read the file
  let content = fs.readFileSync(billingPath, 'utf8');
  
  // Find the specific line and add the missing brace
  const lines = content.split('\n');
  let fixed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for the line that has the catch block
    if (line.includes('} catch (invoiceError) {') && 
        lines[i + 3] && 
        lines[i + 3].trim() === '}' &&
        lines[i + 4] && 
        lines[i + 4].trim() === '}' &&
        lines[i + 5] && 
        lines[i + 5].trim() === '') {
      
      // Add the missing closing brace for the if block
      lines.splice(i + 5, 0, '    }');
      fixed = true;
      console.log(`✅ Added missing closing brace around line ${i + 6}`);
      break;
    }
  }
  
  if (fixed) {
    // Write the fixed content back
    fs.writeFileSync(billingPath, lines.join('\n'), 'utf8');
    console.log('✅ Missing closing brace added successfully!');
  } else {
    console.log('❌ Could not find the exact location to add the brace');
    console.log('Trying to find the pattern manually...');
    
    // Manual fix - look for the specific pattern
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('} catch (invoiceError) {') && 
          lines[i + 3] && lines[i + 3].trim() === '}' &&
          lines[i + 4] && lines[i + 4].trim() === '}') {
        
        // Add the missing closing brace
        lines.splice(i + 5, 0, '    }');
        fs.writeFileSync(billingPath, lines.join('\n'), 'utf8');
        console.log('✅ Fixed using manual pattern matching!');
        break;
      }
    }
  }
  
} catch (error) {
  console.error('❌ Error fixing syntax:', error);
} 
 