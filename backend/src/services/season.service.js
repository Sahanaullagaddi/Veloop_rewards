const TapSeason = require('../models/tapSeason.model');
const TapLeagueScore = require('../models/tapLeagueScore.model');
const User = require('../models/user.model');
const TapState = require('../models/tapState.model');
const RewardLedger = require('../models/rewardLedger.model');
const Notification = require('../models/notification.model');
const ConfigAudit = require('../models/configAudit.model');
const mongoose = require('mongoose');
const ConfigService = require('./config.service');

// Helper to cast double value safely to Decimal128
function toDecimal128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(6));
}

// Reward table:
// Rank 1: 1000 VE, 100 SVE
// Rank 2-3: 500 VE, 50 SVE
// Rank 4-10: 200 VE, 20 SVE
// Rank 11-50: 100 VE
// Rank 51-100: 50 VE
function getLeagueRewards(rank) {
  const tier = ConfigService.get('league_rewards').find(reward => rank <= reward.maxRank);
  if (!tier) return null;
  return { VE: tier.ve, SVE: tier.sve, Token: tier.tokens, Spin: tier.spins, Gem: tier.gems };
}

async function triggerSeasonRollover(adminId, reason = 'Scheduled season rollover') {
  // Find current active season
  const activeSeason = await TapSeason.findOne({ status: 'active' });
  if (!activeSeason) {
    throw new Error('No active season to roll over');
  }

  // 1. Freeze active season
  activeSeason.status = 'frozen';
  activeSeason.endDate = new Date();
  await activeSeason.save();

  // 2. Rank users from TapLeagueScore
  const rankings = await TapLeagueScore.find({ seasonId: activeSeason._id })
    .sort({ score: -1, lastUpdated: 1 })
    .limit(100)
    .populate('userId');

  const distributedRewards = [];

  // 3. Distribute rewards
  for (let i = 0; i < rankings.length; i++) {
    const rank = i + 1;
    const item = rankings[i];
    if (!item.userId) continue;

    const rewards = getLeagueRewards(rank);
    if (rewards) {
      const updates = {};
      const requestIdBase = `season-${activeSeason._id}-rank-${rank}`;

      const rewardFields = { VE: 'veBalance', SVE: 'sveBalance', Token: 'tokenBalance', Gem: 'gemBalance', Spin: 'spinBalance' };
      for (const [currency, amount] of Object.entries(rewards)) {
        if (currency === 'VE' || currency === 'SVE' || currency === 'Token' || currency === 'Gem' || currency === 'Spin') {
          if (amount > 0) {
            updates[rewardFields[currency]] = currency === 'Spin' ? amount : toDecimal128(amount);
            await RewardLedger.create({
              userId: item.userId._id,
              requestId: `${requestIdBase}-${currency.toLowerCase()}`,
              type: 'season_reward',
              amount: toDecimal128(amount),
              currency,
              timestamp: new Date(),
              details: { rank, seasonName: activeSeason.name }
            });
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: item.userId._id }, { $inc: updates });
      }

      // Add Notification
      await Notification.create({
        userId: item.userId._id,
        category: 'season',
        title: `Season Rollover Rewards!`,
        message: `You placed #${rank} in ${activeSeason.name}! Your rewards: ${rewards.VE} VE ${rewards.SVE > 0 ? `and ${rewards.SVE} SVE` : ''} have been credited.`,
        timestamp: new Date()
      });

      distributedRewards.push({
        userId: item.userId._id,
        username: item.userId.username,
        rank,
        score: item.score,
        rewards
      });
    }
  }

  // 4. Archive the frozen season
  activeSeason.status = 'archived';
  await activeSeason.save();

  // 5. Activate next season
  const nextSeasonNumber = parseInt(activeSeason.name.replace(/[^0-9]/g, '')) + 1 || 1;
  const nextSeason = new TapSeason({
    name: `Season ${nextSeasonNumber}`,
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days season
  });
  await nextSeason.save();

  // Update currentTapSeasonId on all users
  await User.updateMany({}, { currentTapSeasonId: nextSeason._id });

  // 6. Reset Tap Efficiency upgrades for all users
  await TapState.updateMany({}, { tapEfficiencyLevel: 0 });

  // Record audit log
  await ConfigAudit.create({
    adminId,
    key: 'season_rollover',
    oldValue: activeSeason.name,
    newValue: nextSeason.name,
    reason: `${reason}. Distributed prizes to ${distributedRewards.length} users.`,
    timestamp: new Date()
  });

  return {
    previousSeason: activeSeason.name,
    newSeason: nextSeason.name,
    distributedCount: distributedRewards.length,
    rewardsLedger: distributedRewards
  };
}

module.exports = {
  triggerSeasonRollover,
  getLeagueRewards
};
