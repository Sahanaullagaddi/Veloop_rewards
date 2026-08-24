const mongoose = require('mongoose');

const RewardLedgerSchema = new mongoose.Schema({
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
  type: {
    type: String,
    required: true,
    index: true // 'tap', 'spin', 'upgrade_purchase', 'mission_claim', 'daily_challenge_claim', 'shield_purchase', 'energy_bank_purchase', 'season_reward', 'convert_fragments'
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['VE', 'SVE', 'Token', 'Gem', 'Spin', 'Fragment'],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  }
});

module.exports = mongoose.model('RewardLedger', RewardLedgerSchema);
