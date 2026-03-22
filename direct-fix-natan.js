const mongoose = require('mongoose');
require('dotenv').config();

async function directFixNatan() {
    try {
        console.log('🔧 Direct fix for Natan Kinfe\'s invoice...');
        
        // Connect directly to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');
        
        // Get the MedicalInvoice model
        const MedicalInvoice = require('./backend/models/MedicalInvoice');
        
        // Find the specific invoice
        const invoice = await MedicalInvoice.findOne({
            invoiceNumber: 'INV-EXT-1756132268415-ibriy'
        });
        
        if (!invoice) {
            console.log('❌ Invoice not found');
            return;
        }
        
        console.log(`📄 Found invoice: ${invoice.invoiceNumber}`);
        console.log(`   Current Total: ${invoice.total} ETB`);
        console.log(`   Current Balance: ${invoice.balance} ETB`);
        
        if (invoice.items && invoice.items.length > 0) {
            const item = invoice.items[0];
            console.log(`\n🔍 Current Item:`);
            console.log(`   Description: ${item.description}`);
            console.log(`   Quantity: ${item.quantity}`);
            console.log(`   Total: ${item.total} ETB`);
            
            // Fix the calculation
            const correctQuantity = 6; // 3 days × 2 doses/day
            const correctTotal = correctQuantity * item.unitPrice; // 6 × 300 = 1800 ETB
            const correctDescription = `Medication Extension - Dexamethasone (+3 days × 2 doses/day = 6 total doses)`;
            
            console.log(`\n🔧 Fixing calculation:`);
            console.log(`   Quantity: ${item.quantity} → ${correctQuantity}`);
            console.log(`   Total: ${item.total} ETB → ${correctTotal} ETB`);
            console.log(`   Description: Updated to show correct BID calculation`);
            
            // Update the invoice item
            item.quantity = correctQuantity;
            item.total = correctTotal;
            item.description = correctDescription;
            
            // Update metadata
            if (item.metadata) {
                item.metadata.additionalDoses = correctQuantity;
                item.metadata.totalDoses = correctQuantity;
                item.metadata.dosesPerDay = 2; // BID
                item.metadata.frequency = 'BID (twice daily)';
            }
            
            // Recalculate invoice totals
            const newSubtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
            const newTotal = newSubtotal;
            const newBalance = newTotal - (invoice.amountPaid || 0);
            
            invoice.subtotal = newSubtotal;
            invoice.total = newTotal;
            invoice.balance = newBalance;
            invoice.status = newBalance <= 0 ? 'paid' : (invoice.amountPaid > 0 ? 'partial' : 'pending');
            
            // Update extension details if they exist
            if (invoice.extensionDetails) {
                invoice.extensionDetails.explicitAdditionalDoses = correctQuantity;
                invoice.extensionDetails.totalDoses = correctQuantity;
                invoice.extensionDetails.dosesPerDay = 2;
                invoice.extensionDetails.frequency = 'BID (twice daily)';
                invoice.extensionDetails.extensionType = 'dose-based';
            }
            
            // Save the updated invoice
            await invoice.save();
            
            console.log(`\n✅ Invoice fixed successfully!`);
            console.log(`   New total: ${invoice.total} ETB`);
            console.log(`   New balance: ${invoice.balance} ETB`);
            console.log(`   New status: ${invoice.status}`);
            
            console.log(`\n📋 Summary of Changes:`);
            console.log(`   - Quantity: 3 → 6 doses`);
            console.log(`   - Total: ETB 900 → ETB 1,800`);
            console.log(`   - Description: Updated to show "3 days × 2 doses/day = 6 total doses"`);
            console.log(`   - Balance: ETB 900 → ETB 1,800`);
            
            console.log(`\n🎉 Natan Kinfe's invoice has been fixed!`);
            console.log(`   Refresh your web application to see the changes.`);
            
        } else {
            console.log('❌ Invoice has no items');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

directFixNatan();
