const { MongoClient } = require('mongodb');
require('dotenv').config({path: './backend/.env'});

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('clinic-cms');
  
  console.log('Fixing tenant IDs...');
  const collections = ['users', 'patients', 'medicalrecords', 'prescriptions', 'nursetasks', 'appointments', 'imagingorders', 'laborders', 'pharmacysales', 'labtests', 'ipdadmissions'];
  
  for (const col of collections) {
    try {
       const result = await db.collection(col).updateMany(
         { clinicId: { $in: ['default', 'global', null, ''] } },
         { $set: { clinicId: 'new-life' } }
       );
       console.log(`Updated ${result.modifiedCount} records in ${col}`);
       
       // Also update records completely missing the clinicId field
       const missingResult = await db.collection(col).updateMany(
         { clinicId: { $exists: false } },
         { $set: { clinicId: 'new-life' } }
       );
       if (missingResult.modifiedCount > 0) {
         console.log(`Updated ${missingResult.modifiedCount} records missing clinicId in ${col}`);
       }
    } catch(e) { 
       console.log(`Error updating ${col}: ${e.message}`); 
    }
  }
  
  console.log('All tenant IDs have been standardized to "new-life".');
  await client.close();
}
run().catch(console.error);
