process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

try {
  console.log('Requiring medicalRecords route...');
  const route = require('./routes/medicalRecords');
  console.log('Success!');
} catch (error) {
  console.error('Error requiring medicalRecords:');
  console.error(error);
  if (error.code === 'MODULE_NOT_FOUND') {
    // Check if it's the module itself or a dependency
    console.error('Module logic:', error.message);
  }
}
