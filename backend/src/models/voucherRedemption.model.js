const mongoose = require('mongoose');

const VoucherRedemptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  voucherId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  costVe: {
    type: Number,
    required: true
  },
  valueDisplay: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'shopping'
  },
  redeemedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active'
  }
});

module.exports = mongoose.model('VoucherRedemption', VoucherRedemptionSchema);
