const mongoose = require('mongoose');

async function run() {
  const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  
  try {
    await mongoose.connect(uri);
    const MedicalInvoice = mongoose.connection.collection('medicalinvoices');

    const invoices = await MedicalInvoice.find({}).toArray();

    console.log("Total invoices in DB:", invoices.length);

    const matchCounts = {};
    const details = [];

    invoices.forEach(invoice => {
      if (!invoice.items || !Array.isArray(invoice.items)) return;

      invoice.items.forEach(item => {
        const desc = item.description || item.serviceName || '';
        if (/basic/i.test(desc) && (item.itemType === 'card' || item.category === 'card' || /card\s*membership|patient\s*card|membership\s*card/i.test(desc) || desc.toLowerCase().includes('card'))) {
          const key = `${item.itemType || 'undefined'} || ${item.category || 'undefined'} || ${invoice.status || 'undefined'}`;
          matchCounts[key] = (matchCounts[key] || 0) + 1;
          
          let dateStr = 'unknown';
          if (invoice.issueDate) {
            const dateObj = new Date(invoice.issueDate);
            if (!isNaN(dateObj.getTime())) {
              dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            }
          }

          details.push({
            invoiceNumber: invoice.invoiceNumber,
            dateStr,
            itemType: item.itemType,
            category: item.category,
            status: invoice.status,
            description: desc
          });
        }
      });
    });

    console.log("\n=== Distribution by itemType, category, and status ===");
    console.log(JSON.stringify(matchCounts, null, 2));

    console.log("\n=== Breakdown by Month and Status ===");
    const monthStatusCounts = {};
    details.forEach(d => {
      const key = `${d.dateStr} || ${d.status}`;
      monthStatusCounts[key] = (monthStatusCounts[key] || 0) + 1;
    });
    console.log(JSON.stringify(monthStatusCounts, null, 2));

    console.log("\n=== List of non-paid or differently typed cards ===");
    details.forEach(d => {
      if (d.status !== 'paid' || d.itemType !== 'other') {
        console.log(`- ${d.invoiceNumber} | Month: ${d.dateStr} | Status: ${d.status} | itemType: ${d.itemType} | category: ${d.category} | ${d.description}`);
      }
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
