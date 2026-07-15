const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'reception', 'nurse', 'lab', 'imaging', 'doctor', 'billing', 'inventory', 'finance', 'pharmacy', 'mch', 'patient'],
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'General'
  },
  specialization: {
    type: String,
    required: function() {
      return this.role === 'doctor';
    }
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },
  permissions: {
    manageUsers: { type: Boolean, default: false },
    managePatients: { type: Boolean, default: false },
    manageAppointments: { type: Boolean, default: false },
    manageBilling: { type: Boolean, default: false },
    manageInventory: { type: Boolean, default: false },
    generateReports: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false },
    deleteMessages: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  attendanceOverlayEnabled: {
    type: Boolean,
    default: true // Default to requiring attendance overlay
  },
  photo: {
    type: String, // URL to the photo
    default: null,
    select: false
  },
  digitalSignature: {
    type: String, // Base64 encoded signature image
    default: null,
    select: false
  },
  workingHours: {
    enabled: { type: Boolean, default: false },
    days: [{ type: String }], // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    startTime: { type: String, default: '09:00' }, // HH:mm format
    endTime: { type: String, default: '17:00' } // HH:mm format
  },
  // Telegram notification settings (for all staff)
  telegramChatId: {
    type: String,
    trim: true,
    sparse: true // Allow multiple null values for unique constraint
  },
  telegramNotificationsEnabled: {
    type: Boolean,
    default: false
  },
  telegramUsername: {
    type: String,
    trim: true
  },
  // Detailed notification preferences for different types
  notificationPreferences: {
    patientAssignments: { type: Boolean, default: true },
    vitalsUpdates: { type: Boolean, default: true },
    labOrders: { type: Boolean, default: true },
    imagingRequests: { type: Boolean, default: true },
    procedures: { type: Boolean, default: true },
    medicationOrders: { type: Boolean, default: true },
    emergencyAlerts: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: false },
    billingUpdates: { type: Boolean, default: true },
    dailyRevenue: { type: Boolean, default: true },
    paymentAlerts: { type: Boolean, default: true },
    attendanceUpdates: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Index for telegram chat ID (unique when present)
userSchema.index({ telegramChatId: 1 }, { unique: true, sparse: true });

// Set default permissions based on role
userSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = {
          manageUsers: true,
          managePatients: true,
          manageAppointments: true,
          manageBilling: true,
          manageInventory: true,
          generateReports: true,
          viewReports: true,
          deleteMessages: true
        };
        break;
      case 'super_admin':
        this.permissions = {
          manageUsers: true,
          managePatients: true,
          manageAppointments: true,
          manageBilling: true,
          manageInventory: true,
          generateReports: true,
          viewReports: true,
          deleteMessages: true
        };
        break;
      case 'doctor':
        this.permissions = {
          managePatients: true,
          manageAppointments: true,
          viewReports: true
        };
        break;
      case 'billing':
        this.permissions.manageBilling = true;
        this.permissions.viewReports = true;
        break;
      case 'inventory':
        this.permissions.manageInventory = true;
        this.permissions.viewReports = true;
        break;
      case 'reception':
        this.permissions.managePatients = true;
        this.permissions.manageAppointments = true;
        break;
      case 'mch':
        this.permissions = {
          managePatients: true,
          manageAppointments: true,
          viewReports: true
        };
        break;
      case 'patient':
        this.permissions = {
          manageUsers: false,
          managePatients: false,
          manageAppointments: false,
          manageBilling: false,
          manageInventory: false,
          generateReports: false,
          viewReports: false,
          deleteMessages: false
        };
        break;
      // Other roles can have their default permissions set similarly
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email, username, or display name (case-insensitive)
userSchema.statics.findByEmailOrUsername = async function(identifier, clinicId = 'default') {
  if (!identifier || typeof identifier !== 'string') return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const emailOrUsernameFilter = [
    { email: new RegExp('^' + escaped + '$', 'i') },
    { username: new RegExp('^' + escaped + '$', 'i') }
  ];

  // 1) Try exact username/email inside the requested clinic first
  const inClinic = await this.findOne({
    clinicId,
    $or: emailOrUsernameFilter
  }).setOptions({ skipTenantScope: true });
  if (inClinic) return inClinic;

  // 2) Try exact username/email cross-clinic (across all clinics)
  const crossClinic = await this.findOne({
    $or: emailOrUsernameFilter
  }).setOptions({ skipTenantScope: true });
  if (crossClinic) return crossClinic;

  // 3) Try to look up patient by Card ID (patientId) or Phone Number (contactNumber)
  try {
    const Patient = require('./Patient');
    const patientRecord = await Patient.findOne({
      $or: [
        { patientId: new RegExp('^' + escaped + '$', 'i') },
        { contactNumber: trimmed }
      ]
    }).setOptions({ skipTenantScope: true });

    if (patientRecord) {
      const patientUser = await this.findOne({
        patient: patientRecord._id
      }).setOptions({ skipTenantScope: true });
      if (patientUser) return patientUser;
    }
  } catch (err) {
    console.error('Error looking up patient user by card/phone:', err);
  }

  // 4) Display name ("DR Natan" → "Natan") inside the requested clinic
  const namePart = trimmed.replace(/^dr\.?\s*/i, '').trim();
  if (namePart) {
    const nameEscaped = namePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const byName = await this.findOne({
      clinicId,
      $or: [
        { firstName: new RegExp('^' + nameEscaped + '$', 'i') },
        { lastName: new RegExp('^' + nameEscaped + '$', 'i') }
      ]
    }).setOptions({ skipTenantScope: true });
    if (byName) return byName;

    // 5) Fallback: Display name ("DR Natan" → "Natan") cross-clinic
    const byNameCross = await this.findOne({
      $or: [
        { firstName: new RegExp('^' + nameEscaped + '$', 'i') },
        { lastName: new RegExp('^' + nameEscaped + '$', 'i') }
      ]
    }).setOptions({ skipTenantScope: true });
    if (byNameCross) return byNameCross;
  }

  return null;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
