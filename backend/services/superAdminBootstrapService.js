const User = require('../models/User');

async function bootstrapSuperAdmin() {
  const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Sup3rAdm!n#2026#N3wL1fe';
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@clinic.local';

  if (!process.env.SUPER_ADMIN_USERNAME || !process.env.SUPER_ADMIN_PASSWORD) {
    console.warn('⚠️ SUPER_ADMIN env vars missing. Using default bootstrap credentials.');
  }

  let superAdmin = await User.findOne({ role: 'super_admin' }).setOptions({ skipTenantScope: true });

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
