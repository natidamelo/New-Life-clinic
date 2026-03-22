const mongoose = require('mongoose');

async function quickFix() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);
    
    const ServiceRequest = mongoose.model('ServiceRequest');
    
    // Update the specific service request you mentioned
    const result = await ServiceRequest.findByIdAndUpdate(
      '68d40ad1dbd09a245ea982f8',
      { 
        status: 'in-progress',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log('✅ Updated service request:', result ? 'Success' : 'Not found');
    
    // Also update any other pending service requests
    const bulkResult = await ServiceRequest.updateMany(
      { status: 'pending' },
      { 
        status: 'in-progress',
        updatedAt: new Date()
      }
    );
    
    console.log(`✅ Updated ${bulkResult.modifiedCount} pending service requests to in-progress`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

quickFix();
