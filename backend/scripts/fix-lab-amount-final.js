const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');

async function fixLabAmountFinal() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    // Find the lab notification
    const labNotif = await Notification.findOne({
      type: 'lab_payment_required', 
      read: false
    });
    
    if (!labNotif) {
      console.log('❌ No lab notification found');
      return;
    }
    
    console.log('🔍 Found lab notification:', labNotif.data?.amount || 0, 'ETB');
    
    // Check if it has lab order IDs
    if (labNotif.data?.labOrderIds && Array.isArray(labNotif.data.labOrderIds)) {
      let total = 0;
      const testNames = [];
      
      for (const id of labNotif.data.labOrderIds) {
        const order = await LabOrder.findById(id);
        if (order) {
          total += order.totalPrice || 0;
          testNames.push(order.testName);
          console.log(`   ${order.testName}: ${order.totalPrice || 0} ETB`);
        }
      }
      
      console.log(`💰 Total calculated: ${total} ETB`);
      console.log(`🧪 Tests: ${testNames.join(', ')}`);
      
      if (total > 0 && total !== (labNotif.data?.amount || 0)) {
        // Fix the notification
        await Notification.findByIdAndUpdate(labNotif._id, {
          $set: {
            'data.amount': total,
            'data.totalAmount': total,
            'title': `Lab Tests Payment Required - ${total} ETB`,
            'message': `Payment required for lab tests: ${testNames.join(', ')}. Total amount: ${total} ETB.`
          }
        });
        console.log('✅ Fixed lab notification amount to', total, 'ETB');
      } else if (total === (labNotif.data?.amount || 0)) {
        console.log('✅ Lab notification amount is already correct');
      } else {
        console.log('❌ Could not calculate amount from lab orders');
      }
    } else {
      console.log('❌ Lab notification has no lab order IDs');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

fixLabAmountFinal();
