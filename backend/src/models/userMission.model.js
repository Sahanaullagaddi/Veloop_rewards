const mongoose = require('mongoose');

const UserMissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  missionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mission',
    required: true,
    index: true
  },
  progress: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  claimed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  claimedAt: {
    type: Date,
    default: null
  }
});

UserMissionSchema.index({ userId: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model('UserMission', UserMissionSchema);
