const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [-122.4194, 37.7749], // Default San Francisco [lng, lat]
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const serviceAreaSchema = new mongoose.Schema(
  {
    center: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [-122.4194, 37.7749],
      },
    },
    radiusKm: {
      type: Number,
      default: 25,
      min: [1, 'Service radius must be at least 1 km'],
      max: [150, 'Service radius cannot exceed 150 km'],
    },
  },
  { _id: false }
);

const technicianProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    serviceCategories: {
      type: [String],
      enum: ['plumbing', 'hvac', 'delivery'],
      default: ['plumbing'],
    },
    skills: {
      type: [String],
      default: [],
    },
    qualifications: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      default: 1,
      min: 0,
      max: 60,
    },
    serviceArea: {
      type: serviceAreaSchema,
      default: () => ({}),
    },
    currentLocation: {
      type: pointSchema,
      default: () => ({}),
    },
    vehicleType: {
      type: String,
      enum: ['car', 'van', 'motorcycle', 'pickup', 'bicycle', 'none'],
      default: 'none',
    },
    packageCapacityKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '18:00' },
      days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    },
    activeJobCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingSum: {
      type: Number,
      default: 0,
      min: 0,
    },
    reliabilityScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

technicianProfileSchema.pre('save', function (next) {
  // Normalize serviceArea center coordinates to [-180, 180] and [-90, 90]
  if (this.serviceArea?.center?.coordinates?.length === 2) {
    let lng = Number(this.serviceArea.center.coordinates[0]);
    let lat = Number(this.serviceArea.center.coordinates[1]);
    lng = ((lng + 180) % 360 + 360) % 360 - 180;
    lat = Math.max(-90, Math.min(90, lat));
    this.serviceArea.center.coordinates = [lng, lat];
  }
  // Normalize currentLocation coordinates
  if (this.currentLocation?.coordinates?.length === 2) {
    let lng = Number(this.currentLocation.coordinates[0]);
    let lat = Number(this.currentLocation.coordinates[1]);
    lng = ((lng + 180) % 360 + 360) % 360 - 180;
    lat = Math.max(-90, Math.min(90, lat));
    this.currentLocation.coordinates = [lng, lat];
  }
  next();
});

technicianProfileSchema.index({ currentLocation: '2dsphere' });
technicianProfileSchema.index({ 'serviceArea.center': '2dsphere' });
technicianProfileSchema.index({ verificationStatus: 1, isAvailable: 1 });
technicianProfileSchema.index({ serviceCategories: 1 });

const TechnicianProfile = mongoose.model('TechnicianProfile', technicianProfileSchema);

module.exports = TechnicianProfile;
