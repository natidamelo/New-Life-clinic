/**
 * Verify Inventory Medications and IV Fluids
 * 
 * This script checks which medications and IV fluids are currently in your inventory
 * and helps you identify what needs to be added.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Import models
const InventoryItem = require('./backend/models/InventoryItem');
const NurseTask = require('./backend/models/NurseTask');

const verifyInventory = async () => {
  try {
    console.log('\n📦 INVENTORY VERIFICATION REPORT\n');
    console.log('═'.repeat(80));

    // 1. Get all medications in inventory
    const medications = await InventoryItem.find({ 
      category: 'medication',
      isActive: true 
    }).sort({ name: 1 });

    console.log('\n✅ MEDICATIONS IN INVENTORY (' + medications.length + ' items)');
    console.log('─'.repeat(80));

    // Group by type
    const ivFluids = [];
    const antibiotics = [];
    const analgesics = [];
    const others = [];

    medications.forEach(med => {
      const name = med.name.toLowerCase();
      if (name.includes('saline') || name.includes('dextrose') || name.includes('ringer') || 
          name.includes('lactate') || name.includes('albumin') || name.includes('mannitol') ||
          name.includes('sodium bicarbonate') || name.includes('potassium') || 
          name.includes('calcium gluconate') || name.includes('magnesium sulfate')) {
        ivFluids.push(med);
      } else if (name.includes('cillin') || name.includes('mycin') || name.includes('cef') ||
                 name.includes('floxacin') || name.includes('metronidazole')) {
        antibiotics.push(med);
      } else if (name.includes('paracetamol') || name.includes('ibuprofen') || 
                 name.includes('diclofenac') || name.includes('morphine')) {
        analgesics.push(med);
      } else {
        others.push(med);
      }
    });

    // Display IV Fluids
    console.log('\n💉 IV FLUIDS (' + ivFluids.length + ')');
    if (ivFluids.length > 0) {
      ivFluids.forEach(med => {
        const stockStatus = med.quantity <= med.minimumStockLevel ? '🔴 LOW' : 
                           med.quantity <= med.reorderPoint ? '🟡 REORDER' : '🟢';
        console.log(`  ${stockStatus} ${med.name} - Qty: ${med.quantity} ${med.unit || 'units'}`);
      });
    } else {
      console.log('  ⚠️  No IV fluids found in inventory');
    }

    // Display Antibiotics
    console.log('\n💊 ANTIBIOTICS (' + antibiotics.length + ')');
    if (antibiotics.length > 0) {
      antibiotics.forEach(med => {
        const stockStatus = med.quantity <= med.minimumStockLevel ? '🔴 LOW' : 
                           med.quantity <= med.reorderPoint ? '🟡 REORDER' : '🟢';
        console.log(`  ${stockStatus} ${med.name} - Qty: ${med.quantity} ${med.unit || 'units'}`);
      });
    } else {
      console.log('  ⚠️  No antibiotics found in inventory');
    }

    // Display Analgesics
    console.log('\n💊 ANALGESICS/PAIN RELIEVERS (' + analgesics.length + ')');
    if (analgesics.length > 0) {
      analgesics.forEach(med => {
        const stockStatus = med.quantity <= med.minimumStockLevel ? '🔴 LOW' : 
                           med.quantity <= med.reorderPoint ? '🟡 REORDER' : '🟢';
        console.log(`  ${stockStatus} ${med.name} - Qty: ${med.quantity} ${med.unit || 'units'}`);
      });
    } else {
      console.log('  ⚠️  No analgesics found in inventory');
    }

    // Display Others
    console.log('\n💊 OTHER MEDICATIONS (' + others.length + ')');
    if (others.length > 0) {
      others.forEach(med => {
        const stockStatus = med.quantity <= med.minimumStockLevel ? '🔴 LOW' : 
                           med.quantity <= med.reorderPoint ? '🟡 REORDER' : '🟢';
        console.log(`  ${stockStatus} ${med.name} - Qty: ${med.quantity} ${med.unit || 'units'}`);
      });
    }

    // 2. Get medications being administered (from active nurse tasks)
    console.log('\n\n📋 MEDICATIONS CURRENTLY BEING ADMINISTERED');
    console.log('─'.repeat(80));

    const activeTasks = await NurseTask.find({
      taskType: { $in: ['MEDICATION', 'INJECTION'] },
      status: { $in: ['pending', 'in-progress'] }
    }).populate('patientId', 'firstName lastName');

    if (activeTasks.length > 0) {
      const medicationsInUse = new Map();
      
      activeTasks.forEach(task => {
        const medName = task.medicationDetails?.medicationName || task.description;
        if (!medicationsInUse.has(medName)) {
          medicationsInUse.set(medName, {
            name: medName,
            count: 0,
            patients: []
          });
        }
        const medInfo = medicationsInUse.get(medName);
        medInfo.count++;
        if (task.patientId) {
          medInfo.patients.push(`${task.patientId.firstName} ${task.patientId.lastName}`);
        }
      });

      console.log(`\nFound ${medicationsInUse.size} different medications being administered:\n`);
      
      for (const [medName, info] of medicationsInUse) {
        // Check if this medication exists in inventory
        const inInventory = medications.find(m => 
          m.name.toLowerCase().includes(medName.toLowerCase()) || 
          medName.toLowerCase().includes(m.name.toLowerCase())
        );
        
        const inventoryStatus = inInventory ? 
          `✅ In inventory (${inInventory.quantity} ${inInventory.unit || 'units'})` : 
          '❌ NOT IN INVENTORY - ADD TO ENABLE DEDUCTION';
        
        console.log(`  ${medName}`);
        console.log(`    ${inventoryStatus}`);
        console.log(`    Patients: ${info.patients.slice(0, 3).join(', ')}${info.patients.length > 3 ? '...' : ''}`);
        console.log();
      }
    } else {
      console.log('  No active medication tasks found');
    }

    // 3. Recommendations
    console.log('\n\n💡 RECOMMENDATIONS');
    console.log('─'.repeat(80));

    const commonIVFluids = [
      'Normal Saline (0.9% NaCl)',
      'Ringer Lactate (Hartmann Solution)',
      'Dextrose 5% (D5W)',
      'Dextrose 10% (D10W)',
      'Dextrose 50% (D50W)',
      'Half Normal Saline (0.45% NaCl)',
      'Sodium Bicarbonate 8.4%',
      'Potassium Chloride (KCl)',
      'Calcium Gluconate',
      'Magnesium Sulfate'
    ];

    const missingCommonIVFluids = commonIVFluids.filter(fluid => 
      !medications.some(m => m.name.toLowerCase().includes(fluid.toLowerCase()))
    );

    if (missingCommonIVFluids.length > 0) {
      console.log('\n⚠️  Common IV Fluids NOT in inventory:');
      missingCommonIVFluids.forEach(fluid => {
        console.log(`  • ${fluid}`);
      });
      console.log('\n  💡 Add these via: Stock Management → Add Expense → New Inventory Item');
      console.log('     - Item Type: Medication');
      console.log('     - Category: IV Fluids');
      console.log('     - Enter name, quantity, cost price, selling price');
    } else {
      console.log('\n✅ All common IV fluids are in inventory!');
    }

    // 4. Low Stock Warnings
    const lowStock = medications.filter(m => m.quantity <= m.minimumStockLevel);
    if (lowStock.length > 0) {
      console.log('\n\n🔴 LOW STOCK WARNINGS (' + lowStock.length + ' items)');
      console.log('─'.repeat(80));
      lowStock.forEach(med => {
        console.log(`  • ${med.name} - Only ${med.quantity} ${med.unit || 'units'} remaining (Min: ${med.minimumStockLevel})`);
      });
      console.log('\n  💡 Restock these items via: Stock Management → Update Stock');
    }

    console.log('\n\n═'.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('═'.repeat(80));
    
    console.log('\n📚 For more information, see: INVENTORY_DEDUCTION_MEDICATION_ADMIN_GUIDE.md\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

// Run the verification
connectDB().then(() => {
  verifyInventory();
});

