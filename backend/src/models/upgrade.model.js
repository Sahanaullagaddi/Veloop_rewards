const mongoose = require('mongoose');

const UpgradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  upgradeType: {
    type: String,
    required: true,
    enum: ['energy_capacity', 'recharge_speed', 'energy_bank', 'tap_efficiency']
  },
  level: {
    type: Number,
    required: true
  },
  cost: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['VE', 'SVE', 'Token', 'Gem', 'Spin', 'Fragment']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Upgrade', UpgradeSchema);
