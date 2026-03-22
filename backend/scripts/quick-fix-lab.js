const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');

async function quickFixLab() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    // Find lab notification
    const labNotif = await Notification.findOne({type: 'lab_payment_required', read: false});
    
    if (!labNotif) {
      console.log('❌ No lab notification found');
      return;
    }
    
    console.log('🔍 Found lab notification:', labNotif.data?.amount || 0, 'ETB');
    
    // Check lab orders
    if (labNotif.data?.labOrderIds) {
      let total = 0;
      for (const id of labNotif.data.labOrderIds) {
        const order = await LabOrder.findById(id);
        if (order) {
          total += order.totalPrice || 0;
          console.log(`   ${order.testName}: ${order.totalPrice || 0} ETB`);
        }
      }
      
      console.log(`💰 Total calculated: ${total} ETB`);
      
      if (total > 0 && total !== (labNotif.data?.amount || 0)) {
        // Fix the notification
        await Notification.findByIdAndUpdate(labNotif._id, {
          $set: {
            'data.amount': total,
            'data.totalAmount': total,
            'title': `Lab Tests Payment Required - ${total} ETB`,
            'message': `Payment required for lab tests. Total amount: ${total} ETB.`
          }
        });
        console.log('✅ Fixed lab notification amount');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

quickFixLab();
