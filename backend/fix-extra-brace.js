const fs = require('fs');
const path = require('path');

const billingPath = path.join(__dirname, 'routes', 'billing.js');

try {
  console.log('🔧 Removing extra closing brace in billing.js...');
  
  // Read the file
  let content = fs.readFileSync(billingPath, 'utf8');
  
  // Find and remove the extra closing brace
  const lines = content.split('\n');
  let fixed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for the pattern: "        }" followed by "        } else {"
    if (line.trim() === '        }' && 
        lines[i + 1] && 
        lines[i + 1].trim() === '        } else {') {
      
      // Remove the extra closing brace
      lines.splice(i, 1);
      fixed = true;
      console.log(`✅ Removed extra closing brace around line ${i + 1}`);
      break;
    }
  }
  
  if (fixed) {
    // Write the fixed content back
    fs.writeFileSync(billingPath, lines.join('\n'), 'utf8');
    console.log('✅ Extra closing brace removed successfully!');
  } else {
    console.log('❌ Could not find the extra closing brace');
  }
  
} catch (error) {
  console.error('❌ Error fixing syntax:', error);
} 
 