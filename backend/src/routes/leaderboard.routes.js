const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const auth = require('../middleware/auth');

// 1. GET /api/leaderboard - Get top 100 players ranked by VE balance
router.get('/', auth, async (req, res) => {
  try {
    const topUsers = await User.find({})
      .select('username level veBalance')
      .sort({ veBalance: -1 })
      .limit(100);

    const formatted = topUsers.map((user, idx) => {
      // Safely parse Decimal128 balance
      const rawBalance = user.veBalance ? parseFloat(user.veBalance.toString()) : 0;
      return {
        rank: idx + 1,
        id: user._id,
        username: user.username,
        level: user.level || 1,
        veBalance: rawBalance
      };
    });

    // Find the current user's rank
    const allUsersSorted = await User.find({}).sort({ veBalance: -1 });
    const myRankIdx = allUsersSorted.findIndex(u => u._id.toString() === req.user.id.toString());
    const currentUser = allUsersSorted[myRankIdx];

    const myRankInfo = {
      rank: myRankIdx !== -1 ? myRankIdx + 1 : null,
      username: currentUser ? currentUser.username : '',
      level: currentUser ? currentUser.level : 1,
      veBalance: currentUser ? parseFloat(currentUser.veBalance.toString()) : 0
    };

    res.json({
      success: true,
      leaderboard: formatted,
      myRank: myRankInfo
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error retrieving leaderboard' });
  }
});

module.exports = router;
