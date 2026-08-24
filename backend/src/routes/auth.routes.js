const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TapState = require('../models/tapState.model');
const auth = require('../middleware/auth');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please provide username and password' });
  }

  try {
    let existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const hashedPassword = hashPassword(password);
    const user = new User({
      username,
      password: hashedPassword
    });
    await user.save();

    // Create default TapState
    const tapState = new TapState({ userId: user._id });
    await tapState.save();

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'veloop-tap-earn-super-secret-key-2026',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        level: user.level
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please provide username and password' });
  }

  try {
    const hashedPassword = hashPassword(password);
    const user = await User.findOne({ username, password: hashedPassword });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Ensure TapState exists
    let tapState = await TapState.findOne({ userId: user._id });
    if (!tapState) {
      tapState = new TapState({ userId: user._id });
      await tapState.save();
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'veloop-tap-earn-super-secret-key-2026',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        level: user.level
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching user details' });
  }
});

module.exports = router;
