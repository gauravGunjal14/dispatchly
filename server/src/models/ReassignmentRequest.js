const mongoose = require('mongoose');

const reassignmentRequestSchema = new mongoose.Schema(
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
    reason: {
      type: String,
      required: [true, 'Reason for reassignment request is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
      index: true,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    decisionNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

reassignmentRequestSchema.index({ status: 1, createdAt: -1 });

const ReassignmentRequest = mongoose.model('ReassignmentRequest', reassignmentRequestSchema);

module.exports = ReassignmentRequest;
