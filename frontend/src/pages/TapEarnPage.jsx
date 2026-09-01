import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import TapCircle from '../components/TapCircle';
import BoostsRewardsRow from '../components/BoostsRewardsRow';
import DailyCheckinModal from '../components/DailyCheckinModal';
import { 
  Zap, Trophy, Award, Gift, ArrowRight, Shield, Layers, X, ChevronRight, Check, Activity, Sparkles, Calendar
} from 'lucide-react';
import { API_URL } from '../config';
import styles from './TapEarnPage.module.css';

export default function TapEarnPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { liveState, setLiveState, refreshTapState } = useSocket();

  // Modal / Drawer visibility states
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showShieldModal, setShowShieldModal] = useState(false);
  const [showLuckyModal, setShowLuckyModal] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showLeadersModal, setShowLeadersModal] = useState(false);
  const [showStaking, setShowStaking] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  // Tasks Tab state
  const [taskTab, setTaskTab] = useState('milestones');
  const [socialFollowed, setSocialFollowed] = useState(false);
  const [telegramJoined, setTelegramJoined] = useState(false);

  // Leaderboard modal states
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [myLeaderRank, setMyLeaderRank] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Staking states
  const [stakingList, setStakingList] = useState([]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeLockPeriod, setStakeLockPeriod] = useState(3);

  // PvP States
  const [showPvp, setShowPvp] = useState(false);
  const [pvpState, setPvpState] = useState('idle'); // idle, searching, playing, finished
  const [pvpOpponent, setPvpOpponent] = useState(null);
  const [pvpTimer, setPvpTimer] = useState(15);
  const [pvpUserTaps, setPvpUserTaps] = useState(0);
  const [pvpOpponentTaps, setPvpOpponentTaps] = useState(0);
  const [pvpResult, setPvpResult] = useState(null);

  // UPI Payment States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState('');
  const [paymentUpi, setPaymentUpi] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState('');

  // Lucky Spin states
  const [spinning, setSpinning] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);
  const [spinReward, setSpinReward] = useState(null);
  const [luckyEligible, setLuckyEligible] = useState(false);
  const [luckyDetails, setLuckyDetails] = useState(null);

  // Active Mission states
  const [missionsList, setMissionsList] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  // Countdowns
  const [rechargeTime, setRechargeTime] = useState('0m 0s');
  const [boostTimeLeft, setBoostTimeLeft] = useState(0);
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0);
  const [shieldCooldownLeft, setShieldCooldownLeft] = useState(0);

  const fetchStakingVaults = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/staking/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStakingList(data.vaults);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLockStaking = async () => {
    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum lock is 10.0 VE.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/tap/staking/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt, lockPeriodDays: stakeLockPeriod })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Locked ${amt} VE into ${stakeLockPeriod}d Yield Vault!`);
        setStakeAmount('');
        refreshTapState();
        fetchStakingVaults();
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimStaking = async (id, isEarly) => {
    if (isEarly && !window.confirm('Terminate lock early? This applies a 5% principal burn penalty and returns 0 SVE interest.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/tap/staking/${id}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setLiveState(prev => ({
          ...prev,
          veBalance: data.userBalances.veBalance,
          sveBalance: data.userBalances.sveBalance,
          tokenBalance: data.userBalances.tokenBalance,
          gemBalance: data.userBalances.gemBalance,
          spinBalance: data.userBalances.spinBalance
        }));
        fetchStakingVaults();
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchaseSubscription = async (planType) => {
    try {
      const res = await fetch(`${API_URL}/api/tap/subscription/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planType })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setLiveState(prev => ({
          ...prev,
          veBalance: data.userBalances.veBalance,
          sveBalance: data.userBalances.sveBalance,
          tokenBalance: data.userBalances.tokenBalance,
          gemBalance: data.userBalances.gemBalance,
          spinBalance: data.userBalances.spinBalance,
          subscriptionType: data.subscriptionType,
          subscriptionExpiry: data.subscriptionExpiry
        }));
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSubscriptionPayment = (planType) => {
    setPaymentPlan(planType);
    setPaymentUpi('');
    setPaymentMsg('');
    setShowPaymentModal(true);
  };

  const handleConfirmUpiPayment = async (e) => {
    e.preventDefault();
    setPaymentMsg('');

    if (!paymentUpi || !paymentUpi.includes('@')) {
      setPaymentMsg('Please enter a valid UPI ID (must contain @).');
      return;
    }

    setPaying(true);
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/tap/subscription/purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ planType: paymentPlan })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          setLiveState(prev => ({
            ...prev,
            veBalance: data.userBalances.veBalance,
            sveBalance: data.userBalances.sveBalance,
            tokenBalance: data.userBalances.tokenBalance,
            gemBalance: data.userBalances.gemBalance,
            spinBalance: data.userBalances.spinBalance,
            subscriptionType: data.subscriptionType,
            subscriptionExpiry: data.subscriptionExpiry
          }));
          setShowPaymentModal(false);
        } else {
          setPaymentMsg(data.message);
        }
      } catch (err) {
        console.error(err);
        setPaymentMsg('Payment settlement failed. Try again.');
      } finally {
        setPaying(false);
      }
    }, 1500);
  };

  const startPvpMatchmaking = () => {
    setPvpState('searching');
    setPvpUserTaps(0);
    setPvpOpponentTaps(0);
    setPvpTimer(15);
    setPvpResult(null);

    setTimeout(() => {
      const opponents = [
        { name: 'Trinity', level: 6, avatar: 'TR' },
        { name: 'Morpheus', level: 9, avatar: 'MO' },
        { name: 'Neo-Impersonator', level: 12, avatar: 'NI' }
      ];
      const selected = opponents[Math.floor(Math.random() * opponents.length)];
      setPvpOpponent(selected);
      setPvpState('playing');
    }, 3000);
  };

  const handlePvpTap = () => {
    if (pvpState !== 'playing') return;
    setPvpUserTaps(prev => prev + 1);
  };

  const resolvePvpMatch = async (finalUserTaps, finalOppTaps) => {
    const userWon = finalUserTaps >= finalOppTaps;
    const outcome = userWon ? 'victory' : 'defeat';

    try {
      const res = await fetch(`${API_URL}/api/tap/pvp/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userTaps: finalUserTaps,
          opponentTaps: finalOppTaps,
          result: outcome
        })
      });
      const data = await res.json();
      if (data.success) {
        setPvpResult({
          message: data.message,
          reward: data.rewardAmount,
          won: userWon
        });
        setLiveState(prev => ({
          ...prev,
          veBalance: data.userBalances.veBalance,
          sveBalance: data.userBalances.sveBalance,
          tokenBalance: data.userBalances.tokenBalance,
          gemBalance: data.userBalances.gemBalance,
          spinBalance: data.userBalances.spinBalance
        }));
        setPvpState('finished');
      } else {
        showToast(data.message);
        setPvpState('idle');
      }
    } catch (err) {
      console.error(err);
      setPvpState('idle');
    }
  };

  // PvP Ticking Play Loop
  useEffect(() => {
    if (pvpState !== 'playing') return;

    const gameInterval = setInterval(() => {
      setPvpTimer(prev => {
        if (prev <= 1) {
          clearInterval(gameInterval);
          return 0;
        }
        return prev - 1;
      });

      // Opponent taps randomly between 3 and 7 taps per second
      setPvpOpponentTaps(prev => prev + Math.floor(Math.random() * 5) + 3);
    }, 1000);

    return () => clearInterval(gameInterval);
  }, [pvpState]);

  // Resolve trigger when timer hits 0
  useEffect(() => {
    if (pvpState === 'playing' && pvpTimer === 0) {
      resolvePvpMatch(pvpUserTaps, pvpOpponentTaps);
    }
  }, [pvpTimer, pvpState]);

  useEffect(() => {
    if (showStaking) {
      fetchStakingVaults();
    }
  }, [showStaking]);

  useEffect(() => {
    if (!showStaking || stakingList.length === 0) return;

    const interval = setInterval(() => {
      setStakingList(prev => prev.map(vault => {
        const now = Date.now();
        const timeElapsedMs = now - new Date(vault.startDate);
        // Simulated: 1 minute = 1 day of APY compounding
        const simulatedDaysElapsed = Math.min(vault.lockPeriodDays, timeElapsedMs / (60 * 1000));
        
        const principal = parseFloat(vault.principalAmount);
        const r = vault.apyRate;
        const accrued = principal * Math.pow(1 + r / 365, simulatedDaysElapsed);
        const interestEarned = Math.max(0, accrued - principal);

        return {
          ...vault,
          interestEarned: interestEarned.toFixed(6),
          isReady: now >= new Date(vault.unlockDate)
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [showStaking, stakingList.length]);

  useEffect(() => {
    if (token) {
      checkCheckinEligibility();
    }
  }, [token]);

  const checkCheckinEligibility = async () => {
    try {
      const res = await fetch(`${API_URL}/api/checkin/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.eligible) {
        setShowCheckin(true);
      }
    } catch (err) {
      console.error('Checkin check failed:', err);
    }
  };

  useEffect(() => {
    if (!liveState) return;

    checkLuckyEligibility();

    const timer = setInterval(() => {
      const now = Date.now();

      if (liveState.activeBoostExpiry) {
        const diff = new Date(liveState.activeBoostExpiry) - now;
        setBoostTimeLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
      } else {
        setBoostTimeLeft(0);
      }

      if (liveState.activeShieldExpiry) {
        const diff = new Date(liveState.activeShieldExpiry) - now;
        setShieldTimeLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
      } else {
        setShieldTimeLeft(0);
      }

      if (liveState.shieldCooldownExpiry) {
        const diff = new Date(liveState.shieldCooldownExpiry) - now;
        setShieldCooldownLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
      } else {
        setShieldCooldownLeft(0);
      }

      const capLevel = liveState.energyCapacityLevel || 1;
      const cap = 500 + (capLevel - 1) * 100;
      if (liveState.currentEnergy < cap) {
        const speedLevel = liveState.rechargeSpeedLevel || 1;
        const reductionFactor = 1 - Math.min(0.8, (speedLevel - 1) * 0.1);
        const intervalMins = Math.max(3, 20 * reductionFactor);
        const intervalMs = intervalMins * 60 * 1000;
        
        const nextTime = intervalMs - (now % intervalMs);
        const mins = Math.floor(nextTime / 60000);
        const secs = Math.floor((nextTime % 60000) / 1000);
        setRechargeTime(`${mins}m ${secs}s`);
      } else {
        setRechargeTime('Full');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [liveState]);

  if (!liveState) return <div className="loading-screen">Syncing Veloop State...</div>;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const checkLuckyEligibility = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/lucky`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLuckyEligible(data.eligible);
        setLuckyDetails(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivateBoost = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/boost/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLiveState(prev => ({ ...prev, activeBoostExpiry: data.activeBoostExpiry }));
        showToast('Active Boost Activated! 2x effective taps multiplier applied.');
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimDailyChallenge = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/daily-challenge/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLiveState(prev => ({
          ...prev,
          tokenBalance: data.tokenBalance,
          dailyChallengeClaimed: true
        }));
        showToast('Claimed 50 Tokens daily challenge reward!');
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefillEnergy = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/energy/refill`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLiveState(prev => ({ ...prev, currentEnergy: data.currentEnergy }));
        showToast('Energy fully refilled to 100%!');
      } else {
        showToast(data.message || 'Error refilling energy');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openLeaderboardModal = async () => {
    setShowLeadersModal(true);
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/league`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboardData(data.leaderboard || []);
        setMyLeaderRank(data.myRank);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleFollowTwitter = () => {
    window.open('https://twitter.com', '_blank');
    if (!socialFollowed) {
      setSocialFollowed(true);
      setLiveState(prev => {
        if (!prev) return null;
        let raw = prev.veBalance;
        if (typeof raw === 'object' && raw.$numberDecimal) raw = raw.$numberDecimal;
        let bal = parseFloat(raw || 0) + 50;
        return {
          ...prev,
          veBalance: typeof prev.veBalance === 'object' && prev.veBalance.$numberDecimal ? { $numberDecimal: bal.toString() } : bal
        };
      });
      showToast('🎁 Claimed +50 VE for following on X!');
    }
  };

  const handleJoinTelegram = () => {
    window.open('https://t.me', '_blank');
    if (!telegramJoined) {
      setTelegramJoined(true);
      setLiveState(prev => {
        if (!prev) return null;
        let raw = prev.veBalance;
        if (typeof raw === 'object' && raw.$numberDecimal) raw = raw.$numberDecimal;
        let bal = parseFloat(raw || 0) + 50;
        return {
          ...prev,
          veBalance: typeof prev.veBalance === 'object' && prev.veBalance.$numberDecimal ? { $numberDecimal: bal.toString() } : bal
        };
      });
      showToast('🎁 Claimed +50 VE for joining Telegram!');
    }
  };

  const handleBuyUpgrade = async (type) => {
    try {
      const res = await fetch(`${API_URL}/api/tap/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ upgradeType: type })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Upgrade purchased: Level ${data.newLevel}`);
        refreshTapState();
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuyShield = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/shield/purchase`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLiveState(prev => ({
          ...prev,
          veBalance: data.veBalance,
          activeShieldExpiry: data.activeShieldExpiry,
          shieldCooldownExpiry: data.shieldCooldownExpiry
        }));
        showToast('Energy Shield Activated! 90% energy protection.');
        setShowShieldModal(false);
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertFragments = async () => {
    const amt = Math.floor(parseFloat(liveState.fragmentBalance));
    if (amt < 10) {
      showToast('Need at least 10 Fragments to convert.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/tap/fragments/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();
      if (data.success) {
        setLiveState(prev => ({
          ...prev,
          veBalance: data.veBalance,
          fragmentBalance: data.fragmentBalance
        }));
        showToast(`Converted ${amt} Fragments into ${data.rewardAmount} VE.`);
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openMissionsModal = async () => {
    setShowMissions(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/missions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMissionsList(data.missions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimMission = async (id, title) => {
    try {
      const res = await fetch(`${API_URL}/api/tap/missions/${id}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Claimed reward for "${title}"!`);
        setLiveState(prev => ({
          ...prev,
          veBalance: data.userBalances.veBalance,
          sveBalance: data.userBalances.sveBalance,
          tokenBalance: data.userBalances.tokenBalance,
          gemBalance: data.userBalances.gemBalance,
          spinBalance: data.userBalances.spinBalance
        }));
        const listRes = await fetch(`${API_URL}/api/tap/missions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const listData = await listRes.json();
        if (listData.success) {
          setMissionsList(listData.missions);
        }
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLuckySpin = async () => {
    if (spinning) return;
    setSpinning(true);
    setSpinReward(null);

    const reqId = `spin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      const res = await fetch(`${API_URL}/api/tap/lucky/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: reqId })
      });
      const data = await res.json();
      if (data.success) {
        const rewardsOrder = [
          { type: 'VE', amt: 10, idx: 0 },
          { type: 'VE', amt: 50, idx: 1 },
          { type: 'SVE', amt: 5, idx: 2 },
          { type: 'Gem', amt: 10, idx: 3 },
          { type: 'Token', amt: 100, idx: 4 },
          { type: 'Token', amt: 500, idx: 5 }
        ];
        
        const rewardMatch = rewardsOrder.find(r => r.type === data.rewardType && r.amt === data.rewardAmount) || { idx: 0 };
        const slotAngle = rewardMatch.idx * 60;
        const totalSpinDeg = 3600 - slotAngle;

        setSpinDeg(totalSpinDeg);

        setTimeout(() => {
          setSpinning(false);
          setSpinReward(data);
          setLiveState(prev => ({
            ...prev,
            veBalance: data.userBalances.veBalance,
            sveBalance: data.userBalances.sveBalance,
            tokenBalance: data.userBalances.tokenBalance,
            gemBalance: data.userBalances.gemBalance,
            spinBalance: data.userBalances.spinBalance
          }));
          checkLuckyEligibility();
        }, 5000);
      } else {
        setSpinning(false);
        showToast(data.message);
      }
    } catch (err) {
      setSpinning(false);
      console.error(err);
    }
  };

  const getUpgradeCost = (type, currentLevel) => {
    if (type === 'energy_capacity') return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
    if (type === 'recharge_speed') return Math.floor(50 * Math.pow(1.6, currentLevel - 1));
    if (type === 'energy_bank') return 200;
    if (type === 'tap_efficiency') return [0, 10, 25, 50][currentLevel + 1] || 9999;
    if (type === 'multitap') return Math.floor(100 * Math.pow(3, currentLevel - 1));
    return 0;
  };

  const getFloatValue = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'object' && val.$numberDecimal) {
      return parseFloat(val.$numberDecimal);
    }
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const parseVal = (val) => {
    return getFloatValue(val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const xpNeeded = (liveState.level || 1) * 200;
  const xpPct = Math.min(100, ((liveState.xp || 0) / xpNeeded) * 100);

  return (
    <div className="content-container">
      {/* Toast notifier */}
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}

      {/* Mobile-First Stacked Layout */}
      <div className={styles.mobileContainer}>
        
        {/* 1. Stats Grid (Multitap & Efficiency) */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>MULTITAP</span>
            <span className={styles.statValue}>x{liveState.multitapLevel || 1}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>EFFICIENCY</span>
            <span className={styles.statValue}>x{(liveState.tapEfficiencyLevel || 0).toFixed(1)}</span>
          </div>
        </div>

        {/* Large Balance Display (Hamster Kombat Style) */}
        <div className={styles.largeBalanceRow}>
          <img 
            src="/gold_coin.jpg" 
            alt="Gold Coin" 
            className={styles.largeCoinIcon} 
            draggable="false"
          />
          <span className={styles.largeBalanceText}>
            {Number(liveState.veBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
          </span>
        </div>

        {/* 2. Tapping Circle (Centered) */}
        <div className={styles.circlePedestal}>
          <div className={styles.pedestalHalo}>
            <div className={styles.pedestalBase} />
            <TapCircle />
          </div>
        </div>

        {/* 3. Hamster Kombat Style Energy / Boost Status Bar */}
        <div className={styles.hamsterStatusBar}>
          <div className={styles.energyStats} onClick={() => setShowBankModal(true)}>
            <span className={styles.boltIcon}>⚡</span>
            <span className={styles.energyValueText}>
              {liveState.currentEnergy} / {liveState.energyCapacity || 500}
            </span>
          </div>
          <div className={styles.boostLink} onClick={() => setShowUpgrades(true)}>
            <span className={styles.rocketIcon}>🚀</span>
            <span className={styles.boostText}>Boost</span>
          </div>
        </div>

        {/* Boosts & Rewards Horizontal Scrolling Video Cards */}
        <BoostsRewardsRow 
          onOpenShield={() => setShowShieldModal(true)}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onOpenLucky={() => setShowLuckyModal(true)}
          onOpenBank={() => setShowRefillModal(true)}
          onOpenMissions={openMissionsModal}
          onOpenGoal={() => setShowGoalModal(true)}
          onOpenLeaders={openLeaderboardModal}
        />
      </div>

      {/* Premium Membership Plans Dashboard Section */}
      <div className={styles.premiumPlansSection}>
        <div className={styles.premiumPlansHeader}>
          <Sparkles size={16} className={styles.iconGold} />
          <h3>VELoop Premium Node Memberships</h3>
        </div>
        <p className={styles.premiumPlansDesc}>
          Boost your node efficiency: get <strong>+50% Energy Capacity</strong>, <strong>2x Faster Recharge Speed</strong>, and a permanent <strong>+20% Combo Yield multiplier</strong>.
        </p>

        <div className={styles.premiumPlansGrid}>
          {/* Plan 1: Weekly */}
          <div className={`${styles.planCard} ${liveState.subscriptionType === 'weekly' ? styles.activePlanCard : ''}`}>
            <div className={styles.planHeader}>
              <h4>Weekly Pass</h4>
              <span className={styles.planCost}>50 VE <small>≈ Rs. 50.00</small></span>
            </div>
            <p className={styles.planCardDesc}>Best for short-term boost checks and quick testing.</p>
            {liveState.subscriptionType === 'weekly' ? (
              <button className={styles.btnActivePlan} disabled>Active Pass</button>
            ) : liveState.subscriptionType && liveState.subscriptionType !== 'free' ? (
              <button className={styles.btnInactivePlan} disabled>Locked</button>
            ) : (
              <button onClick={() => triggerSubscriptionPayment('weekly')} className={styles.btnSubscribe}>
                Subscribe Weekly
              </button>
            )}
          </div>

          {/* Plan 2: Monthly */}
          <div className={`${styles.planCard} ${liveState.subscriptionType === 'monthly' ? styles.activePlanCard : ''}`}>
            <div className={styles.planHeader}>
              <h4>Monthly Pass</h4>
              <span className={styles.planCost}>150 VE <small>≈ Rs. 150.00</small></span>
            </div>
            <p className={styles.planCardDesc}>Standard plan. Highly recommended for active season climbers.</p>
            {liveState.subscriptionType === 'monthly' ? (
              <button className={styles.btnActivePlan} disabled>Active Pass</button>
            ) : liveState.subscriptionType && liveState.subscriptionType !== 'free' && liveState.subscriptionType !== 'weekly' ? (
              <button className={styles.btnInactivePlan} disabled>Locked</button>
            ) : (
              <button onClick={() => triggerSubscriptionPayment('monthly')} className={styles.btnSubscribe}>
                Subscribe Monthly
              </button>
            )}
          </div>

          {/* Plan 3: Yearly */}
          <div className={`${styles.planCard} ${liveState.subscriptionType === 'yearly' ? styles.activePlanCard : ''}`}>
            <div className={styles.planHeader}>
              <div className={styles.yearlyTitleRow}>
                <h4>Yearly Pass</h4>
                <span className={styles.saveTag}>Save 33%</span>
              </div>
              <span className={styles.planCost}>1200 VE <small>≈ Rs. 1,200.00</small></span>
            </div>
            <p className={styles.planCardDesc}>Ultimate value pass. Maintain maximum efficiency for 365 days.</p>
            {liveState.subscriptionType === 'yearly' ? (
              <button className={styles.btnActivePlan} disabled>Active Pass</button>
            ) : (
              <button onClick={() => triggerSubscriptionPayment('yearly')} className={styles.btnSubscribe}>
                Subscribe Yearly
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Shortcuts / Impersonator Trigger */}
      <div className={styles.adminTip}>
        <span>Admin Preview Control panel:</span>
        <button onClick={() => navigate('/admin')} className={styles.btnAdmin}>Manage Economy</button>
      </div>

      {/* ================= MODALS & DRAWERS ================= */}

      {/* A. Upgrade Drawer (Slides up) */}
      {showUpgrades && (
        <div className={styles.drawerOverlay} onClick={() => setShowUpgrades(false)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3>Level Up & Power Upgrades</h3>
              <button onClick={() => setShowUpgrades(false)}><X size={20} /></button>
            </div>

            <div className={styles.levelUpBanner}>
              <div className={styles.levelBadge}>
                <span>LVL</span>
                <strong>{liveState.level || 1}</strong>
              </div>
              <div className={styles.levelInfo}>
                <div className={styles.levelInfoRow}>
                  <span>Player Level Progress</span>
                  <span>{liveState.xp || 0} / {(liveState.level || 1) * 200} XP</span>
                </div>
                <div className={styles.levelProgressBar}>
                  <div 
                    className={styles.levelProgressFill} 
                    style={{ width: `${Math.min(100, ((liveState.xp || 0) / ((liveState.level || 1) * 200)) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className={styles.drawerList}>
              <div className={styles.drawerItem}>
                <div>
                  <h4>Core Energy Capacity</h4>
                  <p>Lvl {liveState.energyCapacityLevel || 1} / 6 (Increases energy cap by +100)</p>
                  <span>Cost: {getUpgradeCost('energy_capacity', liveState.energyCapacityLevel || 1)} VE</span>
                </div>
                <button 
                  onClick={() => handleBuyUpgrade('energy_capacity')}
                  disabled={(liveState.energyCapacityLevel || 1) >= 6}
                  className={(liveState.energyCapacityLevel || 1) >= 6 ? styles.btnMiniDisabled : styles.btnMini}
                >
                  {(liveState.energyCapacityLevel || 1) >= 6 ? 'Max' : 'Upgrade'}
                </button>
              </div>

              <div className={styles.drawerItem}>
                <div>
                  <h4>Energy Recharge Speed</h4>
                  <p>Lvl {liveState.rechargeSpeedLevel || 1} / 5 (Reduces recharge interval)</p>
                  <span>Cost: {getUpgradeCost('recharge_speed', liveState.rechargeSpeedLevel || 1)} Tokens</span>
                </div>
                <button 
                  onClick={() => handleBuyUpgrade('recharge_speed')}
                  disabled={(liveState.rechargeSpeedLevel || 1) >= 5}
                  className={(liveState.rechargeSpeedLevel || 1) >= 5 ? styles.btnMiniDisabled : styles.btnMini}
                >
                  {(liveState.rechargeSpeedLevel || 1) >= 5 ? 'Max' : 'Upgrade'}
                </button>
              </div>

              <div className={styles.drawerItem}>
                <div>
                  <h4>Energy Bank Capacity</h4>
                  <p>Lvl {liveState.energyBankLevel || 1} / 3 (+250 capacity per purchase)</p>
                  <span>Cost: 200 VE</span>
                </div>
                <button 
                  onClick={() => handleBuyUpgrade('energy_bank')}
                  disabled={(liveState.energyBankLevel || 1) >= 3}
                  className={(liveState.energyBankLevel || 1) >= 3 ? styles.btnMiniDisabled : styles.btnMini}
                >
                  {(liveState.energyBankLevel || 1) >= 3 ? 'Max' : 'Upgrade'}
                </button>
              </div>

              <div className={styles.drawerItem}>
                <div>
                  <h4>Tap Efficiency (Seasonal)</h4>
                  <p>Lvl {liveState.tapEfficiencyLevel || 0} / 3 (Increases payouts by 10% steps)</p>
                  <span>Cost: {getUpgradeCost('tap_efficiency', liveState.tapEfficiencyLevel || 0)} SVE</span>
                </div>
                <button 
                  onClick={() => handleBuyUpgrade('tap_efficiency')}
                  disabled={(liveState.tapEfficiencyLevel || 0) >= 3}
                  className={(liveState.tapEfficiencyLevel || 0) >= 3 ? styles.btnMiniDisabled : styles.btnMini}
                >
                  {(liveState.tapEfficiencyLevel || 0) >= 3 ? 'Max' : 'Upgrade'}
                </button>
              </div>

              <div className={styles.drawerItem}>
                <div>
                  <h4>Multitap Power</h4>
                  <p>Lvl {liveState.multitapLevel || 1} / 10 (Increases tap coins & energy cost by +1)</p>
                  <span>Cost: {getUpgradeCost('multitap', liveState.multitapLevel || 1)} VE</span>
                </div>
                <button 
                  onClick={() => handleBuyUpgrade('multitap')}
                  disabled={(liveState.multitapLevel || 1) >= 10}
                  className={(liveState.multitapLevel || 1) >= 10 ? styles.btnMiniDisabled : styles.btnMini}
                >
                  {(liveState.multitapLevel || 1) >= 10 ? 'Max' : 'Upgrade'}
                </button>
              </div>

              {/* Premium Node Passes */}
              <div className={styles.premiumHeaderRow}>
                <h4>Premium Node Passes</h4>
              </div>

              <div className={styles.drawerItem}>
                <div>
                  <h4 className="gold-text">Weekly Node Pass</h4>
                  <p>Unlocks +50% base energy & +20% combo boost for 7 days.</p>
                  <span>Cost: 50 VE (≈ Rs. 50.00)</span>
                </div>
                {liveState.subscriptionType === 'weekly' ? (
                  <span className={styles.activePlanTag}>Active Plan</span>
                ) : liveState.subscriptionType && liveState.subscriptionType !== 'free' ? (
                  <span className={styles.inactivePlanTag}>Locked</span>
                ) : (
                  <button 
                    onClick={() => triggerSubscriptionPayment('weekly')}
                    className={styles.btnMini}
                  >
                    Subscribe
                  </button>
                )}
              </div>

              <div className={styles.drawerItem}>
                <div>
                  <h4 className="gold-text">Monthly Node Pass</h4>
                  <p>Unlocks +50% base energy & +20% combo boost for 30 days.</p>
                  <span>Cost: 150 VE (≈ Rs. 150.00)</span>
                </div>
                {liveState.subscriptionType === 'monthly' ? (
                  <span className={styles.activePlanTag}>Active Plan</span>
                ) : liveState.subscriptionType && liveState.subscriptionType !== 'free' && liveState.subscriptionType !== 'weekly' ? (
                  <span className={styles.inactivePlanTag}>Locked</span>
                ) : (
                  <button 
                    onClick={() => triggerSubscriptionPayment('monthly')}
                    className={styles.btnMini}
                  >
                    Subscribe
                  </button>
                )}
              </div>

              <div className={styles.drawerItem}>
                <div>
                  <h4 className="gold-text">Yearly Node Pass (Save 33%!)</h4>
                  <p>Unlocks +50% base energy & +20% combo boost for 365 days.</p>
                  <span>Cost: 1200 VE (≈ Rs. 1,200.00)</span>
                </div>
                {liveState.subscriptionType === 'yearly' ? (
                  <span className={styles.activePlanTag}>Active Plan</span>
                ) : (
                  <button 
                    onClick={() => triggerSubscriptionPayment('yearly')}
                    className={styles.btnMini}
                  >
                    Subscribe
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPI Subscription Checkout Modal */}
      {showPaymentModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>UPI Payment Gateway</h3>
              <button onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleConfirmUpiPayment} className={styles.paymentForm}>
              <div className={styles.paymentAmountRow}>
                <span>Order Total:</span>
                <span className={styles.paymentAmountVal}>
                  {paymentPlan === 'weekly' ? 'Rs. 50.00' : paymentPlan === 'monthly' ? 'Rs. 150.00' : 'Rs. 1,200.00'}
                </span>
              </div>

              {/* QR Code Scanner Simulation */}
              <div className={styles.qrSection}>
                <div className={styles.qrContainer}>
                  {/* Glowing simulated scanlines */}
                  <div className={styles.qrScanline} />
                  {/* SVG generated vector QR Code */}
                  <svg width="120" height="120" viewBox="0 0 29 29" style={{ stroke: 'white', fill: 'none', strokeWidth: '1px' }}>
                    <path d="M1,1 h7 v7 h-7 z M21,1 h7 v7 h-7 z M1,21 h7 v7 h-7 z" style={{ fill: 'white' }} />
                    <path d="M3,3 h3 v3 h-3 z M23,3 h3 v3 h-3 z M3,23 h3 v3 h-3 z" style={{ fill: 'var(--bg-secondary)' }} />
                    <path d="M12,1 h5 v3 h-5 z M12,6 h2 v2 h-2 z M17,8 h3 v3 h-3 z M25,12 h3 v3 h-3 z M1,12 h3 v5 h-3 z M6,12 h2 v3 h-2 z M10,21 h5 v7 h-5 z" style={{ fill: 'white' }} />
                    <path d="M12,12 h4 v4 h-4 z M18,18 h4 v4 h-4 z M23,23 h4 v4 h-4 z" style={{ fill: 'var(--accent-gold)' }} />
                  </svg>
                </div>
                <p className={styles.qrText}>Scan QR Code with BHIM, PhonePe, Paytm, or GPay to pay</p>
              </div>

              <div className={styles.divider}>
                <span>OR PAY USING UPI ID</span>
              </div>

              {paymentMsg && <div className={styles.paymentError}>{paymentMsg}</div>}

              <div className={styles.inputGroup}>
                <label>Enter UPI ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. username@okhdfcbank" 
                  value={paymentUpi}
                  onChange={e => setPaymentUpi(e.target.value)}
                  required
                  className={styles.modalInput}
                  disabled={paying}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={paying}>
                {paying ? 'Authorizing UPI Transfer...' : 'Complete Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* B. Energy Bank Modal */}
      {/* Energy Refill Modal */}
      {showRefillModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRefillModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Energy Refill & Battery Bank</h3>
              <button onClick={() => setShowRefillModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Zap size={48} className={styles.iconGreen} />
              </div>
              <h4>Current Energy: {liveState.currentEnergy} / {liveState.energyCapacity || 500}</h4>
              <div className={styles.goalProgressBar} style={{ margin: '8px 0 16px 0' }}>
                <div 
                  className={styles.goalProgressFill} 
                  style={{ 
                    width: `${Math.min(100, ((liveState.currentEnergy || 0) / (liveState.energyCapacity || 500)) * 100)}%`,
                    backgroundColor: '#22c55e'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button 
                  onClick={handleRefillEnergy}
                  className="btn-primary"
                  style={{ backgroundColor: '#22c55e', borderColor: '#16a34a' }}
                >
                  ⚡ Instant Full Energy Refill (Free)
                </button>

                <div style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#0070f3' }}>🔋 Energy Bank Reserve</strong>
                    <span>{liveState.energyBankBalance} / {liveState.energyBankCapacity || 500}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                    When core energy reaches zero, taps automatically consume reserve energy from your bank.
                  </p>
                </div>

                <button 
                  onClick={() => { setShowRefillModal(false); handleActivateBoost(); }}
                  className="btn-secondary"
                >
                  🚀 Activate 2x Turbo Boost (30s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. Energy Bank Modal */}
      {showBankModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBankModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Energy Bank Core</h3>
              <button onClick={() => setShowBankModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <Layers size={40} className={styles.iconBlue} />
              <div className={styles.bankBalance}>
                {liveState.energyBankBalance} / {liveState.energyBankCapacity || 500}
              </div>
              <p className={styles.modalDesc}>
                Priority consumption is active. When core energy reaches zero, taps consume from the Energy Bank instead of locking.
              </p>
              <div className={styles.regenHint}>
                Bank Regenerates dynamically at +20 energy every 120 minutes.
              </div>
              <button 
                onClick={() => { setShowBankModal(false); setShowUpgrades(true); }}
                className="btn-primary"
              >
                Upgrade Bank Capacity (200 VE)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. Energy Shield Modal */}
      {showShieldModal && (
        <div className={styles.modalOverlay} onClick={() => setShowShieldModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Protect - Energy Shield Guard</h3>
              <button onClick={() => setShowShieldModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <Shield size={40} className={styles.iconGold} />
              <h4>Costs 100 VE</h4>
              <p className={styles.modalDesc}>
                Activating the shield protects core energy by <strong>90%</strong>. For 30 seconds, taps consume only 10% of standard energy requirements.
              </p>
              
              {shieldTimeLeft > 0 ? (
                <div className={styles.shieldStatus}>Shield currently active! {shieldTimeLeft}s left.</div>
              ) : shieldCooldownLeft > 0 ? (
                <div className={styles.shieldStatus}>Shield is on cooldown. Ready in {shieldCooldownLeft}s.</div>
              ) : (
                <button onClick={handleBuyShield} className="btn-primary">Purchase Shield (100 VE)</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* D. Lucky Spin Modal */}
      {showLuckyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLuckyModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Lucky Tap Spin Wheel</h3>
              <button onClick={() => { if (!spinning) setShowLuckyModal(false); }}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.wheelWrapper}>
                <div 
                  className={styles.wheel} 
                  style={{ transform: `rotate(${spinDeg}deg)`, transition: spinning ? 'transform 5s cubic-bezier(0.1, 0.8, 0.1, 1)' : 'none' }}
                >
                  <div className={`${styles.segment} ${styles.seg0}`}>10 VE (Rs. 10)</div>
                  <div className={`${styles.segment} ${styles.seg1}`}>50 VE (Rs. 50)</div>
                  <div className={`${styles.segment} ${styles.seg2}`}>5 SVE (Rs. 10)</div>
                  <div className={`${styles.segment} ${styles.seg3}`}>10 Gem (Rs. 100)</div>
                  <div className={`${styles.segment} ${styles.seg4}`}>100 Tok (Rs. 50)</div>
                  <div className={`${styles.segment} ${styles.seg5}`}>500 Tok (Rs. 250)</div>
                </div>
                <div className={styles.wheelPin} />
              </div>

              {spinReward && (
                <div className={styles.spinRewardNotice}>
                  Won: <strong className="gold-text">+{spinReward.rewardAmount} {spinReward.rewardType} (Rs. {spinReward.rewardType === 'VE' ? spinReward.rewardAmount : spinReward.rewardType === 'SVE' ? spinReward.rewardAmount * 2 : spinReward.rewardType === 'Gem' ? spinReward.rewardAmount * 10 : spinReward.rewardAmount * 0.5})</strong>!
                </div>
              )}

              <div className={styles.eligibilityText}>
                {luckyDetails && luckyDetails.isFree === false && luckyDetails.nextIn > 0 
                  ? `Free Spin in ${luckyDetails.nextIn} taps (or Spin now!)` 
                  : '🎉 Lucky Spin Ready!'
                }
              </div>

              <button 
                onClick={handleLuckySpin} 
                disabled={spinning} 
                className={spinning ? "btn-disabled" : "btn-primary"}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {spinning ? '🎡 Spinning Wheel...' : '🎡 Spin Wheel'}
              </button>

              <div style={{
                marginTop: '15px',
                padding: '12px',
                background: '#1a1a2e',
                borderRadius: '8px',
                border: '1px solid #333',
                fontSize: '13px',
                textAlign: 'left'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#ffd700', fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                  Your Live Balances (Rs. Value)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>VE: <strong>{parseFloat(liveState.veBalance || 0).toFixed(1)}</strong> (Rs. {parseFloat(liveState.veBalance || 0).toFixed(1)})</div>
                  <div>SVE: <strong>{parseFloat(liveState.sveBalance || 0).toFixed(1)}</strong> (Rs. {(parseFloat(liveState.sveBalance || 0) * 2).toFixed(1)})</div>
                  <div>Gems: <strong>{parseFloat(liveState.gemBalance || 0).toFixed(1)}</strong> (Rs. {(parseFloat(liveState.gemBalance || 0) * 10).toFixed(1)})</div>
                  <div>Tokens: <strong>{parseFloat(liveState.tokenBalance || 0).toFixed(1)}</strong> (Rs. {(parseFloat(liveState.tokenBalance || 0) * 0.5).toFixed(1)})</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Check-in Modal */}
      {showCheckin && <DailyCheckinModal onClose={() => setShowCheckin(false)} />}

      {/* E. Missions Panel */}
      {showMissions && (
        <div className={styles.modalOverlay} onClick={() => setShowMissions(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📋</span>
                <h3 style={{ margin: 0 }}>Daily Tasks & Missions</h3>
              </div>
              <button onClick={() => setShowMissions(false)}><X size={20} /></button>
            </div>

            {/* Task Category Tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 6px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button 
                onClick={() => setTaskTab('milestones')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: taskTab === 'milestones' ? '#ffd700' : 'rgba(255, 255, 255, 0.06)',
                  color: taskTab === 'milestones' ? '#000' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                🎯 Milestones ({missionsList.length})
              </button>
              <button 
                onClick={() => setTaskTab('social')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: taskTab === 'social' ? '#ffd700' : 'rgba(255, 255, 255, 0.06)',
                  color: taskTab === 'social' ? '#000' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                📱 Social & Community
              </button>
            </div>

            <div className={styles.modalBodyList} style={{ maxHeight: '380px', overflowY: 'auto', padding: '14px 16px' }}>
              {taskTab === 'milestones' && (
                missionsList.length === 0 ? (
                  <div className={styles.emptyState}>No active milestone tasks available.</div>
                ) : (
                  missionsList.map(m => {
                    const pct = Math.min(100, Math.floor(((m.progress || 0) / (m.requirementValue || 1)) * 100));
                    return (
                      <div 
                        key={m.id} 
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: m.completed && !m.claimed ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          marginBottom: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#f1f5f9' }}>{m.title}</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{m.description}</p>
                          </div>
                          <span style={{ 
                            background: 'rgba(244, 196, 48, 0.15)', 
                            color: '#ffd700', 
                            border: '1px solid rgba(244, 196, 48, 0.3)', 
                            borderRadius: '6px', 
                            padding: '2px 8px', 
                            fontWeight: 700,
                            fontSize: '11.5px',
                            whiteSpace: 'nowrap'
                          }}>
                            +{m.rewardAmount} {m.rewardType}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div style={{ 
                            width: '100%', 
                            height: '6px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '3px', 
                            overflow: 'hidden' 
                          }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${pct}%`,
                              background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg, #f59e0b, #ffd700)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            <span>Progress: {m.progress || 0} / {m.requirementValue}</span>
                            <span>{pct}%</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                          {m.claimed ? (
                            <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} /> Completed
                            </span>
                          ) : m.completed ? (
                            <button 
                              onClick={() => handleClaimMission(m.id, m.title)} 
                              className="btn-primary"
                              style={{ background: '#ffd700', color: '#000', fontWeight: 800, padding: '6px 14px', fontSize: '12px' }}
                            >
                              🎁 Claim {m.rewardAmount} {m.rewardType}
                            </button>
                          ) : (
                            <button 
                              onClick={() => setShowMissions(false)} 
                              className="btn-secondary"
                              style={{ padding: '5px 12px', fontSize: '11.5px', borderRadius: '6px' }}
                            >
                              Tap to Earn ➜
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {taskTab === 'social' && (
                <div>
                  {/* Task 1: Check in */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#f1f5f9' }}>📅 Daily Login Streak</h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94a3b8' }}>Claim daily login streak crates</p>
                      <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '11.5px' }}>+20 VE Coins</span>
                    </div>
                    <button 
                      onClick={() => { setShowMissions(false); setShowCheckin(true); }}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Open Calendar ➜
                    </button>
                  </div>

                  {/* Task 2: Follow on Twitter */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#f1f5f9' }}>🐦 Follow @Veloop on X</h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94a3b8' }}>Follow our official page for updates</p>
                      <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '11.5px' }}>+50 VE Coins</span>
                    </div>
                    {socialFollowed ? (
                      <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Completed
                      </span>
                    ) : (
                      <button 
                        onClick={handleFollowTwitter}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      >
                        Follow ➜
                      </button>
                    )}
                  </div>

                  {/* Task 3: Join Telegram */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#f1f5f9' }}>💬 Join Telegram Channel</h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94a3b8' }}>Get community secret drop codes</p>
                      <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '11.5px' }}>+50 VE Coins</span>
                    </div>
                    {telegramJoined ? (
                      <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Completed
                      </span>
                    ) : (
                      <button 
                        onClick={handleJoinTelegram}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      >
                        Join ➜
                      </button>
                    )}
                  </div>

                  {/* Task 4: Invite Friends */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#f1f5f9' }}>👥 Invite a Friend</h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94a3b8' }}>Share your code to earn 100 VE per friend</p>
                      <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '11.5px' }}>+100 VE Coins</span>
                    </div>
                    <button 
                      onClick={() => {
                        setShowMissions(false);
                        navigate('/invite');
                      }}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Invite ➜
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* F. Daily Goal & Streak Modal */}
      {showGoalModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGoalModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Daily Goal & Streak Target</h3>
              <button onClick={() => setShowGoalModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Trophy size={48} className={styles.iconGold} />
              </div>
              
              <div style={{
                padding: '14px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ margin: 0, color: '#f1f5f9' }}>🎯 Daily 1,000 Taps Target</h4>
                  <span style={{ color: '#ffd700', fontWeight: 700 }}>+50 Tokens</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 10px 0', textAlign: 'left' }}>
                  Tap 1,000 times today to unlock your daily goal reward token crate.
                </p>
                <div className={styles.goalProgressBar}>
                  <div 
                    className={styles.goalProgressFill} 
                    style={{ 
                      width: `${Math.min(100, (((liveState.dailyChallengeProgress || 0) / 1000) * 100))}%`,
                      backgroundColor: '#6366f1'
                    }} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px', color: '#94a3b8' }}>
                  <span>Progress: {liveState.dailyChallengeProgress || 0} / 1000</span>
                  <span>{Math.floor(Math.min(100, (((liveState.dailyChallengeProgress || 0) / 1000) * 100)))}%</span>
                </div>
                <button 
                  onClick={handleClaimDailyChallenge}
                  disabled={liveState.dailyChallengeClaimed || (liveState.dailyChallengeProgress || 0) < 1000}
                  className={liveState.dailyChallengeClaimed || (liveState.dailyChallengeProgress || 0) < 1000 ? "btn-disabled" : "btn-primary"}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  {liveState.dailyChallengeClaimed 
                    ? '✓ Daily Goal Reward Claimed' 
                    : (liveState.dailyChallengeProgress || 0) >= 1000 
                      ? 'Claim 50 Tokens Reward' 
                      : `${1000 - (liveState.dailyChallengeProgress || 0)} Taps Remaining`
                  }
                </button>
              </div>

              <div style={{
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#f1f5f9', textAlign: 'left' }}>📅 7-Day Login Streak</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px 0', textAlign: 'left' }}>
                  Claim cumulative daily rewards by checking in every consecutive day.
                </p>
                <button 
                  onClick={() => { setShowGoalModal(false); setShowCheckin(true); }}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Open 7-Day Streak Calendar ➜
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* G. Leaders Modal */}
      {showLeadersModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLeadersModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Season Leaderboard Top Players</h3>
              <button onClick={() => setShowLeadersModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(245, 158, 11, 0.12)',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                marginBottom: '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Your Current Rank</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>
                    {myLeaderRank ? `#${myLeaderRank}` : 'Unranked'}
                  </div>
                </div>
                <button 
                  onClick={() => { setShowLeadersModal(false); navigate('/league'); }}
                  className="btn-mini"
                  style={{ background: '#f59e0b', color: '#000', fontWeight: 700 }}
                >
                  Full League ➜
                </button>
              </div>

              {loadingLeaderboard ? (
                <div style={{ padding: '20px', color: '#94a3b8' }}>Loading top leaders...</div>
              ) : leaderboardData.length === 0 ? (
                <div style={{ padding: '20px', color: '#94a3b8' }}>No leaderboard data yet. Start tapping to rank!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxHeight: '260px', overflowY: 'auto' }}>
                  {leaderboardData.slice(0, 10).map((player, idx) => (
                    <div 
                      key={player.userId || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: idx === 0 ? 'rgba(234, 179, 8, 0.15)' : idx === 1 ? 'rgba(148, 163, 184, 0.15)' : idx === 2 ? 'rgba(180, 83, 9, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          width: '24px', 
                          fontWeight: 800, 
                          color: idx === 0 ? '#ffd700' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#f59e0b' : '#94a3b8' 
                        }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{player.username || `Player ${idx + 1}`}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                        {Number(player.score || player.veBalance || 0).toLocaleString()} VE
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* F. Staking Vaults Drawer */}
      {showStaking && (
        <div className={styles.drawerOverlay} onClick={() => setShowStaking(false)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3>Staking Yield Vaults</h3>
              <button onClick={() => setShowStaking(false)}><X size={20} /></button>
            </div>

            <div className={styles.lockForm}>
              <h4>Lock VE to Earn Staked VE (SVE)</h4>
              <p className={styles.subtitle}>Demo Speed: 1 minute of lock duration = 1 day of APY compounding.</p>
              
              <div className={styles.formRow}>
                <input 
                  type="number" 
                  placeholder="Amount VE (Min 10)"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                  className={styles.lockInput}
                />
                
                <select 
                  value={stakeLockPeriod} 
                  onChange={e => setStakeLockPeriod(parseInt(e.target.value))}
                  className={styles.lockSelect}
                >
                  <option value={3}>3d Lock (5% APY / 3 mins)</option>
                  <option value={7}>7d Lock (12% APY / 7 mins)</option>
                  <option value={30}>30d Lock (25% APY / 30 mins)</option>
                </select>
                
                <button onClick={handleLockStaking} className={styles.btnLockAction}>
                  Lock VE
                </button>
              </div>
            </div>

            <div className={styles.activeLocksHeader}>
              <h4>Your Active Yield Locks</h4>
            </div>

            <div className={styles.drawerList}>
              {stakingList.length === 0 ? (
                <div className={styles.emptyState}>No active staking contracts found.</div>
              ) : (
                stakingList.map(vault => (
                  <div key={vault.id} className={styles.drawerItem}>
                    <div>
                      <h4 className="gold-text">Locked: {vault.principalAmount} VE</h4>
                      <p>APY: {(vault.apyRate * 100).toFixed(0)}% · Period: {vault.lockPeriodDays}d (Simulated)</p>
                      <p>Unlocks: {new Date(vault.unlockDate).toLocaleTimeString()}</p>
                      <div className={styles.accruedLabel}>
                        Accrued Interest: <strong>{vault.interestEarned} SVE</strong>
                      </div>
                    </div>
                    <div className={styles.claimSection}>
                      {vault.isReady ? (
                        <button onClick={() => handleClaimStaking(vault.id, false)} className={styles.btnClaimMini}>
                          Claim Yield
                        </button>
                      ) : (
                        <button onClick={() => handleClaimStaking(vault.id, true)} className={styles.btnEarlyMini}>
                          Early Claim
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* G. PvP Arena Modal */}
      {showPvp && (
        <div className={styles.modalOverlay} onClick={() => { if (pvpState === 'idle' || pvpState === 'finished') setShowPvp(false); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>PvP Tapping Clash Arena</h3>
              <button onClick={() => { if (pvpState === 'idle' || pvpState === 'finished') setShowPvp(false); }}><X size={20} /></button>
            </div>

            <div className={styles.modalBody}>
              {pvpState === 'idle' && (
                <div className={styles.pvpIdleBody}>
                  <Trophy size={48} className={styles.iconGold} />
                  <h4>Live PvP Node Duel</h4>
                  <p className={styles.modalDesc}>
                    Match up with random security nodes. Tap as fast as possible for 15 seconds to outscore your opponent.
                  </p>
                  <ul className={styles.pvpRulesList}>
                    <li><strong>Winner reward:</strong> +25.0 VE</li>
                    <li><strong>Participation reward:</strong> +5.0 VE</li>
                    <li><strong>Cost:</strong> Free (does not consume core energy)</li>
                  </ul>
                  <button onClick={startPvpMatchmaking} className="btn-primary">
                    Find Active Opponent
                  </button>
                </div>
              )}

              {pvpState === 'searching' && (
                <div className={styles.pvpSearchingBody}>
                  <div className={styles.spinner} />
                  <h4>Searching for Active Nodes...</h4>
                  <p className={styles.modalDesc}>Ping-testing network routes and matching hash-rates...</p>
                </div>
              )}

              {pvpState === 'playing' && (
                <div className={styles.pvpPlayingBody}>
                  <div className={styles.pvpHeaderRow}>
                    <div className={styles.pvpUserBox}>
                      <span className={styles.pvpPlayerName}>You</span>
                      <div className={styles.pvpScoreVal}>{pvpUserTaps}</div>
                    </div>
                    <div className={styles.pvpTimerBox}>
                      <span className={styles.pvpTimerTitle}>TIMER</span>
                      <div className={styles.pvpTimerVal}>{pvpTimer}s</div>
                    </div>
                    <div className={styles.pvpOpponentBox}>
                      <span className={styles.pvpOpponentName}>{pvpOpponent ? pvpOpponent.name : 'Trinity'}</span>
                      <div className={styles.pvpScoreVal}>{pvpOpponentTaps}</div>
                    </div>
                  </div>

                  <p className={styles.pvpActionHint}>TAP THE CORE BELOW TO SCORE!</p>
                  
                  {/* Giant PvP core coin to tap */}
                  <div 
                    onClick={handlePvpTap} 
                    className={`${styles.pvpTapButton} ${pvpUserTaps % 2 === 0 ? styles.pressedState : ''}`}
                  >
                    <div className={styles.pvpTapInner}>
                      <span>CLASH</span>
                    </div>
                  </div>
                </div>
              )}

              {pvpState === 'finished' && (
                <div className={styles.pvpFinishedBody}>
                  {pvpResult ? (
                    <>
                      {pvpResult.won ? (
                        <div className={styles.pvpWinHeader}>
                          <Sparkles size={48} className={styles.iconGold} />
                          <h4 className="gold-text">VICTORY!</h4>
                        </div>
                      ) : (
                        <div className={styles.pvpLossHeader}>
                          <Trophy size={48} className={styles.iconBlue} />
                          <h4>DEFEAT</h4>
                        </div>
                      )}
                      
                      <div className={styles.pvpStatsSummary}>
                        <div>Your score: <strong>{pvpUserTaps} Taps</strong></div>
                        <div>Opponent score: <strong>{pvpOpponentTaps} Taps</strong></div>
                      </div>

                      <div className={styles.pvpRewardNotice}>
                        {pvpResult.message}
                        <div className="gold-text">Earned: +{pvpResult.reward} VE</div>
                      </div>
                    </>
                  ) : (
                    <div>Verifying authoritative results on server...</div>
                  )}

                  <button onClick={startPvpMatchmaking} className="btn-primary">
                    Find Another Match
                  </button>
                  <button onClick={() => setShowPvp(false)} className="btn-secondary">
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
