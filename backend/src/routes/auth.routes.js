const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TapState = require('../models/tapState.model');
const auth = require('../middleware/auth');
const TapEconomyService = require('../services/tapEconomy.service');
const { inferGenderFromName } = require('../utils/genderDetector');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, refCode, gender } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please provide username and password' });
  }

  try {
    let existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const hashedPassword = hashPassword(password);
    
    // Generate unique referral code
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const referralCode = `${cleanUsername}${randomSuffix}`;

    let resolvedGender = gender;
    if (!resolvedGender || !['male', 'female', 'other'].includes(resolvedGender)) {
      resolvedGender = inferGenderFromName(username);
    }

    const user = new User({
      username,
      password: hashedPassword,
      referralCode,
      gender: resolvedGender
    });

    // Check if referred by someone
    if (refCode) {
      const referrer = await User.findOne({ referralCode: refCode.trim() });
      if (referrer) {
        user.referredBy = referrer._id;
      }
    }

    await user.save();

    // If referred, create Referral record
    if (user.referredBy) {
      const Referral = require('../models/referral.model');
      await Referral.create({
        referrerId: user.referredBy,
        refereeId: user._id
      });
    }

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
        level: user.level,
        referralCode: user.referralCode
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
        level: user.level,
        referralCode: user.referralCode
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
    if (user) {
      if ((!user.gender || user.gender === 'male') && inferGenderFromName(user.username) === 'female') {
        user.gender = 'female';
        await User.updateOne({ _id: user._id }, { $set: { gender: 'female' } });
      }

      const effectiveTaps = Math.max(user.total_taps || 0, Math.floor(parseFloat(user.veBalance?.toString() || 0)));
      const correctLevel = TapEconomyService.calculateLevelFromTaps
        ? TapEconomyService.calculateLevelFromTaps(effectiveTaps)
        : (effectiveTaps < 2000 ? 1 : Math.min(10, Math.floor(effectiveTaps / 1000)));

      if (user.level !== correctLevel || (user.total_taps || 0) < effectiveTaps) {
        user.level = correctLevel;
        user.total_taps = effectiveTaps;
        await User.updateOne({ _id: user._id }, { $set: { level: correctLevel, total_taps: effectiveTaps } });
      }

      const character_image_url = TapEconomyService.getCharacterImageUrl
        ? TapEconomyService.getCharacterImageUrl(user.gender, user.level)
        : (user.gender === 'female' ? `/assets/characters/female/character_f_lvl${user.level}.png` : `/assets/characters/male/character_lvl${user.level}.png`);

      return res.json({
        success: true,
        user: {
          ...user.toObject(),
          character_image_url
        }
      });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching user details' });
  }
});

module.exports = router;
