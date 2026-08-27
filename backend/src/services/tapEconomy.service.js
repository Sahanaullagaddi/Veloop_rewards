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
const ConfigService = require('./config.service');
const { getIO } = require('../config/socket');

// Helper to cast double value safely to Decimal128
function toDecimal128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(6));
}

// Calculate active upgrades
function getEnergyCapacity(level) {
  const base = ConfigService.get('energy_capacity_base');
  const step = ConfigService.get('energy_capacity_step');
  return base + (level - 1) * step;
}

function getRechargeIntervalMs(level) {
  const baseMins = ConfigService.get('energy_regen_interval_mins');
  // Decrease regen interval by 10% per level (down to a minimum of 3 minutes)
  const reductionFactor = 1 - Math.min(0.8, (level - 1) * 0.1);
  const targetMins = Math.max(3, baseMins * reductionFactor);
  return targetMins * 60 * 1000;
}

function getEnergyBankCapacity(level) {
  const base = ConfigService.get('energy_bank_base_capacity');
  const step = ConfigService.get('energy_bank_capacity_step');
  return base + (level - 1) * step;
}

function getEfficiencyMultiplier(level) {
  const mults = ConfigService.get('efficiency_multipliers') || [1.0, 1.1, 1.2, 1.3];
  return mults[level] || 1.0;
}

// Dynamic Regen Calculator
function calculateRegen(tapState, now, isPremium = false) {
  let capacity = getEnergyCapacity(tapState.energyCapacityLevel);
  if (isPremium) {
    capacity = Math.floor(capacity * 1.5); // Premium +50% Capacity
  }
  
  let intervalMs = getRechargeIntervalMs(tapState.rechargeSpeedLevel);
  if (isPremium) {
    intervalMs = Math.floor(intervalMs / 2); // Premium 2x Regen Speed
  }
  
  const elapsedMs = now - new Date(tapState.lastRegenTime);

  if (elapsedMs >= intervalMs) {
    const steps = Math.floor(elapsedMs / intervalMs);
    const regenAmount = steps * ConfigService.get('energy_regen_amount');
    tapState.currentEnergy = Math.min(capacity, tapState.currentEnergy + regenAmount);
    tapState.lastRegenTime = new Date(new Date(tapState.lastRegenTime).getTime() + steps * intervalMs);
  }

  // Energy Bank Regen
  const bankCapacity = getEnergyBankCapacity(tapState.energyBankLevel);
  const bankIntervalMs = ConfigService.get('energy_bank_regen_interval_mins') * 60 * 1000;
  const bankElapsedMs = now - new Date(tapState.energyBankLastRegen);

  if (bankElapsedMs >= bankIntervalMs) {
    const bankSteps = Math.floor(bankElapsedMs / bankIntervalMs);
    const bankRegenAmount = bankSteps * ConfigService.get('energy_bank_regen_amount');
    tapState.energyBankBalance = Math.min(bankCapacity, tapState.energyBankBalance + bankRegenAmount);
    tapState.energyBankLastRegen = new Date(new Date(tapState.energyBankLastRegen).getTime() + bankSteps * bankIntervalMs);
  }

  // If energy is already full, align lastRegenTime to now to prevent runaway accumulation
  if (tapState.currentEnergy >= capacity) {
    tapState.lastRegenTime = now;
  }
  if (tapState.energyBankBalance >= bankCapacity) {
    tapState.energyBankLastRegen = now;
  }
}

// Process physical tap
async function processTap({ userId, requestId }) {
  const now = new Date();

  // 1. Idempotency Check
  const existingLedger = await RewardLedger.findOne({ userId, requestId });
  if (existingLedger) {
    // Return cached event details
    const event = await TapEvent.findOne({ requestId });
    return {
      success: true,
      duplicate: true,
      rewardType: existingLedger.currency,
      rewardAmount: parseFloat(existingLedger.amount.toString()),
      isMystery: event ? event.isMystery : false,
      isLucky: event ? event.isLucky : false,
      tapsDetails: event
    };
  }

  // Fetch user profile to check subscription status
  const userProfile = await User.findById(userId);
  const isPremium = userProfile && ['monthly', 'yearly'].includes(userProfile.subscriptionType) && (!userProfile.subscriptionExpiry || new Date(userProfile.subscriptionExpiry) > now);

  // Fetch or create user tap state
  let tapState = await TapState.findOne({ userId });
  if (!tapState) {
    tapState = new TapState({ userId });
    await tapState.save();
  }

  // Retrieve active season
  const activeSeason = await TapSeason.findOne({ status: 'active' });
  if (!activeSeason) {
    throw new Error('No active tap season found');
  }

  // Perform dynamic regen
  calculateRegen(tapState, now, isPremium);

  // 2. Anti-Abuse: Rate limiting (min 200ms)
  const msSinceLastTap = now - new Date(tapState.lastTapTime);
  if (msSinceLastTap < 200) {
    throw new Error('Too Fast');
  }

  // 3. Multitap and Boost check
  let multitapMultiplier = 1;
  if (tapState.multitapExpiry && new Date(tapState.multitapExpiry) > now) {
    multitapMultiplier = tapState.multitapLevel;
  }

  const isBoostActive = tapState.activeBoostExpiry && new Date(tapState.activeBoostExpiry) > now;
  const boostMultiplier = isBoostActive ? 2 : 1;

  // Calculate physical and effective taps
  const physicalTaps = 1;
  const effectiveTaps = physicalTaps * multitapMultiplier * boostMultiplier;

  // 4. Energy Shield Check
  const isShieldActive = tapState.activeShieldExpiry && new Date(tapState.activeShieldExpiry) > now;
  const shieldProtectionRate = ConfigService.get('energy_shield_protection_rate') || 0.90;

  let energyCost = effectiveTaps;
  if (isShieldActive) {
    energyCost = Math.ceil(energyCost * (1 - shieldProtectionRate));
  }

  // Verify energy sufficiency
  let mainEnergyConsumed = 0;
  let bankEnergyConsumed = 0;

  if (tapState.currentEnergy >= energyCost) {
    mainEnergyConsumed = energyCost;
  } else {
    mainEnergyConsumed = tapState.currentEnergy;
    const remainingCost = energyCost - mainEnergyConsumed;
    if (tapState.energyBankBalance >= remainingCost) {
      bankEnergyConsumed = remainingCost;
    } else {
      throw new Error('Energy Empty');
    }
  }

  // Update Combo & Streak
  const timeSinceLastTap = now - new Date(tapState.lastTapTime);
  
  // Combo (2s limit)
  if (timeSinceLastTap <= 2000) {
    tapState.currentCombo += 1;
  } else {
    tapState.currentCombo = 1;
  }
  tapState.comboExpiry = new Date(now.getTime() + 2000);

  // Streak (5s limit)
  if (timeSinceLastTap <= 5000) {
    tapState.currentStreak += 1;
  } else {
    tapState.currentStreak = 1;
  }
  tapState.streakExpiry = new Date(now.getTime() + 5000);
  tapState.bestStreak = Math.max(tapState.bestStreak, tapState.currentStreak);

  // Roll Reward via Server Config
  const sveProb = ConfigService.get('sve_prob');
  const veProb = ConfigService.get('ve_prob');
  const spinProb = ConfigService.get('spin_prob');
  const gemsProb = ConfigService.get('gems_prob');
  const tokensProb = ConfigService.get('tokens_prob');

  const roll = Math.random();
  let rewardType = 'SVE';
  let rawRewardAmount = 0.0;

  if (roll < sveProb) {
    rewardType = 'SVE';
    rawRewardAmount = ConfigService.get('sve_amount');
  } else if (roll < sveProb + veProb) {
    rewardType = 'VE';
    const min = ConfigService.get('ve_min');
    const max = ConfigService.get('ve_max');
    // Random between min and max, 1 decimal place
    rawRewardAmount = parseFloat((Math.random() * (max - min) + min).toFixed(1));
  } else if (roll < sveProb + veProb + spinProb) {
    rewardType = 'Spin';
    rawRewardAmount = 1.0;
  } else if (roll < sveProb + veProb + spinProb + gemsProb) {
    rewardType = 'Gem';
    const gemsValues = ConfigService.get('gems_values') || [0.5, 0.8, 1.0, 1.2, 2.0];
    rawRewardAmount = gemsValues[Math.floor(Math.random() * gemsValues.length)];
  } else {
    rewardType = 'Token';
    const min = ConfigService.get('tokens_min');
    const max = ConfigService.get('tokens_max');
    rawRewardAmount = Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Apply Seasonal Efficiency Multiplier to value payouts (not spins)
  let finalRewardAmount = rawRewardAmount;
  if (['VE', 'SVE', 'Gem', 'Token'].includes(rewardType)) {
    let effMult = getEfficiencyMultiplier(tapState.tapEfficiencyLevel);
    if (isPremium) {
      effMult = effMult * 1.20; // Premium 20% multiplier bonus
    }
    finalRewardAmount = parseFloat((finalRewardAmount * effMult).toFixed(4));
  }

  // Check Mystery Tap (every 250 effective taps, 0.5% roll, SVE reward)
  let isMystery = false;
  tapState.mysteryTapProgress += effectiveTaps;
  if (tapState.mysteryTapProgress >= ConfigService.get('mystery_tap_interval')) {
    tapState.mysteryTapProgress -= ConfigService.get('mystery_tap_interval');
    if (Math.random() < ConfigService.get('mystery_tap_chance')) {
      isMystery = true;
      const mysterySveAmt = ConfigService.get('mystery_tap_sve_reward');
      
      // Award SVE dynamically
      await User.updateOne(
        { _id: userId },
        { $inc: { sveBalance: toDecimal128(mysterySveAmt) } }
      );

      await RewardLedger.create({
        userId,
        requestId: `${requestId}-mystery`,
        type: 'mystery_tap',
        amount: toDecimal128(mysterySveAmt),
        currency: 'SVE',
        timestamp: now,
        details: { effectiveTaps }
      });

      await Notification.create({
        userId,
        category: 'reward',
        title: 'Mystery Tap Unlocked!',
        message: `Incredible luck! You hit the 0.5% roll on your 250th tap and won ${mysterySveAmt} SVE!`,
        timestamp: now
      });
    }
  }

  // Apply state deductions
  tapState.currentEnergy -= mainEnergyConsumed;
  tapState.energyBankBalance -= bankEnergyConsumed;
  tapState.lastTapTime = now;
  tapState.totalAcceptedTaps += physicalTaps;

  // Use Optimistic Version Locking to save TapState securely
  const lockedState = await TapState.findOneAndUpdate(
    { _id: tapState._id, lastTapTime: { $lt: now } },
    {
      currentEnergy: tapState.currentEnergy,
      energyBankBalance: tapState.energyBankBalance,
      lastTapTime: tapState.lastTapTime,
      totalAcceptedTaps: tapState.totalAcceptedTaps,
      mysteryTapProgress: tapState.mysteryTapProgress,
      currentCombo: tapState.currentCombo,
      comboExpiry: tapState.comboExpiry,
      currentStreak: tapState.currentStreak,
      streakExpiry: tapState.streakExpiry,
      bestStreak: tapState.bestStreak,
      lastRegenTime: tapState.lastRegenTime,
      energyBankLastRegen: tapState.energyBankLastRegen
    },
    { new: true }
  );

  if (!lockedState) {
    throw new Error('Concurrency Error');
  }

  // Atomic Update to user balance and XP
  const xpReward = effectiveTaps; // 1 XP per effective tap
  let balanceField = '';
  switch (rewardType) {
    case 'VE': balanceField = 'veBalance'; break;
    case 'SVE': balanceField = 'sveBalance'; break;
    case 'Token': balanceField = 'tokenBalance'; break;
    case 'Gem': balanceField = 'gemBalance'; break;
    case 'Spin': balanceField = 'spinBalance'; break;
  }

  let balanceIncQuery = { xp: xpReward };
  if (rewardType === 'Spin') {
    balanceIncQuery.spinBalance = finalRewardAmount;
  } else {
    balanceIncQuery[balanceField] = toDecimal128(finalRewardAmount);
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: balanceIncQuery },
    { new: true }
  );

  // Handle Level Up: e.g. level requires level * 200 XP
  let leveledUp = false;
  let targetXp = updatedUser.level * 200;
  if (updatedUser.xp >= targetXp) {
    leveledUp = true;
    await User.updateOne(
      { _id: userId },
      { $inc: { level: 1 } }
    );
    updatedUser.level += 1;

    // Check level achievements/badges
    const badges = [...updatedUser.badges];
    const newBadgeId = `level-${updatedUser.level}`;
    if (!badges.some(b => b.id === newBadgeId)) {
      await User.updateOne(
        { _id: userId },
        { $push: { badges: { id: newBadgeId, name: `Level ${updatedUser.level} Pioneer` } } }
      );
    }

    await Notification.create({
      userId,
      category: 'system',
      title: 'Level Up!',
      message: `Congratulations! You leveled up to Level ${updatedUser.level}!`,
      timestamp: now
    });
  }

  // Update League score (effective taps)
  await TapLeagueScore.findOneAndUpdate(
    { userId, seasonId: activeSeason._id },
    { $inc: { score: effectiveTaps }, lastUpdated: now },
    { upsert: true }
  );

  // Write Event & Ledger details
  const tapEvent = await TapEvent.create({
    userId,
    seasonId: activeSeason._id,
    requestId,
    timestamp: now,
    physicalTaps,
    effectiveTaps,
    energyConsumed: energyCost,
    rewardType,
    rewardAmount: toDecimal128(finalRewardAmount),
    isMystery,
    isLucky: false
  });

  await RewardLedger.create({
    userId,
    requestId,
    type: 'tap',
    amount: toDecimal128(finalRewardAmount),
    currency: rewardType,
    timestamp: now,
    details: { physicalTaps, effectiveTaps, isMystery }
  });

  // Evaluate missions progress (async)
  evaluateMissions(userId, updatedUser.level, lockedState.totalAcceptedTaps, lockedState.bestStreak, lockedState.currentCombo);

  // Emit WebSocket update for real-time balance
  const io = getIO();
  if (io) {
    io.to(userId.toString()).emit('stateUpdate', {
      veBalance: updatedUser.veBalance.toString(),
      sveBalance: updatedUser.sveBalance.toString(),
      tokenBalance: updatedUser.tokenBalance.toString(),
      gemBalance: updatedUser.gemBalance.toString(),
      spinBalance: updatedUser.spinBalance,
      level: updatedUser.level,
      xp: updatedUser.xp,
      currentEnergy: lockedState.currentEnergy,
      energyBankBalance: lockedState.energyBankBalance,
      currentCombo: lockedState.currentCombo,
      currentStreak: lockedState.currentStreak,
      bestStreak: lockedState.bestStreak,
      subscriptionType: updatedUser.subscriptionType,
      subscriptionExpiry: updatedUser.subscriptionExpiry
    });
  }

  return {
    success: true,
    rewardType,
    rewardAmount: finalRewardAmount,
    isMystery,
    isLucky: false,
    leveledUp,
    tapsDetails: tapEvent,
    userBalances: {
      veBalance: updatedUser.veBalance.toString(),
      sveBalance: updatedUser.sveBalance.toString(),
      tokenBalance: updatedUser.tokenBalance.toString(),
      gemBalance: updatedUser.gemBalance.toString(),
      spinBalance: updatedUser.spinBalance,
      fragmentBalance: updatedUser.fragmentBalance.toString(),
      level: updatedUser.level,
      xp: updatedUser.xp
    }
  };
}

// Background evaluator for Missions
async function evaluateMissions(userId, level, totalTaps, bestStreak, currentCombo) {
  try {
    const missions = await Mission.find({ isActive: true });
    for (const mission of missions) {
      let progressVal = 0;
      switch (mission.requirementType) {
        case 'total_taps': progressVal = totalTaps; break;
        case 'streak': progressVal = bestStreak; break;
        case 'combo': progressVal = currentCombo; break;
        case 'upgrade_count':
          // Fetch user's upgrades purchase history count
          const Upgrade = require('../models/upgrade.model');
          progressVal = await Upgrade.countDocuments({ userId });
          break;
      }

      const completed = progressVal >= mission.requirementValue;

      // Update or insert UserMission
      const userMission = await UserMission.findOne({ userId, missionId: mission._id });
      if (!userMission) {
        await UserMission.create({
          userId,
          missionId: mission._id,
          progress: progressVal,
          completed,
          completedAt: completed ? new Date() : null
        });
        if (completed) {
          await triggerMissionCompletionNotification(userId, mission);
        }
      } else if (!userMission.completed) {
        userMission.progress = Math.max(userMission.progress, progressVal);
        if (completed) {
          userMission.completed = true;
          userMission.completedAt = new Date();
        }
        await userMission.save();
        if (completed) {
          await triggerMissionCompletionNotification(userId, mission);
        }
      }
    }
  } catch (err) {
    console.error('Error evaluating missions:', err);
  }
}

async function triggerMissionCompletionNotification(userId, mission) {
  await Notification.create({
    userId,
    category: 'mission',
    title: 'Mission Completed!',
    message: `You completed the "${mission.title}" mission! Go to Missions to claim your rewards!`,
    timestamp: new Date()
  });
  
  // Push Socket notification
  const io = getIO();
  if (io) {
    io.to(userId.toString()).emit('notification', {
      category: 'mission',
      title: 'Mission Completed!',
      message: `You completed the "${mission.title}" mission!`
    });
  }
}

module.exports = {
  processTap,
  calculateRegen,
  getEnergyCapacity,
  getRechargeIntervalMs,
  getEnergyBankCapacity,
  getEfficiencyMultiplier
};
