const mongoose = require('mongoose');
const Service = require('./models/Service');

async function testServices() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    console.log('\n=== Active Services ===');
    services.forEach(service => {
      console.log(`- ${service.name} (${service.category}): $${service.price}`);
    });
    
    const checkUpServices = services.filter(service => 
      service.name.toLowerCase().includes('check') || 
      service.category.toLowerCase().includes('check')
    );
    
    console.log('\n=== Check Up Services ===');
    if (checkUpServices.length > 0) {
      checkUpServices.forEach(service => {
        console.log(`Found: ${service.name} (${service.category}): $${service.price}`);
      });
    } else {
      console.log('No check up services found');
    }
    
    // Test the exact matching logic
    const appointmentType = 'checkup';
    console.log(`\n=== Testing matching for appointment type: ${appointmentType} ===`);
    
    const matchingService = services.find((service) => {
      const serviceName = service.name.toLowerCase();
      const serviceCategory = service.category.toLowerCase();
      const appointmentTypeLower = appointmentType.toLowerCase();
      
      return serviceName.includes(appointmentTypeLower) ||
             appointmentTypeLower.includes(serviceName) ||
             serviceCategory.includes(appointmentTypeLower) ||
             appointmentTypeLower.includes(serviceCategory);
    });
    
    if (matchingService) {
      console.log(`✅ Found matching service: ${matchingService.name} - $${matchingService.price}`);
    } else {
      console.log('❌ No matching service found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testServices();
