const { exec } = require('child_process');
const path = require('path');

console.log('🔍 Running invoice creation script...');

const scriptPath = path.join(__dirname, 'backend', 'scripts', 'create-invoices-for-lab-orders.js');

exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error running script:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️ Script stderr:', stderr);
  }
  
  console.log('✅ Script output:');
  console.log(stdout);
}); 
 
 
 
const path = require('path');

console.log('🔍 Running invoice creation script...');

const scriptPath = path.join(__dirname, 'backend', 'scripts', 'create-invoices-for-lab-orders.js');

exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error running script:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️ Script stderr:', stderr);
  }
  
  console.log('✅ Script output:');
  console.log(stdout);
}); 
 
 
 
 
 
 
 
 