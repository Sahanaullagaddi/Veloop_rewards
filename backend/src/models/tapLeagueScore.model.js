const mongoose = require('mongoose');

const TapLeagueScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TapSeason',
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Unique index per user per season
TapLeagueScoreSchema.index({ userId: 1, seasonId: 1 }, { unique: true });

// Index for fetching leaderboard: sorted by score descending, then by lastUpdated ascending (deterministic tie-breaker)
TapLeagueScoreSchema.index({ seasonId: 1, score: -1, lastUpdated: 1 });

module.exports = mongoose.model('TapLeagueScore', TapLeagueScoreSchema);
