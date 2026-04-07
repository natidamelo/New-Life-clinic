const fs = require('fs');
try {
  console.log('Requiring medicalRecords route...');
  require('./routes/medicalRecords');
  console.log('Success!');
} catch (error) {
  const errOutput = `Message: ${error.message}\nStack: ${error.stack}`;
  fs.writeFileSync('error_log.txt', errOutput);
  process.exit(1);
}
