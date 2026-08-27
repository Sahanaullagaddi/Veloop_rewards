const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const TapState = require('../models/tapState.model');
const TapEvent = require('../models/tapEvent.model');
const RewardLedger = require('../models/rewardLedger.model');
const Mission = require('../models/mission.model');
const UserMission = require('../models/userMission.model');
const TapSeason = require('../models/tapSeason.model');
const TapLeagueScore = require('../models/tapLeagueScore.model');
const Notification = require('../models/notification.model');
const Upgrade = require('../models/upgrade.model');
const Boost = require('../models/boost.model');
const Spin = require('../models/spin.model');
const AdEvent = require('../models/adEvent.model');
const StakingRecord = require('../models/stakingRecord.model');
const auth = require('../middleware/auth');
const TapEconomyService = require('../services/tapEconomy.service');
const ConfigService = require('../services/config.service');
const { getIO } = require('../config/socket');

function toDecimal128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(6));
}

// 1. POST /api/tap
router.post('/', auth, async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ success: false, message: 'requestId is required' });
  }

  try {
    const result = await TapEconomyService.processTap({
      userId: req.user.id,
      requestId,
    });
    res.json(result);
  } catch (err) {
    if (err.message === 'Too Fast') {
      return res.status(429).json({ success: false, message: 'Too Fast' });
    }
    if (err.message === 'Energy Empty') {
      return res.status(400).json({ success: false, message: 'Energy Empty' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error processing tap' });
  }
});

// 2. GET /api/tap/history
router.get('/history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ledger = await RewardLedger.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RewardLedger.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      ledger: ledger.map(l => ({
        id: l._id,
        type: l.type,
        amount: parseFloat(l.amount.toString()),
        currency: l.currency,
        timestamp: l.timestamp,
        details: l.details
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching history' });
  }
});

// 2. GET /api/tap/state
router.get('/state', auth, async (req, res) => {
  try {
    const [user, tapState, activeSeason] = await Promise.all([
      User.findById(req.user.id).select('-password'),
      TapState.findOne({ userId: req.user.id }),
      TapSeason.findOne({ status: 'active' })
    ]);

    if (!user || !tapState) {
      return res.status(404).json({ success: false, message: 'Tap state not found' });
    }

    const energyCapacity = ConfigService.get('energy_capacity_base') +
      (tapState.energyCapacityLevel - 1) * ConfigService.get('energy_capacity_step');
    const energyBankCapacity = ConfigService.get('energy_bank_base_capacity') +
      (tapState.energyBankLevel - 1) * ConfigService.get('energy_bank_capacity_step');

    res.json({
      success: true,
      user,
      tapState: {
        ...tapState.toObject(),
        energyCapacity,
        energyBankCapacity
      },
      activeSeason
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching tap state' });
  }
});

// 3. POST /api/tap/boost/activate
router.post('/boost/activate', auth, async (req, res) => {
  const now = new Date();
  try {
    let tapState = await TapState.findOne({ userId: req.user.id });
    if (!tapState) {
      tapState = new TapState({ userId: req.user.id });
      await tapState.save();
    }

    // Cooldown check: 30s after boost expires.
    // If activeBoostExpiry is in the future, it is already active.
    if (tapState.activeBoostExpiry && new Date(tapState.activeBoostExpiry) > now) {
      return res.status(400).json({ success: false, message: 'Boost is already active' });
    }

    const expiryDate = tapState.activeBoostExpiry ? new Date(tapState.activeBoostExpiry) : null;
    if (expiryDate && (now - expiryDate) < 30000) {
      const remainingCooldown = Math.ceil((30000 - (now - expiryDate)) / 1000);
      return res.status(400).json({ success: false, message: `Boost is on cooldown. Try again in ${remainingCooldown}s` });
    }

    // Activate 30 seconds boost
    const activeBoostExpiry = new Date(now.getTime() + 30000);
    tapState.activeBoostExpiry = activeBoostExpiry;
    await tapState.save();

    await Boost.create({
      userId: req.user.id,
      boostType: 'active_boost',
      activatedAt: now,
      expiresAt: activeBoostExpiry
    });

    // Notify clients via WS
    const io = getIO();
    if (io) {
      io.to(req.user.id.toString()).emit('boostActivated', { activeBoostExpiry });
    }

    res.json({ success: true, activeBoostExpiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error activating boost' });
  }
});

// Helper for upgrade purchase logic
async function processUpgradePurchase(userId, upgradeType) {
  const now = new Date();
  let tapState = await TapState.findOne({ userId });
  if (!tapState) {
    tapState = new TapState({ userId });
    await tapState.save();
  }

  let currentLevel = 0;
  let maxLevel = 1;
  let cost = 0;
  let currency = 'VE';
  let stateField = '';

  switch (upgradeType) {
    case 'energy_capacity':
      currentLevel = tapState.energyCapacityLevel;
      maxLevel = 6; // max energy is 1000
      cost = Math.floor(ConfigService.get('energy_capacity_cost_base') * Math.pow(ConfigService.get('energy_capacity_cost_multiplier'), currentLevel - 1));
      currency = 'VE';
      stateField = 'energyCapacityLevel';
      break;
    case 'recharge_speed':
      currentLevel = tapState.rechargeSpeedLevel;
      maxLevel = 5; // max level is 5
      cost = Math.floor(ConfigService.get('recharge_speed_cost_base') * Math.pow(ConfigService.get('recharge_speed_cost_multiplier'), currentLevel - 1));
      currency = 'Token';
      stateField = 'rechargeSpeedLevel';
      break;
    case 'energy_bank':
      currentLevel = tapState.energyBankLevel;
      maxLevel = 3; // +2 upgrades from base, so max level 3
      cost = ConfigService.get('energy_bank_purchase_cost') || 200;
      currency = 'VE';
      stateField = 'energyBankLevel';
      break;
    case 'tap_efficiency':
      currentLevel = tapState.tapEfficiencyLevel;
      maxLevel = 3; // max level is 3
      const efficiencyCosts = [0, ConfigService.get('efficiency_level_1_cost_sve') || 10, ConfigService.get('efficiency_level_2_cost_sve') || 25, ConfigService.get('efficiency_level_3_cost_sve') || 50];
      cost = efficiencyCosts[currentLevel + 1] || 99999;
      currency = 'SVE';
      stateField = 'tapEfficiencyLevel';
      break;
    default:
      throw new Error('Invalid upgrade type');
  }

  if (currentLevel >= maxLevel) {
    throw new Error('Max level reached');
  }

  // Deduct balance atomically
  let balanceField = '';
  switch (currency) {
    case 'VE': balanceField = 'veBalance'; break;
    case 'SVE': balanceField = 'sveBalance'; break;
    case 'Token': balanceField = 'tokenBalance'; break;
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, [balanceField]: { $gte: toDecimal128(cost) } },
    { $inc: { [balanceField]: toDecimal128(-cost) } },
    { new: true }
  );

  if (!user) {
    throw new Error('Insufficient balance');
  }

  // Increment Level
  tapState[stateField] += 1;
  await tapState.save();

  const requestId = `upgrade-${upgradeType}-${currentLevel + 1}-${Date.now()}`;

  // Log in Upgrade & Ledger
  await Upgrade.create({
    userId,
    upgradeType,
    level: currentLevel + 1,
    cost: toDecimal128(cost),
    currency,
    timestamp: now
  });

  await RewardLedger.create({
    userId,
    requestId,
    type: 'upgrade_purchase',
    amount: toDecimal128(-cost),
    currency,
    timestamp: now,
    details: { upgradeType, toLevel: currentLevel + 1 }
  });

  // Emit WebSocket update
  const io = getIO();
  if (io) {
    io.to(userId.toString()).emit('stateUpdate', {
      [balanceField]: user[balanceField].toString(),
      [stateField]: tapState[stateField]
    });
  }

  return {
    success: true,
    upgradeType,
    newLevel: tapState[stateField],
    cost,
    currency
  };
}

// 4. POST /api/tap/upgrade
router.post('/upgrade', auth, async (req, res) => {
  const { upgradeType } = req.body;
  if (!upgradeType) {
    return res.status(400).json({ success: false, message: 'upgradeType is required' });
  }
  try {
    const result = await processUpgradePurchase(req.user.id, upgradeType);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 5. POST /api/tap/energy-bank/purchase
router.post('/energy-bank/purchase', auth, async (req, res) => {
  try {
    const result = await processUpgradePurchase(req.user.id, 'energy_bank');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 6. POST /api/tap/shield/purchase
router.post('/shield/purchase', auth, async (req, res) => {
  const now = new Date();
  const cost = ConfigService.get('energy_shield_cost_ve') || 100;
  const duration = ConfigService.get('energy_shield_duration_secs') || 30;

  try {
    let tapState = await TapState.findOne({ userId: req.user.id });
    if (!tapState) {
      tapState = new TapState({ userId: req.user.id });
      await tapState.save();
    }

    if (tapState.activeShieldExpiry && new Date(tapState.activeShieldExpiry) > now) {
      return res.status(400).json({ success: false, message: 'Shield is already active' });
    }

    if (tapState.shieldCooldownExpiry && new Date(tapState.shieldCooldownExpiry) > now) {
      const remainingCooldown = Math.ceil((new Date(tapState.shieldCooldownExpiry) - now) / 1000);
      return res.status(400).json({ success: false, message: `Shield on cooldown. Try again in ${remainingCooldown}s` });
    }

    // Deduct 100 VE atomically
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, veBalance: { $gte: toDecimal128(cost) } },
      { $inc: { veBalance: toDecimal128(-cost) } },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'Insufficient VE balance' });
    }

    const activeShieldExpiry = new Date(now.getTime() + duration * 1000);
    const shieldCooldownExpiry = new Date(now.getTime() + (duration + ConfigService.get('energy_shield_cooldown_mins') * 60) * 1000);

    tapState.activeShieldExpiry = activeShieldExpiry;
    tapState.shieldCooldownExpiry = shieldCooldownExpiry;
    await tapState.save();

    const requestId = `shield-purchase-${Date.now()}`;
    await Boost.create({
      userId: req.user.id,
      boostType: 'energy_shield',
      activatedAt: now,
      expiresAt: activeShieldExpiry
    });

    await RewardLedger.create({
      userId: req.user.id,
      requestId,
      type: 'shield_purchase',
      amount: toDecimal128(-cost),
      currency: 'VE',
      timestamp: now,
      details: { duration }
    });

    // Notify clients via WS
    const io = getIO();
    if (io) {
      io.to(req.user.id.toString()).emit('shieldActivated', { activeShieldExpiry, shieldCooldownExpiry });
    }

    res.json({
      success: true,
      activeShieldExpiry,
      shieldCooldownExpiry,
      cost,
      veBalance: user.veBalance.toString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error purchasing shield' });
  }
});

// 7. GET /api/tap/missions
router.get('/missions', auth, async (req, res) => {
  try {
    const missions = await Mission.find({ isActive: true });
    const userMissions = await UserMission.find({ userId: req.user.id });

    const results = missions.map(m => {
      const um = userMissions.find(u => u.missionId.toString() === m._id.toString());
      return {
        id: m._id,
        title: m.title,
        description: m.description,
        rewardType: m.rewardType,
        rewardAmount: parseFloat(m.rewardAmount.toString()),
        requirementType: m.requirementType,
        requirementValue: m.requirementValue,
        progress: um ? um.progress : 0,
        completed: um ? um.completed : false,
        claimed: um ? um.claimed : false
      };
    });

    res.json({ success: true, missions: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching missions' });
  }
});

// 8. POST /api/tap/missions/:id/claim
router.post('/missions/:id/claim', auth, async (req, res) => {
  const missionId = req.params.id;
  const userId = req.user.id;

  try {
    const userMission = await UserMission.findOne({ userId, missionId });
    if (!userMission) {
      return res.status(404).json({ success: false, message: 'Mission progress not found' });
    }

    if (!userMission.completed) {
      return res.status(400).json({ success: false, message: 'Mission is not completed yet' });
    }

    if (userMission.claimed) {
      return res.status(400).json({ success: false, message: 'Mission reward already claimed' });
    }

    const mission = await Mission.findById(missionId);
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission definition not found' });
    }

    // Set claimed
    userMission.claimed = true;
    userMission.claimedAt = new Date();
    await userMission.save();

    // Credit balance atomically
    let balanceField = '';
    switch (mission.rewardType) {
      case 'VE': balanceField = 'veBalance'; break;
      case 'SVE': balanceField = 'sveBalance'; break;
      case 'Token': balanceField = 'tokenBalance'; break;
      case 'Gem': balanceField = 'gemBalance'; break;
      case 'Spin': balanceField = 'spinBalance'; break;
    }

    let userUpdate = {};
    if (mission.rewardType === 'Spin') {
      userUpdate = { $inc: { spinBalance: parseFloat(mission.rewardAmount.toString()) } };
    } else {
      userUpdate = { $inc: { [balanceField]: mission.rewardAmount } };
    }

    const updatedUser = await User.findOneAndUpdate({ _id: userId }, userUpdate, { new: true });

    // Ledger
    const requestId = `mission-claim-${missionId}-${Date.now()}`;
    await RewardLedger.create({
      userId,
      requestId,
      type: 'mission_claim',
      amount: mission.rewardAmount,
      currency: mission.rewardType,
      timestamp: new Date(),
      details: { title: mission.title }
    });

    res.json({
      success: true,
      rewardType: mission.rewardType,
      rewardAmount: parseFloat(mission.rewardAmount.toString()),
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
    res.status(500).json({ success: false, message: 'Server error claiming mission reward' });
  }
});

// 9. GET /api/tap/daily-challenge
router.get('/daily-challenge', auth, async (req, res) => {
  const userId = req.user.id;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  try {
    // Count effective taps user made today
    const events = await TapEvent.find({ userId, timestamp: { $gte: startOfDay } });
    const effectiveTapsToday = events.reduce((sum, item) => sum + item.effectiveTaps, 0);

    const claimed = await RewardLedger.exists({
      userId,
      type: 'daily_challenge_claim',
      timestamp: { $gte: startOfDay }
    });

    const target = ConfigService.get('daily_challenge_target') || 1000;

    res.json({
      success: true,
      progress: effectiveTapsToday,
      target,
      claimed: !!claimed,
      rewardAmount: ConfigService.get('daily_challenge_reward_tokens'),
      rewardType: 'Token'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching daily challenge status' });
  }
});

// 10. POST /api/tap/daily-challenge/claim
router.post('/daily-challenge/claim', auth, async (req, res) => {
  const userId = req.user.id;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const rewardAmount = ConfigService.get('daily_challenge_reward_tokens');

  try {
    const events = await TapEvent.find({ userId, timestamp: { $gte: startOfDay } });
    const effectiveTapsToday = events.reduce((sum, item) => sum + item.effectiveTaps, 0);

    const target = ConfigService.get('daily_challenge_target') || 1000;

    if (effectiveTapsToday < target) {
      return res.status(400).json({ success: false, message: `Daily challenge target of ${target} effective taps not met` });
    }

    const claimed = await RewardLedger.exists({
      userId,
      type: 'daily_challenge_claim',
      timestamp: { $gte: startOfDay }
    });

    if (claimed) {
      return res.status(400).json({ success: false, message: 'Daily challenge already claimed today' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { tokenBalance: toDecimal128(rewardAmount) } },
      { new: true }
    );

    const requestId = `daily-challenge-claim-${startOfDay.getTime()}-${userId}`;
    await RewardLedger.create({
      userId,
      requestId,
      type: 'daily_challenge_claim',
      amount: toDecimal128(rewardAmount),
      currency: 'Token',
      timestamp: new Date()
    });

    res.json({
      success: true,
      rewardType: 'Token',
      rewardAmount,
      tokenBalance: updatedUser.tokenBalance.toString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error claiming daily challenge reward' });
  }
});

// 11. GET /api/tap/lucky
router.get('/lucky', auth, async (req, res) => {
  try {
    const tapState = await TapState.findOne({ userId: req.user.id });
    if (!tapState) {
      return res.status(404).json({ success: false, message: 'TapState not found' });
    }

    const interval = ConfigService.get('lucky_tap_interval') || 30;
    const tapsCount = tapState.totalAcceptedTaps;
    const lastLucky = tapState.lastLuckyTapCount || 0;
    const diff = tapsCount - lastLucky;
    const eligible = diff >= interval;

    res.json({
      success: true,
      eligible,
      totalAcceptedTaps: tapsCount,
      lastLuckyTapCount: lastLucky,
      nextIn: eligible ? 0 : interval - diff
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error checking lucky eligibility' });
  }
});

// 12. POST /api/tap/lucky/spin
router.post('/lucky/spin', auth, async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ success: false, message: 'requestId is required' });
  }

  try {
    // Idempotency check
    const existingSpin = await Spin.findOne({ requestId });
    if (existingSpin) {
      return res.json({
        success: true,
        duplicate: true,
        rewardType: existingSpin.rewardType,
        rewardAmount: parseFloat(existingSpin.rewardAmount.toString())
      });
    }

    const tapState = await TapState.findOne({ userId: req.user.id });
    if (!tapState) {
      return res.status(404).json({ success: false, message: 'TapState not found' });
    }

    const interval = ConfigService.get('lucky_tap_interval') || 30;
    const tapsCount = tapState.totalAcceptedTaps;
    const lastLucky = tapState.lastLuckyTapCount || 0;
    const diff = tapsCount - lastLucky;

    if (diff < interval) {
      return res.status(400).json({ success: false, message: 'Not eligible for Lucky Spin yet' });
    }

    // Roll lucky reward:
    // 50% chance: 10 VE
    // 20% chance: 50 VE
    // 15% chance: 5 SVE
    // 10% chance: 10 Gems
    // 4% chance: 100 Tokens
    // 1% chance: 500 Tokens (Jackpot!)
    const roll = Math.random();
    let rewardType = 'VE';
    let amount = 10;

    if (roll < 0.50) {
      rewardType = 'VE'; amount = 10;
    } else if (roll < 0.70) {
      rewardType = 'VE'; amount = 50;
    } else if (roll < 0.85) {
      rewardType = 'SVE'; amount = 5;
    } else if (roll < 0.95) {
      rewardType = 'Gem'; amount = 10;
    } else if (roll < 0.99) {
      rewardType = 'Token'; amount = 100;
    } else {
      rewardType = 'Token'; amount = 500;
    }

    // Award reward atomically
    let balanceField = '';
    switch (rewardType) {
      case 'VE': balanceField = 'veBalance'; break;
      case 'SVE': balanceField = 'sveBalance'; break;
      case 'Token': balanceField = 'tokenBalance'; break;
      case 'Gem': balanceField = 'gemBalance'; break;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id },
      { $inc: { [balanceField]: toDecimal128(amount) } },
      { new: true }
    );

    // Save Spin and update lucky tap tracker
    await Spin.create({
      userId: req.user.id,
      requestId,
      rewardType,
      rewardAmount: toDecimal128(amount)
    });

    tapState.lastLuckyTapCount = lastLucky + interval;
    await tapState.save();

    await RewardLedger.create({
      userId: req.user.id,
      requestId,
      type: 'spin',
      amount: toDecimal128(amount),
      currency: rewardType,
      timestamp: new Date()
    });

    // Emit WebSocket update for real-time balance
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
      rewardType,
      rewardAmount: amount,
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
    res.status(500).json({ success: false, message: 'Server error processing Lucky Spin' });
  }
});

// 13. GET /api/tap/league
router.get('/league', auth, async (req, res) => {
  try {
    const activeSeason = await TapSeason.findOne({ status: 'active' });
    if (!activeSeason) {
      return res.status(404).json({ success: false, message: 'No active season found' });
    }

    // Query top 100
    const top100 = await TapLeagueScore.find({ seasonId: activeSeason._id })
      .sort({ score: -1, lastUpdated: 1 })
      .limit(100)
      .populate('userId', 'username level');

    const serializedRows = top100.map((item, idx) => ({
      rank: idx + 1,
      username: item.userId ? item.userId.username : 'Unknown',
      userId: item.userId ? item.userId._id : null,
      score: item.score,
      lastUpdated: item.lastUpdated
    }));

    // Find My Rank
    let myRank = -1;
    let myScoreItem = await TapLeagueScore.findOne({ userId: req.user.id, seasonId: activeSeason._id });
    
    if (myScoreItem) {
      // Find how many users have a higher score, OR same score with earlier lastUpdated
      const countHigher = await TapLeagueScore.countDocuments({
        seasonId: activeSeason._id,
        $or: [
          { score: { $gt: myScoreItem.score } },
          { score: myScoreItem.score, lastUpdated: { $lt: myScoreItem.lastUpdated } }
        ]
      });
      myRank = countHigher + 1;
    }

    res.json({
      success: true,
      seasonName: activeSeason.name,
      seasonEndDate: activeSeason.endDate,
      leaderboard: serializedRows,
      myRank: myRank !== -1 ? {
        rank: myRank,
        score: myScoreItem.score,
        username: req.user.username
      } : {
        rank: 'Unranked',
        score: 0,
        username: req.user.username
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching leaderboard' });
  }
});

// 14. GET /api/tap/season
router.get('/season', auth, async (req, res) => {
  try {
    const activeSeason = await TapSeason.findOne({ status: 'active' });
    const pastSeasons = await TapSeason.find({ status: 'archived' }).sort({ endDate: -1 });

    res.json({
      success: true,
      activeSeason,
      pastSeasons
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching season info' });
  }
});

// 15. GET /api/tap/notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [{ userId: req.user.id }, { userId: null }]
    }).sort({ timestamp: -1 }).limit(50);

    res.json({ success: true, notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
});

// 16. POST /api/tap/notifications/read
router.post('/notifications/read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error updating notifications' });
  }
});

// 17. GET /api/tap/streak
router.get('/streak', auth, async (req, res) => {
  try {
    const tapState = await TapState.findOne({ userId: req.user.id });
    if (!tapState) {
      return res.status(404).json({ success: false, message: 'TapState not found' });
    }

    // Refresh streak expiry check in case it is outdated in DB
    const now = new Date();
    let currentStreak = tapState.currentStreak;
    if (tapState.streakExpiry && new Date(tapState.streakExpiry) < now) {
      currentStreak = 0; // Expired
    }

    res.json({
      success: true,
      currentStreak,
      bestStreak: tapState.bestStreak,
      streakExpiry: tapState.streakExpiry
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching streak' });
  }
});

// 18. POST /api/tap/ads/log
router.post('/ads/log', auth, async (req, res) => {
  const { requestId, adType } = req.body;
  if (!requestId || !adType) {
    return res.status(400).json({ success: false, message: 'requestId and adType are required' });
  }

  try {
    // Idempotency check
    const existingAd = await AdEvent.findOne({ requestId });
    if (existingAd) {
      return res.json({ success: true, duplicate: true, message: 'Ad already processed' });
    }

    // Check type and award rewards:
    // Interstitial: 5 VE
    // Video: 10 VE
    // Banner: 1 VE
    let veReward = 1;
    if (adType === 'interstitial') {
      veReward = 5;
    } else if (adType === 'video') {
      veReward = 10;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id },
      { $inc: { veBalance: toDecimal128(veReward) } },
      { new: true }
    );

    await AdEvent.create({
      userId: req.user.id,
      requestId,
      adType,
      status: 'completed'
    });

    await RewardLedger.create({
      userId: req.user.id,
      requestId,
      type: 'ad_reward',
      amount: toDecimal128(veReward),
      currency: 'VE',
      timestamp: new Date(),
      details: { adType }
    });

    // Notify client via Socket
    const io = getIO();
    if (io) {
      io.to(req.user.id.toString()).emit('stateUpdate', {
        veBalance: updatedUser.veBalance.toString()
      });
    }

    res.json({
      success: true,
      rewardType: 'VE',
      rewardAmount: veReward,
      veBalance: updatedUser.veBalance.toString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error logging ad' });
  }
});

// 19. POST /api/tap/fragments/convert
router.post('/fragments/convert', auth, async (req, res) => {
  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount is required' });
  }

  try {
    const conversionRate = ConfigService.get('fragment_conversion_rate') || 10.0;
    const veReward = amt / conversionRate;

    // Deduct Fragments, Add VE atomically
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, fragmentBalance: { $gte: toDecimal128(amt) } },
      { $inc: { fragmentBalance: toDecimal128(-amt), veBalance: toDecimal128(veReward) } },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'Insufficient fragment balance' });
    }

    const requestId = `convert-${Date.now()}`;
    await RewardLedger.create({
      userId: req.user.id,
      requestId,
      type: 'convert_fragments',
      amount: toDecimal128(veReward),
      currency: 'VE',
      timestamp: new Date(),
      details: { fragmentsDeducted: amt }
    });

    res.json({
      success: true,
      veBalance: user.veBalance.toString(),
      fragmentBalance: user.fragmentBalance.toString(),
      rewardAmount: veReward
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error converting fragments' });
  }
});

// 20. GET /api/tap/staking/active
router.get('/staking/active', auth, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  try {
    const records = await StakingRecord.find({ userId, status: 'active' });
    
    const formattedRecords = records.map(record => {
      const timeElapsedMs = now - new Date(record.startDate);
      // Simulated: 1 minute elapsed = 1 day of APY compounding
      const simulatedDaysElapsed = Math.min(record.lockPeriodDays, timeElapsedMs / (60 * 1000));
      
      const principal = parseFloat(record.principalAmount.toString());
      const r = record.apyRate;
      const accrued = principal * Math.pow(1 + r / 365, simulatedDaysElapsed);
      const interestEarned = Math.max(0, accrued - principal);

      return {
        id: record._id,
        principalAmount: principal,
        lockPeriodDays: record.lockPeriodDays,
        apyRate: record.apyRate,
        startDate: record.startDate,
        unlockDate: record.unlockDate,
        interestEarned: interestEarned.toFixed(6),
        isReady: now >= new Date(record.unlockDate)
      };
    });

    res.json({ success: true, vaults: formattedRecords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving staking vaults' });
  }
});

// 21. POST /api/tap/staking/lock
router.post('/staking/lock', auth, async (req, res) => {
  const userId = req.user.id;
  const { amount, lockPeriodDays } = req.body;

  const amt = parseFloat(amount);
  const days = parseInt(lockPeriodDays);

  if (isNaN(amt) || amt < 10) {
    return res.status(400).json({ success: false, message: 'Minimum staking amount is 10.0 VE' });
  }

  if (![3, 7, 30].includes(days)) {
    return res.status(400).json({ success: false, message: 'Staking lock periods must be 3, 7, or 30 days' });
  }

  // APY Tiers: 3d -> 5%, 7d -> 12%, 30d -> 25%
  let apyRate = 0.05;
  if (days === 7) apyRate = 0.12;
  else if (days === 30) apyRate = 0.25;

  try {
    // Deduct VE balance atomically
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, veBalance: { $gte: toDecimal128(amt) } },
      { $inc: { veBalance: toDecimal128(-amt) } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ success: false, message: 'Insufficient VE balance to lock' });
    }

    const now = new Date();
    // Demo Acceleration: 3 days = 3 minutes, 7 days = 7 minutes, 30 days = 30 minutes
    const unlockDate = new Date(now.getTime() + days * 60 * 1000);

    const record = new StakingRecord({
      userId,
      principalAmount: toDecimal128(amt),
      lockPeriodDays: days,
      apyRate,
      startDate: now,
      unlockDate
    });
    await record.save();

    // Ledger entry
    const requestId = `stake-lock-${record._id}-${Date.now()}`;
    await RewardLedger.create({
      userId,
      requestId,
      type: 'convert_fragments', // using lock classification
      amount: toDecimal128(-amt),
      currency: 'VE',
      timestamp: now,
      details: { lockPeriodDays: days, apyRate }
    });

    res.json({
      success: true,
      vault: {
        id: record._id,
        principalAmount: amt,
        lockPeriodDays: days,
        apyRate,
        unlockDate
      },
      veBalance: updatedUser.veBalance.toString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error locking assets' });
  }
});

// 22. POST /api/tap/staking/:id/claim
router.post('/staking/:id/claim', auth, async (req, res) => {
  const userId = req.user.id;
  const recordId = req.params.id;
  const now = new Date();

  try {
    const record = await StakingRecord.findOne({ _id: recordId, userId, status: 'active' });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Active staking vault not found' });
    }

    const isEarly = now < new Date(record.unlockDate);
    const principal = parseFloat(record.principalAmount.toString());
    
    let refundVe = principal;
    let earnedSve = 0;
    let finalStatus = 'claimed';
    let msg = 'Locked yield claimed successfully.';

    if (isEarly) {
      // Early withdrawal penalty: 5% burn of principal, 0% interest
      refundVe = principal * 0.95;
      finalStatus = 'early_withdrawn';
      msg = 'Staking terminated early. 5% principal penalty applied.';
    } else {
      // Standard claim: full principal back in VE + earned interest in SVE
      const timeElapsedMs = now - new Date(record.startDate);
      const simulatedDaysElapsed = Math.min(record.lockPeriodDays, timeElapsedMs / (60 * 1000));
      
      const r = record.apyRate;
      const accrued = principal * Math.pow(1 + r / 365, simulatedDaysElapsed);
      earnedSve = Math.max(0, accrued - principal);
    }

    // Save final status
    record.status = finalStatus;
    record.earnedInterest = toDecimal128(earnedSve);
    await record.save();

    // Credit user balances atomically
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { veBalance: toDecimal128(refundVe), sveBalance: toDecimal128(earnedSve) } },
      { new: true }
    );

    // Write ledgers
    const requestId = `stake-claim-${recordId}-${Date.now()}`;
    await RewardLedger.create({
      userId,
      requestId,
      type: 'mission_claim',
      amount: toDecimal128(refundVe),
      currency: 'VE',
      timestamp: now,
      details: { stakingRecordId: recordId, earlyWithdrawal: isEarly }
    });

    if (earnedSve > 0) {
      await RewardLedger.create({
        userId,
        requestId: `${requestId}-interest`,
        type: 'mission_claim',
        amount: toDecimal128(earnedSve),
        currency: 'SVE',
        timestamp: now,
        details: { stakingRecordId: recordId, interestPayout: true }
      });
    }

    res.json({
      success: true,
      message: msg,
      earlyWithdrawal: isEarly,
      refundVe,
      earnedSve,
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
    res.status(500).json({ success: false, message: 'Server error claiming staking rewards' });
  }
});

// 23. POST /api/tap/pvp/resolve
router.post('/pvp/resolve', auth, async (req, res) => {
  const userId = req.user.id;
  const { userTaps, opponentTaps, result } = req.body;

  const taps = parseInt(userTaps);
  const oppTaps = parseInt(opponentTaps);

  if (isNaN(taps) || isNaN(oppTaps)) {
    return res.status(400).json({ success: false, message: 'Invalid tap counts.' });
  }

  // Anti-cheat verification: max speed is 10 taps/sec. 15s max is 150 taps.
  if (taps > 150) {
    return res.status(400).json({ success: false, message: 'Macro/Auto-clicker execution detected. Match invalidated.' });
  }

  const isVictory = result === 'victory';
  const rewardAmt = isVictory ? 25.0 : 5.0; // 25 VE for winning, 5 VE for participation

  try {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { veBalance: toDecimal128(rewardAmt) } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const requestId = `pvp-${Date.now()}`;
    await RewardLedger.create({
      userId,
      requestId,
      type: 'game_win',
      amount: toDecimal128(rewardAmt),
      currency: 'VE',
      timestamp: new Date(),
      details: { userTaps: taps, opponentTaps: oppTaps, outcome: result }
    });

    res.json({
      success: true,
      message: isVictory ? 'Victory! Reward claimed.' : 'Match finished. Participation prize credited.',
      rewardAmount: rewardAmt,
      userBalances: {
        veBalance: user.veBalance.toString(),
        sveBalance: user.sveBalance.toString(),
        tokenBalance: user.tokenBalance.toString(),
        gemBalance: user.gemBalance.toString(),
        spinBalance: user.spinBalance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error processing match result' });
  }
});

// 24. POST /api/tap/subscription/purchase
router.post('/subscription/purchase', auth, async (req, res) => {
  const userId = req.user.id;
  const { planType } = req.body;

  if (!['weekly', 'monthly', 'yearly'].includes(planType)) {
    return res.status(400).json({ success: false, message: 'Invalid subscription plan type.' });
  }

  const cost = planType === 'weekly' ? 50.0 : planType === 'monthly' ? 150.0 : 1200.0;
  const days = planType === 'weekly' ? 7 : planType === 'monthly' ? 30 : 365;

  try {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const user = await User.findOneAndUpdate(
      { _id: userId, veBalance: { $gte: toDecimal128(cost) } },
      { 
        $inc: { veBalance: toDecimal128(-cost) },
        $set: { subscriptionType: planType, subscriptionExpiry: expiryDate }
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'Insufficient VE balance to purchase subscription.' });
    }

    const requestId = `sub-${planType}-${Date.now()}`;
    await RewardLedger.create({
      userId,
      requestId,
      type: 'convert_fragments', // Deduct classification
      amount: toDecimal128(-cost),
      currency: 'VE',
      timestamp: now,
      details: { purchaseSubscription: planType, expiryDate }
    });

    res.json({
      success: true,
      message: `Premium ${planType} Node Pass activated!`,
      subscriptionType: user.subscriptionType,
      subscriptionExpiry: user.subscriptionExpiry,
      userBalances: {
        veBalance: user.veBalance.toString(),
        sveBalance: user.sveBalance.toString(),
        tokenBalance: user.tokenBalance.toString(),
        gemBalance: user.gemBalance.toString(),
        spinBalance: user.spinBalance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error purchasing subscription' });
  }
});

// 25. POST /api/tap/wallet/withdraw
router.post('/wallet/withdraw', auth, async (req, res) => {
  const userId = req.user.id;
  const { amount, upiId } = req.body;

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
  }

  if (!upiId || !upiId.includes('@')) {
    return res.status(400).json({ success: false, message: 'Invalid UPI ID format. Must contain @.' });
  }

  try {
    // Atomically verify and deduct VE balance
    const user = await User.findOneAndUpdate(
      { _id: userId, veBalance: { $gte: toDecimal128(amt) } },
      { $inc: { veBalance: toDecimal128(-amt) } },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'Insufficient VE balance to withdraw.' });
    }

    // Create persistent WithdrawalRequest
    const WithdrawalRequest = require('../models/withdrawal.model');
    const withdrawal = await WithdrawalRequest.create({
      userId,
      amount: toDecimal128(amt),
      upiId,
      status: 'pending'
    });

    const requestId = `withdraw-${withdrawal._id}`;
    await RewardLedger.create({
      userId,
      requestId,
      type: 'convert_fragments', // using deduct classification
      amount: toDecimal128(-amt),
      currency: 'VE',
      timestamp: new Date(),
      details: { withdrawalUpi: upiId, withdrawalRequestId: withdrawal._id }
    });

    // Emit liveState socket update
    const io = getIO();
    if (io) {
      io.to(userId.toString()).emit('stateUpdate', {
        veBalance: user.veBalance.toString(),
        sveBalance: user.sveBalance.toString(),
        tokenBalance: user.tokenBalance.toString(),
        gemBalance: user.gemBalance.toString(),
        spinBalance: user.spinBalance
      });
    }

    res.json({
      success: true,
      message: `Withdrawal of Rs. ${amt.toFixed(2)} to ${upiId} was initiated successfully.`,
      veBalance: user.veBalance.toString(),
      userBalances: {
        veBalance: user.veBalance.toString(),
        sveBalance: user.sveBalance.toString(),
        tokenBalance: user.tokenBalance.toString(),
        gemBalance: user.gemBalance.toString(),
        spinBalance: user.spinBalance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error processing withdrawal.' });
  }
});

module.exports = router;
