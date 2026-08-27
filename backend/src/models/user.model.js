const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  veBalance: {
    type: mongoose.Schema.Types.Decimal128,
    default: mongoose.Types.Decimal128.fromString('0.0')
  },
  sveBalance: {
    type: mongoose.Schema.Types.Decimal128,
    default: mongoose.Types.Decimal128.fromString('0.0')
  },
  tokenBalance: {
    type: mongoose.Schema.Types.Decimal128,
    default: mongoose.Types.Decimal128.fromString('0.0')
  },
  gemBalance: {
    type: mongoose.Schema.Types.Decimal128,
    default: mongoose.Types.Decimal128.fromString('0.0')
  },
  spinBalance: {
    type: Number,
    default: 0
  },
  fragmentBalance: {
    type: mongoose.Schema.Types.Decimal128,
    default: mongoose.Types.Decimal128.fromString('0.0')
  },
  currentTapSeasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TapSeason',
    default: null
  },
  badges: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      unlockedAt: { type: Date, default: Date.now }
    }
  ],
  subscriptionType: {
    type: String,
    enum: ['free', 'weekly', 'monthly', 'yearly'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
