const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({}));
    const admin = await User.findOne({role: 'admin'});
    if(admin) {
      admin.permissions = {
        manageUsers: true,
        managePatients: true,
        manageAppointments: true,
        manageBilling: true,
        manageInventory: true,
        generateReports: true,
        viewReports: true
      };
      await admin.save();
      console.log('Admin permissions fixed');
    }
    mongoose.disconnect();
  }); 
