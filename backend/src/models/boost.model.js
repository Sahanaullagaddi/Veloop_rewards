const mongoose = require('mongoose');

const BoostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  boostType: {
    type: String,
    required: true,
    enum: ['active_boost', 'energy_shield']
  },
  activatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Boost', BoostSchema);
