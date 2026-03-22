const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const MedicalInvoice = require('./backend/models/MedicalInvoice');

async function quickFixInvoice() {
  try {
    console.log('🔧 Quick fixing invoice: 68ab3477d21038ce3a92dbfe');
    
    // Find the invoice
    const invoice = await MedicalInvoice.findById('68ab3477d21038ce3a92dbfe');
    if (!invoice) {
      console.log('❌ Invoice not found');
      return;
    }
    
    console.log('\n📄 Current Invoice:');
    console.log('Invoice Number:', invoice.invoiceNumber);
    console.log('Status:', invoice.status);
    console.log('Total:', invoice.total);
    console.log('Amount Paid:', invoice.amountPaid);
    
    // Fix the medication item
    if (invoice.items && invoice.items.length > 0) {
      const medicationItem = invoice.items[0]; // Assuming first item is the medication
      
      console.log('\n🔧 Fixing medication item:');
      console.log('Description:', medicationItem.description);
      console.log('Old Unit Price:', medicationItem.unitPrice);
      console.log('Old Total:', medicationItem.total);
      
      // Set correct pricing for Dexamethasone
      medicationItem.unitPrice = 200; // ETB 200 per dose
      medicationItem.total = medicationItem.quantity * medicationItem.unitPrice;
      
      console.log('New Unit Price:', medicationItem.unitPrice);
      console.log('New Total:', medicationItem.total);
    }
    
    // Recalculate invoice totals
    invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
    invoice.total = invoice.subtotal;
    invoice.balance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
    
    // Update status
    if (invoice.balance === 0 && invoice.amountPaid > 0) {
      invoice.status = 'paid';
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'pending';
    }
    
    console.log('\n📊 Updated Invoice:');
    console.log('Subtotal:', invoice.subtotal);
    console.log('Total:', invoice.total);
    console.log('Balance:', invoice.balance);
    console.log('Status:', invoice.status);
    
    // Save the changes
    await invoice.save();
    console.log('\n✅ Invoice fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

quickFixInvoice();
