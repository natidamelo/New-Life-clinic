const { MongoClient } = require('mongodb');

async function quickCleanup() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('clinic-cms');
    
    console.log('🗑️ Quick cleanup starting...');
    
    // Remove all invoices for Semhal
    const result = await db.collection('medicalinvoices').deleteMany({
      patientId: '68b17fd748c353ce9024293f'
    });
    
    console.log(`✅ Deleted ${result.deletedCount} invoices`);
    
    // Update prescription payment status
    await db.collection('prescriptions').updateOne(
      { _id: '68b6c65ea76d00c0d23684d5' },
      { $set: { paymentStatus: 'pending', totalCost: 350, balance: 350 } }
    );
    
    console.log('✅ Updated prescription');
    
    // Update nurse task
    await db.collection('nursetasks').updateOne(
      { 
        patientId: '68b17fd748c353ce9024293f',
        'medicationDetails.duration': 7
      },
      { 
        $set: { 
          'paymentAuthorization.paymentStatus': 'pending',
          'paymentAuthorization.canAdminister': false
        } 
      }
    );
    
    console.log('✅ Updated nurse task');
    console.log('🎯 Invoice system removed! Now just pay the prescription directly.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

quickCleanup();
