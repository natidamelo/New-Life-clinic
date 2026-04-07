const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);

    const target = 'new-life';
    const db = mongoose.connection.db;
    const collections = [
      'procedures', 'products', 'qrcodeanalytics', 'referrals', 'roles', 
      'rooms', 'routeusages', 'securityincidents', 'servicerequests', 
      'services', 'settings', 'staffattendances', 'staffhashes', 
      'telegramconfigs', 'timesheets', 'userpreferences', 'users', 
      'visits', 'vitalsigns', 'weeklydiseasesreports'
    ];
    
    console.log(`Aggressively REHOMING target collections to ${target}:`);

    for (const name of collections) {
      const coll = db.collection(name);
      
      const filter = {
        $or: [
          { clinicId: { $ne: target } },
          { clinicId: { $exists: false } },
          { clinicId: null },
          { clinicId: '' }
        ]
      };

      const result = await coll.updateMany(filter, { $set: { clinicId: target } });
      if (result.matchedCount > 0) {
        console.log(`${name}: Updated ${result.modifiedCount} docs.`);
      } else {
        // console.log(`${name}: All docs already correctly tagged.`);
      }
    }

    console.log('REHOME COMPLETE.');
    process.exit(0);
  } catch (error) {
    console.error('Error during rehome:', error.message);
    process.exit(1);
  }
}

run();
