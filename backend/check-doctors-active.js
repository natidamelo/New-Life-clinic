require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const doctors = await User.find({ role: 'doctor' });
  console.log('Doctors details:');
  doctors.forEach(d => console.log(`- ${d.username} | ${d.firstName} ${d.lastName} | isActive: ${d.isActive} | active: ${d.active}`));
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
