const mongoose = require('mongoose');

const SpinSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  rewardType: {
    type: String,
    required: true,
    enum: ['VE', 'SVE', 'Token', 'Gem', 'Spin', 'Fragment']
  },
  rewardAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Spin', SpinSchema);
