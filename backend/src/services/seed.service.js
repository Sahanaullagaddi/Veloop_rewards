const mongoose = require('mongoose');
const User = require('../models/user.model');
const TapState = require('../models/tapState.model');
const TapSeason = require('../models/tapSeason.model');
const TapLeagueScore = require('../models/tapLeagueScore.model');
const RewardLedger = require('../models/rewardLedger.model');
const Notification = require('../models/notification.model');
const Mission = require('../models/mission.model');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function toDecimal128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(6));
}

async function runSeed() {
  console.log('Seeding dynamic mock collections...');

  // Clear collections
  await User.deleteMany({});
  await TapState.deleteMany({});
  await TapSeason.deleteMany({});
  await TapLeagueScore.deleteMany({});
  await RewardLedger.deleteMany({});
  await Notification.deleteMany({});
  await Mission.deleteMany({});

  // Seed active season
  const activeSeason = new TapSeason({
    name: 'Season 3',
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000) // 4d 12h left
  });
  await activeSeason.save();

  // Seed archived season
  const archivedSeason = new TapSeason({
    name: 'Season 2',
    status: 'archived',
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  });
  await archivedSeason.save();

  // Seed default missions
  const defaultMissions = [
    {
      title: 'Novice Tapper',
      description: 'Accumulate 10 total physical taps to get started.',
      rewardType: 'VE',
      rewardAmount: toDecimal128(20.0),
      requirementType: 'total_taps',
      requirementValue: 10,
      isActive: true
    },
    {
      title: 'Streak Master',
      description: 'Achieve a tap streak of 15 consecutive taps.',
      rewardType: 'SVE',
      rewardAmount: toDecimal128(5.0),
      requirementType: 'streak',
      requirementValue: 15,
      isActive: true
    },
    {
      title: 'Combo King',
      description: 'Reach a tap combo multiplier of 10 within the 2-second combo window.',
      rewardType: 'Token',
      rewardAmount: toDecimal128(100.0),
      requirementType: 'combo',
      requirementValue: 10,
      isActive: true
    },
    {
      title: 'Gear Collector',
      description: 'Purchase 2 item upgrades from the Upgrade Drawer.',
      rewardType: 'Gem',
      rewardAmount: toDecimal128(2.0),
      requirementType: 'upgrade_count',
      requirementValue: 2,
      isActive: true
    }
  ];
  await Mission.insertMany(defaultMissions);

  // Seed admin user
  const adminUser = new User({
    username: 'admin',
    password: hashPassword('admin123'),
      isAdmin: true,
    level: 1,
    currentTapSeasonId: activeSeason._id
  });
  await adminUser.save();

  // Seed mock players
  const mockPlayers = [
    { username: 'neo', level: 5, xp: 120, ve: 1540.5, sve: 32.0, tokens: 420.0, gems: 8.5, spins: 3, fragments: 45.0, score: 1250 },
    { username: 'trinity', level: 6, xp: 450, ve: 2310.0, sve: 45.0, tokens: 680.0, gems: 12.0, spins: 5, fragments: 80.0, score: 2150 },
    { username: 'morpheus', level: 7, xp: 90, ve: 4120.2, sve: 80.0, tokens: 1250.0, gems: 24.8, spins: 8, fragments: 110.0, score: 3450 },
    { username: 'smith', level: 4, xp: 300, ve: 820.0, sve: 12.0, tokens: 190.0, gems: 3.2, spins: 1, fragments: 10.0, score: 850 },
    { username: 'cypher', level: 2, xp: 80, ve: 150.0, sve: 2.0, tokens: 45.0, gems: 0.8, spins: 0, fragments: 5.0, score: 190 }
  ];

  for (const player of mockPlayers) {
    const user = new User({
      username: player.username,
      password: hashPassword(`${player.username}123`),
      level: player.level,
      xp: player.xp,
      veBalance: toDecimal128(player.ve),
      sveBalance: toDecimal128(player.sve),
      tokenBalance: toDecimal128(player.tokens),
      gemBalance: toDecimal128(player.gems),
      spinBalance: player.spins,
      fragmentBalance: toDecimal128(player.fragments),
      currentTapSeasonId: activeSeason._id,
      badges: [
        { id: 'welcome', name: 'VELoop Welcome Badge', unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      ]
    });
    await user.save();

    // Create TapState
    const tapState = new TapState({
      userId: user._id,
      energyCapacityLevel: player.level >= 5 ? 3 : 1,
      currentEnergy: 420,
      energyBankLevel: player.level >= 5 ? 2 : 1,
      energyBankBalance: 350,
      rechargeSpeedLevel: player.level >= 5 ? 2 : 1,
      tapEfficiencyLevel: player.level >= 5 ? 1 : 0,
      totalAcceptedTaps: player.score
    });
    await tapState.save();

    // Create TapLeagueScore
    const leagueScore = new TapLeagueScore({
      userId: user._id,
      seasonId: activeSeason._id,
      score: player.score,
      lastUpdated: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
    });
    await leagueScore.save();

    // Seed mock transactions
    const requestIdBase = `seed-${user._id}`;
    await RewardLedger.create([
      {
        userId: user._id,
        requestId: `${requestIdBase}-init-ve`,
        type: 'tap',
        amount: toDecimal128(player.ve * 0.7),
        currency: 'VE',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: user._id,
        requestId: `${requestIdBase}-init-sve`,
        type: 'mission_claim',
        amount: toDecimal128(player.sve),
        currency: 'SVE',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        details: { title: 'Welcome Mission' }
      },
      {
        userId: user._id,
        requestId: `${requestIdBase}-init-tokens`,
        type: 'tap',
        amount: toDecimal128(player.tokens),
        currency: 'Token',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
      }
    ]);

    // Seed Notifications
    await Notification.create([
      {
        userId: user._id,
        category: 'system',
        title: 'Welcome to VELoop Tap & Earn!',
        message: 'Glad to have you inside the fintech module. Start tapping the central core to generate yield and climb the leagues.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isRead: true
      },
      {
        userId: user._id,
        category: 'season',
        title: 'Season 3 is Ending!',
        message: 'Only 4 days and 12 hours remaining before rankings freeze. Climb to the top 100 to earn up to 1000 VE!',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isRead: false
      }
    ]);
  }
  console.log('Database seeded successfully.');
}

module.exports = {
  runSeed
};
