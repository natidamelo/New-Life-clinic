const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');

mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function quickCheck() {
  try {
    console.log('🔍 Quick check for lab invoices...');
    
    const labInvoices = await MedicalInvoice.find({
      'items.itemType': 'lab'
    }).sort({ createdAt: -1 });
    
    console.log(`\n🔬 Lab invoices found: ${labInvoices.length}`);
    
    if (labInvoices.length > 0) {
      labInvoices.forEach((invoice, index) => {
        console.log(`\n${index + 1}. ${invoice.invoiceNumber}`);
        console.log(`   Patient: ${invoice.patientName}`);
        console.log(`   Status: ${invoice.status}`);
        console.log(`   Total: ${invoice.total}`);
        console.log(`   Balance: ${invoice.balance}`);
        console.log(`   Items: ${invoice.items.length}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

quickCheck(); 
 