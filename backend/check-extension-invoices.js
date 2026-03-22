// Check Extension Invoices in Database
// Run this to see what extension invoices exist

const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');

async function checkExtensionInvoices() {
    try {
        console.log('🔍 === CHECKING EXTENSION INVOICES IN DATABASE ===');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/clinic-cms', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
        
        // Find all extension invoices
        const extensionInvoices = await MedicalInvoice.find({ isExtension: true })
            .sort({ createdAt: -1 });
        
        console.log(`📊 Found ${extensionInvoices.length} extension invoices in database`);
        
        if (extensionInvoices.length > 0) {
            console.log('🔍 Extension invoices:');
            extensionInvoices.forEach((invoice, index) => {
                console.log(`${index + 1}. ${invoice.invoiceNumber} - ${invoice.patientName || 'Unknown Patient'} - ETB ${invoice.total} - ${invoice.status}`);
                console.log(`   Patient ID: ${invoice.patient}`);
                console.log(`   Created: ${invoice.createdAt}`);
                console.log(`   Items: ${invoice.items?.length || 0}`);
                if (invoice.items && invoice.items.length > 0) {
                    console.log(`   First item: ${invoice.items[0].description}`);
                }
                console.log('---');
            });
        } else {
            console.log('❌ No extension invoices found with isExtension: true');
            
            // Check if there are invoices that might be extensions but don't have the flag
            const allInvoices = await MedicalInvoice.find({})
                .sort({ createdAt: -1 })
                .limit(10);
            
            console.log('🔍 Checking recent invoices for potential extensions:');
            allInvoices.forEach((invoice, index) => {
                console.log(`${index + 1}. ${invoice.invoiceNumber} - ${invoice.patientName || 'Unknown'} - ETB ${invoice.total} - ${invoice.status}`);
                console.log(`   Type: ${invoice.type || 'N/A'}`);
                console.log(`   Description: ${invoice.items?.[0]?.description || 'N/A'}`);
                console.log(`   Created: ${invoice.createdAt}`);
                console.log('---');
            });
        }
        
    } catch (error) {
        console.error('❌ Check failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the check
checkExtensionInvoices();
