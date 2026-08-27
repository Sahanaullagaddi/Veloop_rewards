const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Referral = require('../models/referral.model');
const RewardLedger = require('../models/rewardLedger.model');
const auth = require('../middleware/auth');
const { getIO } = require('../config/socket');

function toDecimal128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(6));
}

// 1. GET /api/referrals - Get list of referees and reward eligibility
router.get('/', auth, async (req, res) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user.id })
      .populate('refereeId', 'username level createdAt')
      .sort({ createdAt: -1 });

    const formattedReferrals = referrals.map(ref => {
      if (!ref.refereeId) return null;
      const referee = ref.refereeId;
      // Eligible for claim if referee is level >= 3 and reward hasn't been claimed yet
      const isEligible = referee.level >= 3 && !ref.rewardClaimed;

      return {
        id: ref._id,
        username: referee.username,
        level: referee.level,
        joinedAt: referee.createdAt,
        rewardClaimed: ref.rewardClaimed,
        isEligible
      };
    }).filter(Boolean);

    res.json({ success: true, referrals: formattedReferrals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving referrals' });
  }
});

// 2. POST /api/referrals/claim/:id - Claim reward (+500 VE) for Level 3 referral
router.post('/claim/:id', auth, async (req, res) => {
  const referralId = req.params.id;
  try {
    const referral = await Referral.findOne({ _id: referralId, referrerId: req.user.id });
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral connection not found' });
    }

    if (referral.rewardClaimed) {
      return res.status(400).json({ success: false, message: 'Reward already claimed for this referral' });
    }

    // Resolve referee level
    const referee = await User.findById(referral.refereeId);
    if (!referee) {
      return res.status(404).json({ success: false, message: 'Referred user not found' });
    }

    if (referee.level < 3) {
      return res.status(400).json({ success: false, message: 'Referred user must be at least Level 3 to claim reward' });
    }

    // Mark claimed
    referral.rewardClaimed = true;
    await referral.save();

    // Credit reward atomically to referrer (+500 VE)
    const rewardAmount = 500;
    const referrer = await User.findOneAndUpdate(
      { _id: req.user.id },
      { $inc: { veBalance: toDecimal128(rewardAmount) } },
      { new: true }
    );

    // Write to ledger
    const requestId = `refclaim-${referralId}`;
    await RewardLedger.create({
      userId: req.user.id,
      requestId,
      type: 'mission_claim', // utilizing ledger claim type
      amount: toDecimal128(rewardAmount),
      currency: 'VE',
      timestamp: new Date(),
      details: { refereeUsername: referee.username }
    });

    // Emit liveState socket update
    const io = getIO();
    if (io) {
      io.to(req.user.id.toString()).emit('stateUpdate', {
        veBalance: referrer.veBalance.toString(),
        sveBalance: referrer.sveBalance.toString(),
        tokenBalance: referrer.tokenBalance.toString(),
        gemBalance: referrer.gemBalance.toString(),
        spinBalance: referrer.spinBalance
      });
    }

    res.json({
      success: true,
      message: `Successfully claimed +${rewardAmount} VE for inviting ${referee.username}!`,
      userBalances: {
        veBalance: referrer.veBalance.toString(),
        sveBalance: referrer.sveBalance.toString(),
        tokenBalance: referrer.tokenBalance.toString(),
        gemBalance: referrer.gemBalance.toString(),
        spinBalance: referrer.spinBalance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error claiming referral reward' });
  }
});

module.exports = router;
