const { MongoClient } = require('mongodb');

async function removeMedInvoices() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('clinic-cms');
    
    console.log('🗑️ Removing MED- invoices, keeping PRES- invoices...');
    
    // Remove all MED- invoices (medication invoices)
    const medResult = await db.collection('medicalinvoices').deleteMany({
      invoiceNumber: { $regex: /^MED-/ }
    });
    
    console.log(`✅ Deleted ${medResult.deletedCount} MED- invoices`);
    
    // Keep PRES- invoices (prescription invoices)
    const presInvoices = await db.collection('medicalinvoices').find({
      invoiceNumber: { $regex: /^PRES-/ }
    }).toArray();
    
    console.log(`✅ Kept ${presInvoices.length} PRES- invoices`);
    
    // Show what PRES- invoices remain
    if (presInvoices.length > 0) {
      console.log('\n📋 Remaining PRES- invoices:');
      presInvoices.forEach(invoice => {
        console.log(`  - ${invoice.invoiceNumber}: ${invoice.patientName} - ${invoice.totalAmount} ETB`);
      });
    }
    
    console.log('\n🎯 System cleaned up!');
    console.log('✅ MED- invoices removed');
    console.log('✅ PRES- invoices kept');
    console.log('✅ Now only prescription-based billing remains');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

removeMedInvoices();
