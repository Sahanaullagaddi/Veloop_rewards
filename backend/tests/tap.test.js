require('dotenv').config();
process.env.JWT_SECRET = 'test-secret-key-12345';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const TapState = require('../src/models/tapState.model');
const TapSeason = require('../src/models/tapSeason.model');
const TapLeagueScore = require('../src/models/tapLeagueScore.model');
const RewardLedger = require('../src/models/rewardLedger.model');
const ConfigService = require('../src/services/config.service');
const socket = require('../src/config/socket');

let token;
let userId;
let mongoServer;

beforeAll(async () => {
  // Use MongoMemoryServer dynamically if possible, else fallback to local test DB
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Jest: Connected to MongoMemoryServer at', uri);
  } catch (err) {
    const uri = 'mongodb://127.0.0.1:27017/veloop_test';
    await mongoose.connect(uri);
    console.log('Jest: Connected to fallback local MongoDB at', uri);
  }

  // Start dummy socket server to satisfy module imports
  const http = require('http');
  const server = http.createServer(app);
  socket.init(server);

  // Initialize config
  await ConfigService.initializeConfig();

  // Create active season
  await TapSeason.deleteMany({});
  const season = new TapSeason({
    name: 'Season 3 Test',
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  await season.save();
}, 60000); // 60s timeout for setting up MongoMemoryServer download if needed

afterAll(async () => {
  // Clean collections and close connections
  try {
    if (mongoose.connection.readyState !== 0) {
      await User.deleteMany({});
      await TapState.deleteMany({});
      await TapSeason.deleteMany({});
      await TapLeagueScore.deleteMany({});
      await RewardLedger.deleteMany({});
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
});

describe('Auth & Tap Module Integration Tests', () => {
  const username = `testuser_${Date.now()}`;
  const password = 'testpassword123';

  test('POST /api/auth/register should create user and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, password });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    
    token = res.body.token;
    userId = res.body.user.id;
  });

  test('POST /api/auth/login should authenticate user and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  const baseTime = Date.now();

  test('POST /api/tap - first tap should succeed', async () => {
    const requestId = `test-tap-1-${Date.now()}`;
    const timestamp = new Date(baseTime).toISOString();
    const res = await request(app)
      .post('/api/tap')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestId, timestamp });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rewardType).toBeDefined();
    expect(res.body.rewardAmount).toBeDefined();
  });

  test('POST /api/tap - consecutive tap under 200ms should trigger rate limit (429 Too Fast)', async () => {
    const requestId = `test-tap-2-${Date.now()}`;
    // Explicitly send a timestamp only 10ms after the first tap to guarantee triggering rate limiter
    const timestamp = new Date(baseTime + 10).toISOString();
    const res = await request(app)
      .post('/api/tap')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestId, timestamp });

    expect(res.statusCode).toEqual(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Too Fast');
  });

  test('POST /api/tap - same requestId should return cached result (Idempotency)', async () => {
    const requestId = `test-tap-idempotency-${Date.now()}`;
    
    // First call
    const res1 = await request(app)
      .post('/api/tap')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestId });
    expect(res1.statusCode).toEqual(200);

    // Wait 250ms to bypass rate limiting
    await new Promise(r => setTimeout(r, 250));

    // Replay call
    const res2 = await request(app)
      .post('/api/tap')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestId });

    expect(res2.statusCode).toEqual(200);
    expect(res2.body.duplicate).toBe(true);
    expect(res2.body.rewardType).toEqual(res1.body.rewardType);
    expect(res2.body.rewardAmount).toEqual(res1.body.rewardAmount);
  });

  test('POST /api/tap/upgrade - should purchase energy capacity upgrade atomically', async () => {
    // Manually add VE balance to test user
    await User.updateOne({ _id: userId }, { veBalance: mongoose.Types.Decimal128.fromString('500.0') });

    const res = await request(app)
      .post('/api/tap/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgradeType: 'energy_capacity' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newLevel).toEqual(2);
  });

  test('POST /api/tap/shield/purchase - should activate energy shield', async () => {
    // Ensure sufficient VE balance
    await User.updateOne({ _id: userId }, { veBalance: mongoose.Types.Decimal128.fromString('150.0') });
    // Reset shield cooldown
    await TapState.updateOne({ userId }, { shieldCooldownExpiry: null });

    const res = await request(app)
      .post('/api/tap/shield/purchase')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.activeShieldExpiry).toBeDefined();
  });
});
