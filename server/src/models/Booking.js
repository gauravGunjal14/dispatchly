const mongoose = require('mongoose');
const { BOOKING_STATUSES } = require('../services/booking/stateMachine');

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
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    landmark: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCatalog',
      required: true,
    },
    category: {
      type: String,
      enum: ['plumbing', 'hvac', 'delivery'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal',
      required: true,
      index: true,
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    location: {
      type: pointSchema,
      required: true,
    },
    // Delivery Vertical Details
    pickupLocation: {
      type: pointSchema,
    },
    dropoffLocation: {
      type: pointSchema,
    },
    packageWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    packageDescription: {
      type: String,
      default: '',
      trim: true,
    },
    deliveryDeadline: {
      type: Date,
    },
    // Snapshot of service requirements frozen at booking creation
    requirementSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    pricing: {
      type: {
        type: String,
        default: 'fixed',
      },
      estimatedMin: { type: Number, default: 0 },
      estimatedMax: { type: Number, default: 0 },
      baseAmount: { type: Number, default: 0 },
      distanceKm: { type: Number, default: 0 },
      urgentSurcharge: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      quotationRequired: { type: Boolean, default: false },
    },
    sla: {
      responseDeadline: { type: Date },
      arrivalDeadline: { type: Date },
      completionDeadline: { type: Date },
      state: {
        type: String,
        enum: ['ok', 'at_risk', 'breached'],
        default: 'ok',
        index: true,
      },
      breachedAt: { type: Date, default: null },
      finalResult: {
        response: { type: String, enum: ['met', 'missed', 'pending', 'waived'], default: 'pending' },
        arrival: { type: String, enum: ['met', 'missed', 'pending', 'waived'], default: 'pending' },
        completion: { type: String, enum: ['met', 'missed', 'pending', 'waived'], default: 'pending' },
      },
    },
    eta: {
      minutes: { type: Number, default: null },
      distanceKm: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'searching',
      required: true,
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicianProfile',
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    enRouteAt: {
      type: Date,
      default: null,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: null,
    },
    completion: {
      status: {
        type: String,
        enum: ['not_submitted', 'submitted', 'verified', 'disputed'],
        default: 'not_submitted',
        index: true,
      },
      submittedAt: { type: Date, default: null },
      notes: { type: String, default: '' },
      partsUsed: [
        {
          partCode: { type: String },
          name: { type: String },
          quantity: { type: Number },
          _id: false,
        },
      ],
      finalPrice: { type: Number, default: null },
      evidencePhotos: [
        {
          path: { type: String },
          originalName: { type: String },
          mimeType: { type: String },
          size: { type: Number },
          _id: false,
        },
      ],
      verifiedAt: { type: Date, default: null },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      autoVerified: { type: Boolean, default: false },
    },
    inventorySettled: {
      type: Boolean,
      default: false,
      index: true,
    },
    dispatch: {
      state: {
        type: String,
        enum: ['idle', 'searching', 'awaiting_response', 'assigned', 'exhausted', 'manual'],
        default: 'idle',
        index: true,
      },
      attempts: {
        type: Number,
        default: 0,
      },
      excludedTechnicians: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TechnicianProfile',
        },
      ],
      currentOffer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DispatchOffer',
        default: null,
      },
    },
    dispatchHistory: [
      {
        event: {
          type: String,
          required: true,
        },
        technician: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TechnicianProfile',
          default: null,
        },
        at: {
          type: Date,
          default: Date.now,
        },
        meta: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        _id: false,
      },
    ],
    inventoryReservations: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InventoryItem',
        },
        partCode: {
          type: String,
        },
        quantity: {
          type: Number,
        },
        _id: false,
      },
    ],
    idempotencyKey: {
      type: String,
      required: true,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index on primary location
bookingSchema.index({ location: '2dsphere' });
// Compound unique index ensuring idempotency per customer
bookingSchema.index({ customer: 1, idempotencyKey: 1 }, { unique: true });
// Compound search index
bookingSchema.index({ status: 1, createdAt: -1 });

// Ticket number auto-generation & coordinate wrapping
bookingSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    this.ticketNumber = `BK-${datePrefix}-${randomHex}`;
  }

  const normalizePoint = (pt) => {
    if (pt?.coordinates?.length === 2) {
      let lng = Number(pt.coordinates[0]);
      let lat = Number(pt.coordinates[1]);
      lng = ((lng + 180) % 360 + 360) % 360 - 180;
      lat = Math.max(-90, Math.min(90, lat));
      pt.coordinates = [lng, lat];
    }
  };

  normalizePoint(this.location);
  normalizePoint(this.pickupLocation);
  normalizePoint(this.dropoffLocation);

  next();
});

bookingSchema.index({ createdAt: -1, category: 1, status: 1 });
bookingSchema.index({ assignedTechnician: 1, createdAt: -1 });
bookingSchema.index({ 'sla.status': 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
