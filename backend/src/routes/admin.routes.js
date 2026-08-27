const express = require('express');
const router = express.Router();
const TapEconomyConfig = require('../models/tapEconomyConfig.model');
const ConfigAudit = require('../models/configAudit.model');
const TapEvent = require('../models/tapEvent.model');
const RewardLedger = require('../models/rewardLedger.model');
const User = require('../models/user.model');
const TapState = require('../models/tapState.model');
const auth = require('../middleware/auth');
const ConfigService = require('../services/config.service');
const SeasonService = require('../services/season.service');

// All admin routes require an authenticated administrator.
router.use(auth);
router.use(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('isAdmin');
  if (!user || !user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
});

// 1. GET /api/admin/tap-economy/config
router.get('/config', async (req, res) => {
  try {
    const config = ConfigService.getAll();
    res.json({ success: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching config' });
  }
});

// 2. POST /api/admin/tap-economy/config
router.post('/config', async (req, res) => {
  const { key, value, reason } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ success: false, message: 'key and value are required' });
  }

  try {
    const updatedValue = await ConfigService.update(key, value, req.user.id, reason || 'Admin update');
    res.json({ success: true, message: `Config ${key} updated successfully`, newValue: updatedValue });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 3. GET /api/admin/tap-economy/config/audit
router.get('/config/audit', async (req, res) => {
  try {
    const audits = await ConfigAudit.find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('adminId', 'username');
    res.json({ success: true, audits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching audit log' });
  }
});

// 4. GET /api/admin/tap-economy/analytics
router.get('/analytics', async (req, res) => {
  try {
    // 1. General counts
    const totalTaps = await TapEvent.countDocuments({});
    
    // Aggregation of rewards distributed
    const ledgerAgg = await RewardLedger.aggregate([
      { $match: { amount: { $gt: 0 } } },
      {
        $group: {
          _id: '$currency',
          total: { $sum: { $toDouble: '$amount' } }
        }
      }
    ]);

    const rewardsMap = { VE: 0, SVE: 0, Token: 0, Gem: 0, Spin: 0 };
    ledgerAgg.forEach(item => {
      rewardsMap[item._id] = parseFloat(item.total.toFixed(2));
    });

    // Upgrades stats
    const totalUpgrades = await RewardLedger.countDocuments({ type: 'upgrade_purchase' });

    // Active users
    const totalUsers = await User.countDocuments({});
    const activeStates = await TapState.find({}).populate('userId', 'username');
    
    const usersStats = activeStates.map(state => ({
      userId: state.userId ? state.userId._id : null,
      username: state.userId ? state.userId.username : 'Unknown',
      totalTaps: state.totalAcceptedTaps,
      bestStreak: state.bestStreak,
      energyCapacityLevel: state.energyCapacityLevel,
      rechargeSpeedLevel: state.rechargeSpeedLevel,
      energyBankLevel: state.energyBankLevel,
      tapEfficiencyLevel: state.tapEfficiencyLevel
    }));

    res.json({
      success: true,
      analytics: {
        totalTaps,
        rewardsDistributed: rewardsMap,
        totalUpgrades,
        totalUsers,
        usersStats
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching analytics' });
  }
});

// 5. POST /api/admin/tap-economy/season/rollover
router.post('/season/rollover', async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await SeasonService.triggerSeasonRollover(req.user.id, reason);
    res.json({ success: true, message: 'Season rollover completed successfully', result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 6. GET /api/admin/tap-economy/users/:id/preview
router.get('/users/:id/preview', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let tapState = await TapState.findOne({ userId });
    if (!tapState) {
      tapState = new TapState({ userId });
      await tapState.save();
    }

    res.json({
      success: true,
      user,
      tapState
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching user preview' });
  }
});

module.exports = router;
