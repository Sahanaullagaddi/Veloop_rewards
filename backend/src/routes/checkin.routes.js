const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const RewardLedger = require('../models/rewardLedger.model');
const auth = require('../middleware/auth');
const { getIO } = require('../config/socket');

function toDecimal128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(6));
}

const CHECKIN_REWARDS = [
  { day: 1, type: 'VE', amount: 10 },
  { day: 2, type: 'VE', amount: 20 },
  { day: 3, type: 'VE', amount: 50 },
  { day: 4, type: 'SVE', amount: 5 },
  { day: 5, type: 'Token', amount: 100 },
  { day: 6, type: 'Gem', amount: 5 },
  { day: 7, type: 'Token', amount: 1000 }
];

// 1. GET /api/checkin/status - Get user check-in streak and eligibility
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    let eligible = true;
    let consecutive = user.consecutiveCheckins || 0;

    if (user.lastCheckinDate) {
      const last = new Date(user.lastCheckinDate);
      const isSameDay = last.getFullYear() === now.getFullYear() &&
                        last.getMonth() === now.getMonth() &&
                        last.getDate() === now.getDate();

      if (isSameDay) {
        eligible = false;
      } else {
        // Check if they missed a day (difference > 1 day)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const wasYesterday = last.getFullYear() === yesterday.getFullYear() &&
                             last.getMonth() === yesterday.getMonth() &&
                             last.getDate() === yesterday.getDate();

        if (!wasYesterday) {
          // Reset streak if last check-in was not yesterday
          consecutive = 0;
        }
      }
    }

    res.json({
      success: true,
      eligible,
      consecutiveCheckins: consecutive,
      lastCheckinDate: user.lastCheckinDate,
      rewards: CHECKIN_REWARDS
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving check-in status' });
  }
});

// 2. POST /api/checkin/claim - Claim daily check-in reward
router.post('/claim', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    let consecutive = user.consecutiveCheckins || 0;

    if (user.lastCheckinDate) {
      const last = new Date(user.lastCheckinDate);
      const isSameDay = last.getFullYear() === now.getFullYear() &&
                        last.getMonth() === now.getMonth() &&
                        last.getDate() === now.getDate();

      if (isSameDay) {
        return res.status(400).json({ success: false, message: 'You have already checked in today.' });
      }

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = last.getFullYear() === yesterday.getFullYear() &&
                           last.getMonth() === yesterday.getMonth() &&
                           last.getDate() === yesterday.getDate();

      if (wasYesterday) {
        consecutive = (consecutive % 7) + 1; // cycle 1-7
      } else {
        consecutive = 1; // Reset to day 1
      }
    } else {
      consecutive = 1; // First checkin ever
    }

    const currentReward = CHECKIN_REWARDS.find(r => r.day === consecutive);
    if (!currentReward) return res.status(500).json({ success: false, message: 'Reward mapping error' });

    // Determine balance field
    let balanceField = '';
    switch (currentReward.type) {
      case 'VE': balanceField = 'veBalance'; break;
      case 'SVE': balanceField = 'sveBalance'; break;
      case 'Token': balanceField = 'tokenBalance'; break;
      case 'Gem': balanceField = 'gemBalance'; break;
    }

    // Atomically increment balance and set streak/date
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id },
      { 
        $inc: { [balanceField]: toDecimal128(currentReward.amount) },
        $set: { 
          consecutiveCheckins: consecutive,
          lastCheckinDate: now
        }
      },
      { new: true }
    );

    // Save entry in RewardLedger
    const requestId = `checkin-${consecutive}-${now.getFullYear()}${now.getMonth()}${now.getDate()}-${req.user.id}`;
    await RewardLedger.create({
      userId: req.user.id,
      requestId,
      type: 'daily_challenge_claim', // utilizing ledger claim type
      amount: toDecimal128(currentReward.amount),
      currency: currentReward.type,
      timestamp: now,
      details: { checkinDay: consecutive }
    });

    // Emit liveState socket update
    const io = getIO();
    if (io) {
      io.to(req.user.id.toString()).emit('stateUpdate', {
        veBalance: updatedUser.veBalance.toString(),
        sveBalance: updatedUser.sveBalance.toString(),
        tokenBalance: updatedUser.tokenBalance.toString(),
        gemBalance: updatedUser.gemBalance.toString(),
        spinBalance: updatedUser.spinBalance
      });
    }

    res.json({
      success: true,
      message: `Checked in successfully for Day ${consecutive}! Earned +${currentReward.amount} ${currentReward.type}.`,
      reward: currentReward,
      consecutiveCheckins: consecutive,
      userBalances: {
        veBalance: updatedUser.veBalance.toString(),
        sveBalance: updatedUser.sveBalance.toString(),
        tokenBalance: updatedUser.tokenBalance.toString(),
        gemBalance: updatedUser.gemBalance.toString(),
        spinBalance: updatedUser.spinBalance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error processing daily check-in' });
  }
});

module.exports = router;
