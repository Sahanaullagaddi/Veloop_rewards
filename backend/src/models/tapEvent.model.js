const mongoose = require('mongoose');

const TapEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TapSeason',
    required: true,
    index: true
  },
  requestId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  physicalTaps: {
    type: Number,
    required: true
  },
  effectiveTaps: {
    type: Number,
    required: true
  },
  energyConsumed: {
    type: Number,
    required: true
  },
  rewardType: {
    type: String,
    required: true // 'SVE', 'VE', 'Spin', 'Gem', 'Token'
  },
  rewardAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  isMystery: {
    type: Boolean,
    default: false
  },
  isLucky: {
    type: Boolean,
    default: false
  }
});

// Index for query performance by user/season and time
TapEventSchema.index({ userId: 1, timestamp: -1 });
TapEventSchema.index({ seasonId: 1, timestamp: -1 });
TapEventSchema.index({ userId: 1, requestId: 1 }, { unique: true });

module.exports = mongoose.model('TapEvent', TapEventSchema);
