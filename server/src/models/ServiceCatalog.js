const mongoose = require('mongoose');

const requiredPartSchema = new mongoose.Schema(
  {
    partCode: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const serviceRequirementsSchema = new mongoose.Schema(
  {
    requiredSkills: {
      type: [String],
      default: [],
    },
    requiredParts: {
      type: [requiredPartSchema],
      default: [],
    },
    allowedVehicleTypes: {
      type: [String],
      enum: ['motorcycle', 'car', 'van', 'pickup', 'bicycle', 'none'],
      default: [],
    },
    minPackageCapacityKg: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const serviceCatalogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['plumbing', 'hvac', 'delivery'],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: [true, 'Service code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true,
      maxlength: 1000,
    },
    pricingType: {
      type: String,
      enum: ['fixed', 'range', 'quotation'],
      default: 'fixed',
      required: true,
    },
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    minPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedDurationMin: {
      type: Number,
      default: 60,
      min: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    requirements: {
      type: serviceRequirementsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

serviceCatalogSchema.index({ category: 1, isActive: 1 });

const ServiceCatalog = mongoose.model('ServiceCatalog', serviceCatalogSchema);

module.exports = ServiceCatalog;
