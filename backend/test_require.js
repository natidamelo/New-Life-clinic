try {
  console.log('Requiring medicalRecords route...');
  require('./routes/medicalRecords');
  console.log('Success!');
} catch (error) {
  console.error('Error requiring medicalRecords:');
  console.error(error.message);
  console.error(error.stack);
}
