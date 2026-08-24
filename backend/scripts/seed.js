require('dotenv').config();
const mongoose = require('mongoose');
const { runSeed } = require('../src/services/seed.service');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veloop';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB at', MONGODB_URI);
    await runSeed();
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
