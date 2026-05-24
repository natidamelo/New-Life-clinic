const fs = require('fs');
const path = require('path');

function inspectFields() {
  const filePath = path.join(__dirname, 'backend', 'database_backup', 'patients.json');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const patients = JSON.parse(raw);

  // Find a patient who is missing details, let's list all their keys and values
  const missing = patients.filter(p => p.age === null || p.age === undefined);
  if (missing.length === 0) {
    console.log('No missing details patients found.');
    return;
  }

  // Let's print the first 5 completely
  console.log('First 5 missing-details patients from backup:');
  for (let i = 0; i < Math.min(5, missing.length); i++) {
    console.log(`\nPatient #${i + 1}:`);
    console.log(JSON.stringify(missing[i], null, 2));
  }

  // Let's aggregate all keys across all patients in the backup to see if there are other keys
  const allKeys = new Set();
  patients.forEach(p => {
    Object.keys(p).forEach(k => allKeys.add(k));
  });

  console.log('\nAll keys present in any patient record in backup:');
  console.log([...allKeys].join(', '));
}

inspectFields();
