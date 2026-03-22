const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Update staff members with correct departments
    const updates = [
      {
        email: 'doctor.test@clinic.com',
        department: 'General'
      },
      {
        email: 'nurse.test@clinic.com',
        department: 'Nursing'
      },
      {
        email: 'reception.test@clinic.com',
        department: 'Reception'
      },
      {
        email: 'lab.test@clinic.com',
        department: 'Laboratory'
      },
      {
        email: 'imaging.test@clinic.com',
        department: 'Imaging'
      }
    ];
    
    console.log('Updating staff departments...');
    
    for (const update of updates) {
      try {
        const user = await User.findOneAndUpdate(
          { email: update.email },
          { department: update.department },
          { new: true }
        );
        
        if (user) {
          console.log(`✅ Updated: ${user.firstName} ${user.lastName} -> ${update.department}`);
        } else {
          console.log(`❌ User not found: ${update.email}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${update.email}:`, error.message);
      }
    }
    
    console.log('\nDepartment updates completed!');
    
    // Verify the updates
    const staff = await User.find({ 
      role: { $in: ['doctor', 'nurse', 'lab', 'imaging', 'reception'] } 
    }).select('firstName lastName email role department');
    
    console.log('\nUpdated staff members:');
    console.log('======================');
    staff.forEach((s, index) => {
      console.log(`${index + 1}. ${s.firstName} ${s.lastName}`);
      console.log(`   Role: ${s.role}`);
      console.log(`   Department: ${s.department}`);
      console.log(`   Email: ${s.email}`);
      console.log('');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
