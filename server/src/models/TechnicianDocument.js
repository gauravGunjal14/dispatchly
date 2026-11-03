const mongoose = require('mongoose');

const technicianDocumentSchema = new mongoose.Schema(
  {
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicianProfile',
      required: true,
      index: true,
    },
    docType: {
      type: String,
      enum: ['id_proof', 'trade_license', 'insurance', 'vehicle_registration', 'certification', 'other'],
      default: 'id_proof',
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

technicianDocumentSchema.index({ technician: 1, docType: 1 });

const TechnicianDocument = mongoose.model('TechnicianDocument', technicianDocumentSchema);

module.exports = TechnicianDocument;
