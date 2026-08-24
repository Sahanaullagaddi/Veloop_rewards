require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const socket = require('./config/socket');
const ConfigService = require('./services/config.service');
const TapSeason = require('./models/tapSeason.model');
const Mission = require('./models/mission.model');
const { runSeed } = require('./services/seed.service');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veloop';

async function bootstrap() {
  // Connect to MongoDB (with MemoryServer fallback if local is not running)
  try {
    console.log('Attempting to connect to local MongoDB database...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('Connected to local MongoDB database successfully.');
  } catch (err) {
    console.log('Local MongoDB connection refused. Starting MongoMemoryServer fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      console.log('MongoMemoryServer initialized at:', memoryUri);
      
      await mongoose.connect(memoryUri);
      console.log('Connected to in-memory database successfully.');

      // Auto-seed in-memory instance
      await runSeed();
    } catch (memErr) {
      console.error('Fatal: Failed to connect to local MongoDB and failed memory server creation:', memErr);
      process.exit(1);
    }
  }

  // Initialize Economy Configuration
  await ConfigService.initializeConfig();
  console.log('Economy configurations initialized');

  // Verify active season
  const activeSeason = await TapSeason.findOne({ status: 'active' });
  if (!activeSeason) {
    const defaultSeason = new TapSeason({
      name: 'Season 3',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)
    });
    await defaultSeason.save();
    console.log('Default Season 3 initialized');
  }

  // Verify default missions
  const missionCount = await Mission.countDocuments({});
  if (missionCount === 0) {
    const defaultMissions = [
      {
        title: 'Novice Tapper',
        description: 'Accumulate 100 total physical taps to get started.',
        rewardType: 'VE',
        rewardAmount: mongoose.Types.Decimal128.fromString('20.0'),
        requirementType: 'total_taps',
        requirementValue: 100,
        isActive: true
      },
      {
        title: 'Streak Master',
        description: 'Achieve a tap streak of 50 consecutive taps.',
        rewardType: 'SVE',
        rewardAmount: mongoose.Types.Decimal128.fromString('5.0'),
        requirementType: 'streak',
        requirementValue: 50,
        isActive: true
      },
      {
        title: 'Combo King',
        description: 'Reach a tap combo multiplier of 20 within the 2-second combo window.',
        rewardType: 'Token',
        rewardAmount: mongoose.Types.Decimal128.fromString('100.0'),
        requirementType: 'combo',
        requirementValue: 20,
        isActive: true
      },
      {
        title: 'Gear Collector',
        description: 'Purchase 3 item upgrades from the Upgrade Drawer.',
        rewardType: 'Gem',
        rewardAmount: mongoose.Types.Decimal128.fromString('2.0'),
        requirementType: 'upgrade_count',
        requirementValue: 3,
        isActive: true
      }
    ];
    await Mission.insertMany(defaultMissions);
    console.log('Default achievements initialized');
  }

  // Create HTTP Server & initialize WebSockets
  const server = http.createServer(app);
  socket.init(server);
  console.log('WebSocket Server initialized');

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrapping error:', err);
});
