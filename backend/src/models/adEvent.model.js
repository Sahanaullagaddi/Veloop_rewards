const mongoose = require('mongoose');

const AdEventSchema = new mongoose.Schema({
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
  adType: {
    type: String,
    required: true,
    enum: ['interstitial', 'video', 'banner']
  },
  status: {
    type: String,
    required: true,
    enum: ['requested', 'completed', 'failed']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdEvent', AdEventSchema);
