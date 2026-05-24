const fs = require('fs');
const path = require('path');

function inspectBackup() {
  const filePath = path.join(__dirname, 'backend', 'database_backup', 'patients.json');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const patients = JSON.parse(raw);

  console.log(`Total patients in backup JSON: ${patients.length}`);

  const missingAge = patients.filter(p => p.age === null || p.age === undefined);
  const missingGender = patients.filter(p => !p.gender || p.gender === '');
  const missingPhone = patients.filter(p => !p.contactNumber || p.contactNumber === '');

  console.log(`Missing age: ${missingAge.length}`);
  console.log(`Missing gender: ${missingGender.length}`);
  console.log(`Missing phone: ${missingPhone.length}`);

  // Let's find patients with name Ruth in the backup
  const ruths = patients.filter(p => {
    const fn = p.firstName || '';
    const ln = p.lastName || '';
    return fn.toLowerCase().includes('ruth') || ln.toLowerCase().includes('ruth');
  });

  console.log(`\nRuths in backup:`, JSON.stringify(ruths, null, 2));
}

inspectBackup();
