/**
 * Cleanup Invalid Extensions Script
 * 
 * This script removes invalid extensions from prescriptions that have
 * days: 0 or invalid frequency data.
 */

const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');

async function cleanupInvalidExtensions() {
    try {
        console.log('🔧 Starting cleanup of invalid extensions...');
        
        // Find all prescriptions with invalid extensions
        const prescriptions = await Prescription.find({
            'extensionDetails.multipleExtensions': { $exists: true, $ne: [] }
        });
        
        console.log(`🔍 Found ${prescriptions.length} prescriptions with multiple extensions`);
        
        let totalCleaned = 0;
        let totalInvalid = 0;
        
        for (const prescription of prescriptions) {
            const extensions = prescription.extensionDetails.multipleExtensions || [];
            const validExtensions = extensions.filter(ext => 
                ext.days && ext.days > 0 && ext.frequency
            );
            
            if (validExtensions.length < extensions.length) {
                const invalidCount = extensions.length - validExtensions.length;
                totalInvalid += invalidCount;
                
                console.log(`🔧 Prescription ${prescription._id}: Found ${invalidCount} invalid extensions`);
                console.log(`   - Invalid extensions:`, extensions.filter(ext => 
                    !ext.days || ext.days <= 0 || !ext.frequency
                ));
                
                // Update the prescription with only valid extensions
                await Prescription.findByIdAndUpdate(prescription._id, {
                    $set: {
                        'extensionDetails.multipleExtensions': validExtensions
                    }
                });
                
                totalCleaned++;
                console.log(`✅ Cleaned up prescription ${prescription._id}`);
            }
        }
        
        console.log(`\n🎉 Cleanup completed!`);
        console.log(`   - Total prescriptions processed: ${prescriptions.length}`);
        console.log(`   - Prescriptions cleaned: ${totalCleaned}`);
        console.log(`   - Total invalid extensions removed: ${totalInvalid}`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('✅ Connected to MongoDB');
            return cleanupInvalidExtensions();
        })
        .then(() => {
            console.log('✅ Cleanup completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = { cleanupInvalidExtensions };
