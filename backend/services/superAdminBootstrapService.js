const User = require('../models/User');

async function bootstrapSuperAdmin() {
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@clinic.local';

  if (!username || !password) {
    console.log('ℹ️ SUPER_ADMIN bootstrap skipped (SUPER_ADMIN_USERNAME/PASSWORD not set)');
    return;
  }

  let superAdmin = await User.findOne({ role: 'super_admin' });

  if (!superAdmin) {
    superAdmin = new User({
      clinicId: 'global',
      username,
      email,
      password,
      role: 'super_admin',
      firstName: 'Super',
      lastName: 'Admin',
      department: 'System',
      isActive: true
    });
    await superAdmin.save();
    console.log(`✅ Super admin created: ${username}`);
    return;
  }

  let shouldSave = false;
  if (superAdmin.username !== username) {
    superAdmin.username = username;
    shouldSave = true;
  }
  if (superAdmin.email !== email) {
    superAdmin.email = email;
    shouldSave = true;
  }
  // Always rotate password from env when provided.
  superAdmin.password = password;
  shouldSave = true;

  if (shouldSave) {
    await superAdmin.save();
    console.log(`✅ Super admin updated: ${username}`);
  }
}

module.exports = {
  bootstrapSuperAdmin
};
