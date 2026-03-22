const fs = require('fs');
const path = require('path');

const billingPath = path.join(__dirname, 'routes', 'billing.js');

try {
  console.log('🔧 Adding missing closing brace in billing.js...');
  
  // Read the file
  let content = fs.readFileSync(billingPath, 'utf8');
  
  // Find and add the missing closing brace
  const lines = content.split('\n');
  let fixed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for the pattern: "      }" (closing try-catch) followed by "    }" (closing if block)
    if (line.trim() === '      } catch (invoiceError) {' && 
        lines[i + 3] && 
        lines[i + 3].trim() === '      }' &&
        lines[i + 4] && 
        lines[i + 4].trim() === '    }' &&
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
    console.log('Trying alternative approach...');
    
    // Alternative: look for the specific pattern and add the brace
    const pattern = /(\s+} catch \(invoiceError\) \{\s+\n\s+console\.warn.*\n\s+// Don't fail.*\n\s+\}\s+\n\s+\}\s+\n)/;
    const replacement = '$1    }\n';
    
    if (content.match(pattern)) {
      content = content.replace(pattern, replacement);
      fs.writeFileSync(billingPath, content, 'utf8');
      console.log('✅ Added missing closing brace using pattern matching!');
    } else {
      console.log('❌ Could not find the pattern to fix');
    }
  }
  
} catch (error) {
  console.error('❌ Error fixing syntax:', error);
} 
 