const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicianProfile',
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // Guarantees zero duplicate payout records under concurrent processing
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    feeDeducted: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'paid',
      index: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

payoutSchema.index({ technician: 1, createdAt: -1 });

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
