const mongoose = require('mongoose');

console.log('Starting simple test...');

try {
  console.log('Connecting...');
  mongoose.connect('mongodb://localhost:27017/clinic-cms')
    .then(() => {
      console.log('Connected successfully');

      const db = mongoose.connection.db;
      console.log('Database:', db.databaseName);

      // List collections
      db.listCollections().toArray((err, collections) => {
        if (err) {
          console.error('Error listing collections:', err);
        } else {
          console.log('Collections:', collections.length);
          collections.forEach(col => {
            console.log(' -', col.name);
          });

          // Close connection
          mongoose.connection.close(() => {
            console.log('Connection closed');
          });
        }
      });
    })
    .catch(err => {
      console.error('Connection error:', err.message);
    });
} catch (error) {
  console.error('Setup error:', error.message);
}