const mongoose = require('mongoose');

// Direct database connection and update
const mongoUri = 'mongodb://localhost:27017/clinic-cms';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Define the schema inline to avoid model loading issues
    const serviceRequestSchema = new mongoose.Schema({}, { strict: false });
    const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
    
    const imagingOrderSchema = new mongoose.Schema({}, { strict: false });
    const ImagingOrder = mongoose.model('ImagingOrder', imagingOrderSchema);
    
    // Update specific service request
    const specificUpdate = await ServiceRequest.findByIdAndUpdate(
      '68d40ad1dbd09a245ea982f8',
      { 
        status: 'in-progress',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log('Specific update result:', specificUpdate ? 'Updated' : 'Not found');
    
    // Update all pending service requests
    const bulkUpdate = await ServiceRequest.updateMany(
      { status: 'pending' },
      { 
        status: 'in-progress',
        updatedAt: new Date()
      }
    );
    
    console.log(`Bulk update: ${bulkUpdate.modifiedCount} service requests updated`);
    
    // Check current service requests
    const allServiceRequests = await ServiceRequest.find({}).limit(5);
    console.log('Sample service requests:');
    allServiceRequests.forEach(sr => {
      console.log(`- ${sr._id}: ${sr.status}`);
    });
    
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
