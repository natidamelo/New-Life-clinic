const InventoryItem = require('./models/InventoryItem');
const mongoose = require('mongoose');

async function addHematologyTests() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Define hematology tests to add
    const hematologyTests = [
      {
        itemCode: 'HEM-CBC-001',
        name: 'Complete Blood Count (CBC)',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Complete Blood Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 100,
        sellingPrice: 150,
        quantity: 500
      },
      {
        itemCode: 'HEM-WBC-001',
        name: 'White Blood Cell Count',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'White Blood Cell Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 50,
        sellingPrice: 80,
        quantity: 500
      },
      {
        itemCode: 'HEM-ESR-001',
        name: 'Erythrocyte Sedimentation Rate (ESR)',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'ESR Test',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-HCT-001',
        name: 'Hematocrit',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Hematocrit Test',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 30,
        sellingPrice: 50,
        quantity: 500
      },
      {
        itemCode: 'HEM-RBC-001',
        name: 'Red Blood Cell Count',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Red Blood Cell Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 50,
        sellingPrice: 80,
        quantity: 500
      },
      {
        itemCode: 'HEM-PLT-001',
        name: 'Platelet Count',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Platelet Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 50,
        sellingPrice: 80,
        quantity: 500
      },
      {
        itemCode: 'HEM-MCV-001',
        name: 'Mean Corpuscular Volume (MCV)',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'MCV Test',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-MCH-001',
        name: 'Mean Corpuscular Hemoglobin (MCH)',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'MCH Test',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-DIF-001',
        name: 'Differential Count',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Differential Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 60,
        sellingPrice: 100,
        quantity: 500
      },
      {
        itemCode: 'HEM-PT-001',
        name: 'Prothrombin Time (PT)',
        specimenType: 'Citrated Plasma',
        testType: 'Coagulation Studies',
        storageTemperature: '2-8°C (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 80,
        sellingPrice: 120,
        quantity: 300
      },
      {
        itemCode: 'HEM-INR-001',
        name: 'International Normalized Ratio (INR)',
        specimenType: 'Citrated Plasma',
        testType: 'Coagulation Studies',
        storageTemperature: '2-8°C (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 80,
        sellingPrice: 120,
        quantity: 300
      },
      {
        itemCode: 'HEM-PTT-001',
        name: 'Partial Thromboplastin Time (PTT)',
        specimenType: 'Citrated Plasma',
        testType: 'Coagulation Studies',
        storageTemperature: '2-8°C (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 80,
        sellingPrice: 120,
        quantity: 300
      },
      {
        itemCode: 'HEM-RET-001',
        name: 'Reticulocyte Count',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Reticulocyte Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 70,
        sellingPrice: 110,
        quantity: 300
      },
      {
        itemCode: 'HEM-NEU-001',
        name: 'Neutrophils',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Differential Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-LYM-001',
        name: 'Lymphocytes',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Differential Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-MON-001',
        name: 'Monocytes',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Differential Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-EOS-001',
        name: 'Eosinophils',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Differential Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-BAS-001',
        name: 'Basophils',
        specimenType: 'Whole Blood (EDTA)',
        testType: 'Differential Count',
        storageTemperature: 'Room temperature (≤4 hrs)',
        processTime: '30 minutes',
        costPrice: 40,
        sellingPrice: 60,
        quantity: 500
      },
      {
        itemCode: 'HEM-DDI-001',
        name: 'D-Dimer',
        specimenType: 'Citrated Plasma',
        testType: 'Coagulation Studies',
        storageTemperature: '2-8°C (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 100,
        sellingPrice: 150,
        quantity: 200
      },
      {
        itemCode: 'HEM-FIB-001',
        name: 'Fibrinogen',
        specimenType: 'Citrated Plasma',
        testType: 'Coagulation Studies',
        storageTemperature: '2-8°C (≤4 hrs)',
        processTime: '1 hour',
        costPrice: 90,
        sellingPrice: 140,
        quantity: 200
      }
    ];
    
    let addedCount = 0;
    let existingCount = 0;
    
    for (const testData of hematologyTests) {
      // Check if test already exists
      const existing = await InventoryItem.findOne({ 
        name: testData.name,
        category: 'laboratory'
      });
      
      if (existing) {
        console.log(`⏭️  Skipping "${testData.name}" - already exists`);
        existingCount++;
        continue;
      }
      
      // Create new inventory item
      const newItem = new InventoryItem({
        ...testData,
        category: 'laboratory',
        unit: 'test',
        description: `${testData.name} - ${testData.testType}`,
        minimumStockLevel: 50,
        reorderPoint: 100,
        location: 'Laboratory',
        isActive: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      });
      
      await newItem.save();
      console.log(`✅ Added: ${testData.name} (Qty: ${testData.quantity})`);
      addedCount++;
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${addedCount} tests`);
    console.log(`   ⏭️  Skipped (existing): ${existingCount} tests`);
    console.log(`   📦 Total processed: ${hematologyTests.length} tests`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addHematologyTests();

