const mongoose = require('mongoose');

const slaWindowSchema = new mongoose.Schema(
  {
    responseMinutes: { type: Number, required: true, min: 1 },
    arrivalMinutes: { type: Number, required: true, min: 1 },
    completionMinutes: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const categorySlaSchema = new mongoose.Schema(
  {
    normal: { type: slaWindowSchema, required: true },
    urgent: { type: slaWindowSchema, required: true },
  },
  { _id: false }
);

const platformSettingsSchema = new mongoose.Schema(
  {
    platformFeePerTicket: {
      type: Number,
      required: true,
      default: 1.5,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    offerExpirySeconds: {
      type: Number,
      required: true,
      default: 60,
      min: 15,
      max: 300,
    },
    maxOfferAttempts: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },
    maxCandidateRadiusKm: {
      type: Number,
      default: 25,
      min: 1,
      max: 200,
    },
    locationStaleMinutes: {
      type: Number,
      default: 10,
      min: 1,
      max: 120,
    },
    sweeperIntervalSeconds: {
      type: Number,
      default: 5,
      min: 2,
      max: 60,
    },
    workloadMaxActiveJobs: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },
    avgSpeedKmh: {
      type: Number,
      default: 30,
      min: 5,
      max: 120,
    },
    dispatchWeights: {
      sla: { type: Number, required: true, default: 30, min: 0, max: 100 },
      location: { type: Number, required: true, default: 25, min: 0, max: 100 },
      skills: { type: Number, required: true, default: 15, min: 0, max: 100 },
      workload: { type: Number, required: true, default: 10, min: 0, max: 100 },
      inventory: { type: Number, required: true, default: 10, min: 0, max: 100 },
      reliability: { type: Number, required: true, default: 10, min: 0, max: 100 },
    },
    slaTargets: {
      plumbing: {
        type: categorySlaSchema,
        default: () => ({
          normal: { responseMinutes: 30, arrivalMinutes: 120, completionMinutes: 240 },
          urgent: { responseMinutes: 10, arrivalMinutes: 45, completionMinutes: 120 },
        }),
      },
      hvac: {
        type: categorySlaSchema,
        default: () => ({
          normal: { responseMinutes: 45, arrivalMinutes: 180, completionMinutes: 360 },
          urgent: { responseMinutes: 15, arrivalMinutes: 60, completionMinutes: 180 },
        }),
      },
      delivery: {
        type: categorySlaSchema,
        default: () => ({
          normal: { responseMinutes: 15, arrivalMinutes: 45, completionMinutes: 90 },
          urgent: { responseMinutes: 5, arrivalMinutes: 20, completionMinutes: 45 },
        }),
      },
    },
    pricingConfig: {
      urgentSurchargePercentage: { type: Number, default: 20, min: 0, max: 100 },
      deliveryPricePerKm: { type: Number, default: 1.5, min: 0 },
    },
    slaMonitoring: {
      atRiskThresholdPercent: { type: Number, default: 80, min: 50, max: 95 },
      sweeperIntervalSeconds: { type: Number, default: 30, min: 5, max: 300 },
    },
    feePayer: {
      type: String,
      enum: ['technician', 'customer', 'split'],
      default: 'technician',
    },
    autoVerificationHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
    },
    cancellationPolicy: {
      type: String,
      enum: ['free_before_start', 'fee_after_quote_reject'],
      default: 'free_before_start',
    },
  },
  {
    timestamps: true,
  }
);

// Validate that dispatchWeights sum to exactly 100
platformSettingsSchema.pre('save', function (next) {
  if (this.dispatchWeights) {
    const { sla, location, skills, workload, inventory, reliability } = this.dispatchWeights;
    const sum = (sla || 0) + (location || 0) + (skills || 0) + (workload || 0) + (inventory || 0) + (reliability || 0);
    if (sum !== 100) {
      return next(new Error(`Dispatch weights must sum to 100 (current sum: ${sum})`));
    }
  }
  next();
});

// Singleton helper to get or create settings
platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

module.exports = PlatformSettings;
