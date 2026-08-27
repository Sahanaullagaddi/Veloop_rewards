const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const tapRoutes = require('./routes/tap.routes');
const adminRoutes = require('./routes/admin.routes');
const referralRoutes = require('./routes/referral.routes');
const checkinRoutes = require('./routes/checkin.routes');
const adminWithdrawalRoutes = require('./routes/adminWithdrawal.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tap', tapRoutes);
app.use('/api/admin/tap-economy', adminRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/admin/withdrawals', adminWithdrawalRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'VELoop Tap & Earn API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
