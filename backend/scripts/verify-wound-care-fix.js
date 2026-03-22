#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MedicalInvoice = require('../models/MedicalInvoice');

async function verifyWoundCareFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic');
    console.log('✅ Connected to MongoDB');
    
    const invoiceId = '68bd5fcec5b9981ebb2d0aa4';
    console.log(`\n🔍 Verifying new wound care invoice: ${invoiceId}`);
    
    const invoice = await MedicalInvoice.findById(invoiceId);
    
    if (invoice) {
      console.log('\n📋 Invoice Verification:');
      console.log(`   ✅ Invoice ID: ${invoice._id}`);
      console.log(`   ✅ Patient: ${invoice.patientName}`);
      console.log(`   ✅ Total: ${invoice.total} ETB`);
      console.log(`   ✅ Balance: ${invoice.balance} ETB`);
      console.log(`   ✅ Status: ${invoice.status}`);
      console.log(`   ✅ Invoice Number: ${invoice.invoiceNumber}`);
      
      console.log('\n📦 Service Details:');
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.description}`);
          console.log(`      - Price: ${item.unitPrice} ETB`);
          console.log(`      - Total: ${item.total} ETB`);
          console.log(`      - Type: ${item.itemType}`);
        });
      }
      
      if (invoice.total > 0) {
        console.log('\n🎉 SUCCESS: Wound care invoice has proper amount!');
        console.log(`   New payment URL: http://localhost:5175/billing/process-payment/${invoice._id}`);
        console.log('   The payment page should now show 150 ETB instead of ETB 0.00');
      } else {
        console.log('\n❌ ISSUE: Invoice still shows zero amount');
      }
      
    } else {
      console.log('❌ Invoice not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

verifyWoundCareFix();
