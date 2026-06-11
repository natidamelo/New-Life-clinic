const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    logo: {
      type: String,
      trim: true
    },
    fullName: {
      type: String,
      trim: true
    },
    tagline: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    licenseNumber: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Clinic', clinicSchema);

