const mongoose = require('mongoose');

async function run() {
  const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  
  try {
    await mongoose.connect(uri);
    const MedicalInvoice = mongoose.connection.collection('medicalinvoices');

    const invoices = await MedicalInvoice.find({}).toArray();

    const aprilItems = [];
    const mayItems = [];

    invoices.forEach(invoice => {
      if (!invoice.items || !Array.isArray(invoice.items)) return;

      invoice.items.forEach(item => {
        const desc = item.description || item.serviceName || '';
        if (/basic/i.test(desc) && (item.itemType === 'card' || item.category === 'card' || /card\s*membership|patient\s*card|membership\s*card/i.test(desc))) {
          let issueDate = invoice.issueDate;
          if (issueDate) {
            const dateObj = new Date(issueDate);
            if (!isNaN(dateObj.getTime())) {
              const y = dateObj.getFullYear();
              const m = dateObj.getMonth() + 1;
              
              const itemInfo = {
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate,
                status: invoice.status,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                description: desc
              };

              if (y === 2026 && m === 4) {
                aprilItems.push(itemInfo);
              } else if (y === 2026 && m === 5) {
                mayItems.push(itemInfo);
              }
            }
          }
        }
      });
    });

    console.log(`\n=== April 2026 Basic Cards (Total: ${aprilItems.length}) ===`);
    aprilItems.forEach(x => {
      console.log(`- Invoice: ${x.invoiceNumber}, Date: ${x.issueDate}, Status: ${x.status}, Price: ${x.unitPrice}, Qty: ${x.quantity}`);
    });

    console.log(`\n=== May 2026 Basic Cards (Total: ${mayItems.length}) ===`);
    mayItems.forEach(x => {
      console.log(`- Invoice: ${x.invoiceNumber}, Date: ${x.issueDate}, Status: ${x.status}, Price: ${x.unitPrice}, Qty: ${x.quantity}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
