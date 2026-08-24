const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
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
  requirementType: {
    type: String,
    required: true,
    enum: ['total_taps', 'streak', 'combo', 'upgrade_count']
  },
  requirementValue: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Mission', MissionSchema);
