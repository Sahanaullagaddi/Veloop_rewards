const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const WithdrawalRequest = require('../models/withdrawal.model');
const RewardLedger = require('../models/rewardLedger.model');
const auth = require('../middleware/auth');
const { getIO } = require('../config/socket');

function toDecimal128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(6));
}

// Admin authorization middleware
async function adminOnly(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Admin validation error' });
  }
}

// 1. GET /api/admin/withdrawals - List all payouts (Admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({})
      .populate('userId', 'username level')
      .sort({ createdAt: -1 });

    const formatted = requests.map(req => {
      if (!req.userId) return null;
      return {
        id: req._id,
        username: req.userId.username,
        amount: parseFloat(req.amount.toString()),
        upiId: req.upiId,
        status: req.status,
        txRef: req.txRef,
        adminComment: req.adminComment,
        createdAt: req.createdAt,
        processedAt: req.processedAt
      };
    }).filter(Boolean);

    res.json({ success: true, withdrawals: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching payouts list' });
  }
});

// 2. POST /api/admin/withdrawals/:id/approve - Approve withdrawal (Admin only)
router.post('/:id/approve', auth, adminOnly, async (req, res) => {
  const requestId = req.params.id;
  const { txRef, adminComment } = req.body;

  if (!txRef) {
    return res.status(400).json({ success: false, message: 'UPI transaction reference ID (txRef) is required.' });
  }

  try {
    const request = await WithdrawalRequest.findOne({ _id: requestId, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending withdrawal request not found.' });
    }

    request.status = 'approved';
    request.txRef = txRef;
    request.adminComment = adminComment || '';
    request.processedAt = new Date();
    await request.save();

    res.json({ success: true, message: 'Withdrawal approved successfully!', withdrawal: request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error approving withdrawal' });
  }
});

// 3. POST /api/admin/withdrawals/:id/reject - Reject withdrawal (Admin only) - REFUNDS VE balance to user
router.post('/:id/reject', auth, adminOnly, async (req, res) => {
  const requestId = req.params.id;
  const { adminComment } = req.body;

  try {
    const request = await WithdrawalRequest.findOne({ _id: requestId, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending withdrawal request not found.' });
    }

    request.status = 'rejected';
    request.adminComment = adminComment || 'Rejected by Admin';
    request.processedAt = new Date();
    await request.save();

    const amt = parseFloat(request.amount.toString());

    // Refund VE balance to user atomically
    const user = await User.findOneAndUpdate(
      { _id: request.userId },
      { $inc: { veBalance: toDecimal128(amt) } },
      { new: true }
    );

    // Create a ledger log entry for the refund
    const refundRequestId = `refund-${requestId}`;
    await RewardLedger.create({
      userId: request.userId,
      requestId: refundRequestId,
      type: 'mission_claim', // utilizing ledger claim type for refund credit
      amount: toDecimal128(amt),
      currency: 'VE',
      timestamp: new Date(),
      details: { withdrawalRejectId: requestId, reason: request.adminComment }
    });

    // Emit liveState socket update to the user
    const io = getIO();
    if (io && user) {
      io.to(user._id.toString()).emit('stateUpdate', {
        veBalance: user.veBalance.toString(),
        sveBalance: user.sveBalance.toString(),
        tokenBalance: user.tokenBalance.toString(),
        gemBalance: user.gemBalance.toString(),
        spinBalance: user.spinBalance
      });
    }

    res.json({ success: true, message: 'Withdrawal request rejected and VE refunded to user wallet.', withdrawal: request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error rejecting withdrawal request' });
  }
});

module.exports = router;
