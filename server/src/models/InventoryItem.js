const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicianProfile',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Part/Item name is required'],
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      enum: ['Plumbing', 'HVAC', 'Urgent Delivery', 'General'],
      default: 'Plumbing',
      required: true,
    },
    partCode: {
      type: String,
      required: [true, 'Part code is required'],
      uppercase: true,
      trim: true,
      maxlength: 40,
    },
    quantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative'],
      validate: {
        validator: function (val) {
          // If update doesn't have this.quantity, fall back or check
          const totalQty = this.quantity !== undefined ? this.quantity : this._update?.$set?.quantity;
          if (totalQty !== undefined) {
            return val <= totalQty;
          }
          return true;
        },
        message: 'Reserved quantity cannot exceed total stock quantity',
      },
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    unitCost: {
      type: Number,
      default: 0,
      min: [0, 'Unit cost cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring technician cannot have duplicate part codes
inventoryItemSchema.index({ technician: 1, partCode: 1 }, { unique: true });

// Pre-validate hook for update operations to ensure reservedQuantity <= quantity
inventoryItemSchema.pre(['save', 'findOneAndUpdate', 'updateOne'], function (next) {
  if (this.isModified && this.isModified('reservedQuantity') && this.isModified('quantity')) {
    if (this.reservedQuantity > this.quantity) {
      return next(new Error('Reserved quantity cannot exceed total stock quantity'));
    }
  }
  next();
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

module.exports = InventoryItem;
