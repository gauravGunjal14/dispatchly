const mongoose = require('mongoose');

const scoreBreakdownSchema = new mongoose.Schema(
  {
    sla: { type: Number, default: 0, min: 0, max: 100 },
    location: { type: Number, default: 0, min: 0, max: 100 },
    skills: { type: Number, default: 0, min: 0, max: 100 },
    workload: { type: Number, default: 0, min: 0, max: 100 },
    inventory: { type: Number, default: 0, min: 0, max: 100 },
    reliability: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const dispatchOfferSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicianProfile',
      required: true,
      index: true,
    },
    attempt: {
      type: Number,
      required: true,
      min: 1,
    },
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
    totalScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    scoreBreakdown: {
      type: scoreBreakdownSchema,
      required: true,
    },
    etaMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    distanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled', 'superseded'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    respondedAt: {
      type: Date,
    },
    rejectReason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// A technician is never offered the same booking twice
dispatchOfferSchema.index({ booking: 1, technician: 1 }, { unique: true });

// Compound index for fast querying of expiring pending offers by the sweeper
dispatchOfferSchema.index({ status: 1, expiresAt: 1 });
dispatchOfferSchema.index({ createdAt: -1, status: 1 });
dispatchOfferSchema.index({ technician: 1, createdAt: -1 });

const DispatchOffer = mongoose.model('DispatchOffer', dispatchOfferSchema);

module.exports = DispatchOffer;
