const mongoose = require('mongoose');
require('dotenv').config();

async function quickFixNatan() {
    try {
        console.log('🔧 Quick fix for Natan Kinfe\'s invoice...');
        
        // Connect with minimal options
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Get the MedicalInvoice model
        const MedicalInvoice = require('./backend/models/MedicalInvoice');
        
        // Find and update the invoice directly
        const result = await MedicalInvoice.updateOne(
            { invoiceNumber: 'INV-EXT-1756132268415-ibriy' },
            {
                $set: {
                    "items.0.quantity": 6,
                    "items.0.total": 1800,
                    "items.0.description": "Medication Extension - Dexamethasone (+3 days × 2 doses/day = 6 total doses)",
                    "items.0.metadata.dosesPerDay": 2,
                    "items.0.metadata.frequency": "BID (twice daily)",
                    "items.0.metadata.additionalDoses": 6,
                    "items.0.metadata.totalDoses": 6,
                    "subtotal": 1800,
                    "total": 1800,
                    "balance": 1800,
                    "status": "pending"
                }
            }
        );
        
        if (result.matchedCount > 0) {
            console.log('✅ Invoice updated successfully!');
            console.log('📋 Changes made:');
            console.log('   - Quantity: 3 → 6 doses');
            console.log('   - Total: ETB 900 → ETB 1,800');
            console.log('   - Description: Updated to show "3 days × 2 doses/day = 6 total doses"');
            console.log('   - Balance: ETB 900 → ETB 1,800');
        } else {
            console.log('❌ Invoice not found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

quickFixNatan();
