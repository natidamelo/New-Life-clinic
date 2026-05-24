const mongoose = require('mongoose');

function baseName(serviceName, description) {
  let raw = (serviceName && serviceName.length > 2 ? serviceName : null)
    || description
    || 'Unknown';

  return raw
    .replace(/^(Medication|Lab\s*test|Lab|Procedure|Service|Consultation|Imaging|Supply|Other):\s*/i, '')
    .replace(/\s*\(.*$/s, '')
    .replace(/\s+for\s+\d+\s+days?\b.*/i, '')
    .replace(/\s*-\s*\d+\s+days?\b.*/i, '')
    .replace(/\s+\d+\s+doses?\b.*/i, '')
    .replace(/\s*\b(QD|BID|TID|QID|PRN|once daily|twice daily)\b.*/i, '')
    .replace(/[\s,\-]+$/, '')
    .trim();
}

async function run() {
  const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
  
  try {
    await mongoose.connect(uri);
    const MedicalInvoice = mongoose.connection.collection('medicalinvoices');

    const startDate = new Date('2025-05-22');
    const endDate = new Date('2026-05-22');

    const matchStage = { 
      status: { $nin: ['cancelled'] },
      issueDate: { $gte: startDate, $lte: endDate }
    };

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $project: {
          itemType: { $ifNull: ['$items.itemType', 'other'] },
          description: '$items.description',
          serviceName: { $ifNull: ['$items.serviceName', '$items.description'] },
          revenue: { $multiply: ['$items.quantity', '$items.unitPrice'] },
          quantity: '$items.quantity',
          unitPrice: '$items.unitPrice',
          month: { $dateToString: { format: '%Y-%m', date: '$issueDate' } },
        }
      }
    ];

    const rawRows = await MedicalInvoice.aggregate(pipeline).toArray();

    const grouped = {};
    rawRows.forEach(row => {
      const name = baseName(row.serviceName, row.description);
      const key = `${row.itemType}||${name.toLowerCase()}`;

      if (!grouped[key]) {
        grouped[key] = {
          itemType: row.itemType,
          baseName: name,
          totalRevenue: 0,
          totalQuantity: 0,
          invoiceCount: 0,
          monthMap: {},
        };
      }

      const g = grouped[key];
      g.totalRevenue += row.revenue;
      g.totalQuantity += 1;
      g.invoiceCount += 1;

      if (!g.monthMap[row.month]) g.monthMap[row.month] = { revenue: 0, quantity: 0 };
      g.monthMap[row.month].revenue += row.revenue;
      g.monthMap[row.month].quantity += 1;
    });

    console.log("=== Grouped Items matching Card/Membership/Renewal ===");
    Object.values(grouped).forEach(g => {
      const nameLower = g.baseName.toLowerCase();
      if (nameLower.includes('card') || nameLower.includes('membership') || nameLower.includes('renewal')) {
        console.log(`\nKey: "${g.itemType}||${g.baseName}"`);
        console.log(`Total Quantity: ${g.totalQuantity}, Total Revenue: ${g.totalRevenue}`);
        console.log(`Monthly breakdown:`, JSON.stringify(g.monthMap));
      }
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
