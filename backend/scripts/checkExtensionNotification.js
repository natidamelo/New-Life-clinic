/**
 * Check Extension Notification Script
 * 
 * This script checks if the medication extension notification was created
 * and displays its details for debugging.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Prescription = require('../models/Prescription');

async function checkExtensionNotification() {
    try {
        console.log('🔍 Checking for medication extension notifications...');
        
        // Find all medication payment notifications
        const medicationNotifications = await Notification.find({
            type: 'medication_payment_required'
        }).sort({ timestamp: -1 });
        
        console.log(`🔍 Found ${medicationNotifications.length} medication payment notifications`);
        
        if (medicationNotifications.length === 0) {
            console.log('❌ No medication payment notifications found');
            return;
        }
        
        // Display details for each notification
        medicationNotifications.forEach((notification, index) => {
            console.log(`\n📋 Notification ${index + 1}:`);
            console.log(`   ID: ${notification._id}`);
            console.log(`   Type: ${notification.type}`);
            console.log(`   Title: ${notification.title}`);
            console.log(`   Message: ${notification.message}`);
            console.log(`   Recipient Role: ${notification.recipientRole}`);
            console.log(`   Read: ${notification.read}`);
            console.log(`   Timestamp: ${notification.timestamp}`);
            
            if (notification.data) {
                console.log(`   Patient Name: ${notification.data.patientName}`);
                console.log(`   Patient ID: ${notification.data.patientId}`);
                console.log(`   Prescription ID: ${notification.data.prescriptionId}`);
                console.log(`   Amount: ${notification.data.amount}`);
                console.log(`   Total Amount: ${notification.data.totalAmount}`);
                console.log(`   Is Extension: ${notification.data.isExtension}`);
                console.log(`   Extension Cost: ${notification.data.extensionCost}`);
                console.log(`   Additional Days: ${notification.data.additionalDays}`);
                console.log(`   Additional Doses: ${notification.data.additionalDoses}`);
                console.log(`   Frequency: ${notification.data.frequency}`);
            }
        });
        
        // Check for recent prescriptions with extensions
        console.log('\n🔍 Checking for recent prescriptions with extensions...');
        const recentPrescriptions = await Prescription.find({
            'extensionDetails.additionalDays': { $exists: true, $gt: 0 }
        }).sort({ updatedAt: -1 }).limit(5);
        
        console.log(`🔍 Found ${recentPrescriptions.length} prescriptions with extensions`);
        
        recentPrescriptions.forEach((prescription, index) => {
            console.log(`\n💊 Prescription ${index + 1}:`);
            console.log(`   ID: ${prescription._id}`);
            console.log(`   Medication: ${prescription.medicationName}`);
            console.log(`   Patient: ${prescription.patient}`);
            console.log(`   Status: ${prescription.status}`);
            console.log(`   Duration: ${prescription.duration}`);
            console.log(`   Extension Details:`, prescription.extensionDetails);
        });
        
    } catch (error) {
        console.error('❌ Error checking extension notifications:', error);
    }
}

// Run the check if this script is executed directly
if (require.main === module) {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('✅ Connected to MongoDB');
            return checkExtensionNotification();
        })
        .then(() => {
            console.log('✅ Check completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = { checkExtensionNotification };
