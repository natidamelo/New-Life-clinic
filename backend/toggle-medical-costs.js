const fs = require('fs');
const path = require('path');

// Function to update the configuration
function toggleMedicalCostsInCOGS(include = true) {
  const configPath = path.join(__dirname, 'config', 'index.js');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update the INCLUDE_MEDICAL_USE_IN_COGS setting
    const newSetting = `INCLUDE_MEDICAL_USE_IN_COGS: ${include}`;
    const pattern = /INCLUDE_MEDICAL_USE_IN_COGS:\s*[^,\n]+/;
    
    if (pattern.test(configContent)) {
      configContent = configContent.replace(pattern, newSetting);
    } else {
      // Add the setting if it doesn't exist
      configContent = configContent.replace(
        /\/\/ Financial Configuration/,
        `// Financial Configuration\n  ${newSetting},`
      );
    }
    
    fs.writeFileSync(configPath, configContent);
    
    console.log(`✅ Updated configuration: Medical costs ${include ? 'INCLUDED' : 'EXCLUDED'} in COGS`);
    console.log('🔄 Please restart the backend server for changes to take effect');
    
  } catch (error) {
    console.error('❌ Error updating configuration:', error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const action = args[0];

if (action === 'exclude') {
  console.log('🚫 Excluding medical-use inventory costs from COGS calculation...');
  toggleMedicalCostsInCOGS(false);
} else if (action === 'include') {
  console.log('✅ Including medical-use inventory costs in COGS calculation...');
  toggleMedicalCostsInCOGS(true);
} else {
  console.log('📋 Medical Costs in COGS Toggle Script');
  console.log('');
  console.log('Usage:');
  console.log('  node toggle-medical-costs.js exclude   # Exclude medication costs from COGS');
  console.log('  node toggle-medical-costs.js include   # Include medication costs in COGS');
  console.log('');
  console.log('Current behavior: Medical-use inventory transactions are included in COGS by default');
  console.log('This affects the Cost of Goods Sold calculation in financial reports');
} 
