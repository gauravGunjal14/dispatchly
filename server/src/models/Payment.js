const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // Ensures exactly one payment lifecycle record per booking
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicianProfile',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'disputed_hold'],
      default: 'pending',
      index: true,
    },
    gatewayRef: {
      type: String,
      default: '',
    },
    attempts: {
      type: Number,
      default: 1,
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
    ledger: {
      type: [ledgerEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
