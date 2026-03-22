const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

// Connection string
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

// Lab inventory items to add
const labInventoryItems = [
  // Hematology Tests
  {
    itemCode: 'LAB-ESR-001',
    name: 'ESR (Erythrocyte Sedimentation Rate)',
    category: 'laboratory',
    description: 'Test kit for measuring erythrocyte sedimentation rate',
    quantity: 100,
    unit: 'test',
    reorderPoint: 20,
    minimumStockLevel: 10,
    costPrice: 5,
    sellingPrice: 15,
    supplier: 'Lab Supplies Inc',
    isActive: true
  },
  {
    itemCode: 'LAB-WBC-001',
    name: 'WBC (White Blood Cell Count)',
    category: 'laboratory',
    description: 'Test kit for white blood cell count',
    quantity: 100,
    unit: 'test',
    reorderPoint: 20,
    minimumStockLevel: 10,
    costPrice: 8,
    sellingPrice: 20,
    supplier: 'Lab Supplies Inc',
    isActive: true
  },
  {
    itemCode: 'LAB-RBC-001',
    name: 'RBC (Red Blood Cell Count)',
    category: 'laboratory',
    description: 'Test kit for red blood cell count',
    quantity: 100,
    unit: 'test',
    reorderPoint: 20,
    minimumStockLevel: 10,
    costPrice: 8,
    sellingPrice: 20,
    supplier: 'Lab Supplies Inc',
    isActive: true
  },
  {
    itemCode: 'LAB-PLT-001',
    name: 'Platelet Count',
    category: 'laboratory',
    description: 'Test kit for platelet count',
    quantity: 100,
    unit: 'test',
    reorderPoint: 20,
    minimumStockLevel: 10,
    costPrice: 10,
    sellingPrice: 25,
    supplier: 'Lab Supplies Inc',
    isActive: true
  },
  // Serological Tests
  {
    itemCode: 'LAB-ASO-001',
    name: 'ASO (Anti-Streptolysin O)',
    category: 'laboratory',
    description: 'Test kit for Anti-Streptolysin O antibody detection',
    quantity: 50,
    unit: 'test',
    reorderPoint: 10,
    minimumStockLevel: 5,
    costPrice: 15,
    sellingPrice: 35,
    supplier: 'Lab Supplies Inc',
    isActive: true
  },
  {
    itemCode: 'LAB-CRP-001',
    name: 'C-Reactive Protein',
    category: 'laboratory',
    description: 'Test kit for C-Reactive Protein measurement',
    quantity: 50,
    unit: 'test',
    reorderPoint: 10,
    minimumStockLevel: 5,
    costPrice: 12,
    sellingPrice: 30,
    supplier: 'Lab Supplies Inc',
    isActive: true
  },
  {
    itemCode: 'LAB-WID-001',
    name: 'Widal Test',
    category: 'laboratory',
    description: 'Test kit for typhoid fever diagnosis (Widal test)',
    quantity: 50,
    unit: 'test',
    reorderPoint: 10,
    minimumStockLevel: 5,
    costPrice: 18,
    sellingPrice: 40,
    supplier: 'Lab Supplies Inc',
    isActive: true
  },
  {
    itemCode: 'LAB-RF-001',
    name: 'RF (Rheumatoid Factor)',
    category: 'laboratory',
    description: 'Test kit for Rheumatoid Factor detection',
    quantity: 50,
    unit: 'test',
    reorderPoint: 10,
    minimumStockLevel: 5,
    costPrice: 20,
    sellingPrice: 45,
    supplier: 'Lab Supplies Inc',
    isActive: true
  }
];

async function addLabInventoryItems() {
  try {
    console.log('🔬 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔬 Adding missing laboratory inventory items...\n');

    for (const item of labInventoryItems) {
      // Check if item already exists
      const existingItem = await InventoryItem.findOne({ 
        name: item.name,
        category: item.category 
      });

      if (existingItem) {
        console.log(`⏭️  Skipped: "${item.name}" already exists`);
      } else {
        // Create new inventory item
        const newItem = new InventoryItem(item);
        await newItem.save();
        console.log(`✅ Added: "${item.name}" (${item.quantity} ${item.unit})`);
      }
    }

    console.log('\n✅ Laboratory inventory items setup complete!');
    console.log('\n📊 Summary:');
    console.log(`   Total items to add: ${labInventoryItems.length}`);
    
    // Count how many lab items we have now
    const labCount = await InventoryItem.countDocuments({ category: 'laboratory' });
    console.log(`   Total laboratory items in database: ${labCount}`);

    console.log('\n🔬 Lab inventory items are now ready for deduction when tests are completed.');

  } catch (error) {
    console.error('❌ Error adding lab inventory items:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
addLabInventoryItems()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

