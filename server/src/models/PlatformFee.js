const mongoose = require('mongoose');

const platformFeeSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // Guarantees zero duplicate fee records under concurrent processing
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
    feePayer: {
      type: String,
      enum: ['technician', 'customer', 'split'],
      required: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

platformFeeSchema.index({ capturedAt: -1 });

const PlatformFee = mongoose.model('PlatformFee', platformFeeSchema);

module.exports = PlatformFee;
