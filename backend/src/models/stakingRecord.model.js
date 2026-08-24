const mongoose = require('mongoose');

const stakingRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  principalAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  lockPeriodDays: {
    type: Number,
    enum: [3, 7, 30],
    required: true
  },
  apyRate: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  unlockDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'claimed', 'early_withdrawn'],
    default: 'active'
  },
  earnedInterest: {
    type: mongoose.Schema.Types.Decimal128,
    default: '0.000000'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StakingRecord', stakingRecordSchema);
