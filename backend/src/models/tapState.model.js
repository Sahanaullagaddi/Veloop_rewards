const mongoose = require('mongoose');

const TapStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  energyCapacityLevel: {
    type: Number,
    default: 1 // Cap upgrades: 1 = 500, 2 = 600, 3 = 700, 4 = 800, 5 = 900, 6 = 1000
  },
  currentEnergy: {
    type: Number,
    default: 500
  },
  lastRegenTime: {
    type: Date,
    default: Date.now
  },
  lastTapTime: {
    type: Date,
    default: () => new Date(0)
  },
  multitapLevel: {
    type: Number,
    default: 1 // physical tap multiplier (e.g. x1, x2, x3)
  },
  multitapExpiry: {
    type: Date,
    default: null
  },
  activeBoostExpiry: {
    type: Date,
    default: null // 30s boost window
  },
  activeShieldExpiry: {
    type: Date,
    default: null // 30s duration
  },
  shieldCooldownExpiry: {
    type: Date,
    default: null // 5-min cooldown
  },
  currentCombo: {
    type: Number,
    default: 0
  },
  comboExpiry: {
    type: Date,
    default: null // 2s window
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  streakExpiry: {
    type: Date,
    default: null // 5s window
  },
  bestStreak: {
    type: Number,
    default: 0
  },
  totalAcceptedTaps: {
    type: Number,
    default: 0
  },
  mysteryTapProgress: {
    type: Number,
    default: 0 // runs up to 250 effective taps
  },
  energyBankLevel: {
    type: Number,
    default: 1 // level 1 = 500 base, 2 = 750, 3 = 1000
  },
  energyBankBalance: {
    type: Number,
    default: 500
  },
  energyBankLastRegen: {
    type: Date,
    default: Date.now // +20/120min
  },
  rechargeSpeedLevel: {
    type: Number,
    default: 1 // speed upgrades (Token-priced): reductions in time or increases in regen amount
  },
  tapEfficiencyLevel: {
    type: Number,
    default: 0 // seasonal upgrades: 0 = 1.0x, 1 = 1.1x, 2 = 1.2x, 3 = 1.3x
  }
});

module.exports = mongoose.model('TapState', TapStateSchema);
