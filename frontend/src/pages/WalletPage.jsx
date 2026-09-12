import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronLeft, Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, BarChart2, Activity, Gift,
  TrendingUp, Shield, Sparkles, Check, Copy, AlertCircle, Zap, Layers, RefreshCw, X, Radio,
  Calculator, Flame, Clock, Target, Coins
} from 'lucide-react';
import VouchersTab from '../components/VouchersTab';
import { API_URL } from '../config';
import styles from './WalletPage.module.css';

export default function WalletPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { liveState, refreshTapState } = useSocket();

  const [ledger, setLedger] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Tabs: 'vouchers' | 'ledger'
  const [activeWalletTab, setActiveWalletTab] = useState('vouchers');

  // Chart Timeframe: '24h' | '7d' | '30d'
  const [timeframe, setTimeframe] = useState('7d');

  // Withdrawal Modal States
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');

  // Top Up Modal States
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState('100');
  const [topUpMethod, setTopUpMethod] = useState('Google Pay');
  const [toppingUp, setToppingUp] = useState(false);
  const [topUpMsg, setTopUpMsg] = useState('');

  // Tap-to-Cash Projection Estimator State
  const [estimateTaps, setEstimateTaps] = useState(500);
  const [includeFeverSurge, setIncludeFeverSurge] = useState(false);

  useEffect(() => {
    fetchLedger(currentPage);
  }, [currentPage]);

  const fetchLedger = async (page) => {
    setLoadingLedger(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/history?page=${page}&limit=7`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger);
        setTotalPages(data.pagination.pages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleInitiateWithdrawal = async (e) => {
    e.preventDefault();
    setWithdrawMsg('');
    
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawMsg('Please enter a valid amount.');
      return;
    }
    
    let rawBal = 0;
    if (liveState?.veBalance) {
      rawBal = parseFloat(liveState.veBalance.$numberDecimal || liveState.veBalance);
    }
    
    if (amt > rawBal) {
      setWithdrawMsg(`Insufficient VE balance. Maximum available is ₹ ${rawBal.toFixed(2)}.`);
      return;
    }
    
    if (!withdrawUpi || !withdrawUpi.includes('@')) {
      setWithdrawMsg('Please enter a valid UPI ID (e.g. name@okhdfcbank or phone@paytm).');
      return;
    }
    
    setWithdrawing(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt, upiId: withdrawUpi })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowWithdraw(false);
        setWithdrawAmt('');
        setWithdrawUpi('');
        fetchLedger(1);
        if (refreshTapState) refreshTapState();
      } else {
        setWithdrawMsg(data.message);
      }
    } catch (err) {
      console.error(err);
      setWithdrawMsg('Server error. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleInitiateTopUp = async (e) => {
    e.preventDefault();
    setTopUpMsg('');
    const amt = parseFloat(topUpAmt);
    if (isNaN(amt) || amt < 10) {
      setTopUpMsg('Minimum top-up is ₹ 10.00.');
      return;
    }

    setToppingUp(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt, paymentMethod: topUpMethod })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowTopUp(false);
        fetchLedger(1);
        if (refreshTapState) refreshTapState();
      } else {
        setTopUpMsg(data.message || 'Top-up failed.');
      }
    } catch (err) {
      console.error(err);
      setTopUpMsg('Network disruption. Please try again.');
    } finally {
      setToppingUp(false);
    }
  };

  if (!liveState) return <div className="loading-screen">Loading Wallet Gateway...</div>;

  // Numerical conversions
  const getRaw = (val) => {
    if (!val) return 0;
    if (typeof val === 'object' && val.$numberDecimal) return parseFloat(val.$numberDecimal) || 0;
    return parseFloat(val) || 0;
  };

  const veBal = getRaw(liveState.veBalance);
  const sveBal = getRaw(liveState.sveBalance);
  const tokenBal = getRaw(liveState.tokenBalance);
  const gemBal = getRaw(liveState.gemBalance);
  const spinBal = liveState.spinBalance || 0;

  // Rupee Rates: 1 VE = ₹1, 1 SVE = ₹2, 1 Token = ₹0.01, 1 Gem = ₹10
  const veRupees = veBal * 1.0;
  const sveRupees = sveBal * 2.0;
  const tokenRupees = tokenBal * 0.01;
  const gemRupees = gemBal * 10.0;
  const totalPortfolioRupees = veRupees + sveRupees + tokenRupees + gemRupees;

  // Tap-to-Cash Projection Calculations
  const multitapLevel = liveState.multitapLevel || 1;
  const effectiveMultiplier = multitapLevel * (includeFeverSurge ? 2 : 1);
  const projectedVE = estimateTaps * effectiveMultiplier;
  const projectedRupees = projectedVE * 1.0;
  const energyRequired = estimateTaps;
  const tappingSeconds = Math.round(estimateTaps / 3.5);
  const tappingDurationStr = tappingSeconds < 60 
    ? `${tappingSeconds}s` 
    : `${Math.floor(tappingSeconds / 60)}m ${tappingSeconds % 60}s`;
  const dailyRupees = projectedRupees * 3;

  const rewardMilestones = [
    {
      coins: 100,
      rupees: 100,
      name: "₹100 Food Voucher",
      brand: "Swiggy & Zomato",
      icon: "🍔",
      tapsRequired: Math.ceil(100 / effectiveMultiplier)
    },
    {
      coins: 150,
      rupees: 150,
      name: "₹150 Coffee Pass",
      brand: "Starbucks India",
      icon: "☕",
      tapsRequired: Math.ceil(150 / effectiveMultiplier)
    },
    {
      coins: 250,
      rupees: 250,
      name: "₹250 Gift Voucher",
      brand: "Amazon Pay & Flipkart",
      icon: "🛒",
      tapsRequired: Math.ceil(250 / effectiveMultiplier)
    },
    {
      coins: 500,
      rupees: 500,
      name: "₹500 Direct Cash",
      brand: "UPI Direct Bank Payout",
      icon: "💸",
      tapsRequired: Math.ceil(500 / effectiveMultiplier)
    },
    {
      coins: 1000,
      rupees: 1000,
      name: "₹1,000 High-Roller Cashout",
      brand: "VIP Bank Settlement",
      icon: "💎",
      tapsRequired: Math.ceil(1000 / effectiveMultiplier)
    }
  ];

  // Chart dataset for Yield Trend
  const chartPointsMap = {
    '24h': [
      { label: '00:00', val: 8 }, { label: '06:00', val: 18 }, { label: '12:00', val: 32 }, { label: '18:00', val: 55 }, { label: 'Now', val: 84 }
    ],
    '7d': [
      { label: 'Mon', val: 45 }, { label: 'Tue', val: 80 }, { label: 'Wed', val: 110 }, { label: 'Thu', val: 165 }, { label: 'Fri', val: 245 }
    ],
    '30d': [
      { label: 'W1', val: 120 }, { label: 'W2', val: 290 }, { label: 'W3', val: 510 }, { label: 'W4', val: 780 }
    ]
  };
  const activeDataset = chartPointsMap[timeframe] || chartPointsMap['7d'];
  const maxChartVal = Math.max(...activeDataset.map(d => d.val), 100);

  // SVG dimensions
  const cWidth = 320;
  const cHeight = 130;
  const pad = 24;
  const wArea = cWidth - pad * 2;
  const hArea = cHeight - pad * 2;

  const pointsCoordinates = activeDataset.map((d, idx) => {
    const x = pad + (idx * wArea) / (activeDataset.length - 1);
    const y = cHeight - pad - (d.val * hArea) / maxChartVal;
    return { x, y, ...d };
  });

  const polylinePoints = pointsCoordinates.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${pad},${cHeight - pad} ` + polylinePoints + ` ${pad + wArea},${cHeight - pad}`;

  return (
    <div className="content-container">
      <div className={styles.mobileContainer}>
        
        {/* Top Header */}
        <div className={styles.topNav}>
          <button onClick={() => navigate('/')} className={styles.btnBack}>
            <ChevronLeft size={16} /> Back
          </button>
          <div className={styles.topNavRight}>
            <span className={styles.livePulseDot} />
            <span className={styles.gatewayLabel}>UPI & WEB3 GATEWAY</span>
          </div>
        </div>

        {/* 1. CAPITAL ASSETS FINTECH CARD WITH RUPEES PRICE */}
        <div className={styles.platinumCard}>
          <div className={styles.cardHeader}>
            <div className={styles.titleInfo}>
              <div className={styles.walletIconCircle}>
                <Wallet size={22} className={styles.iconGold} />
              </div>
              <div>
                <h2 className={styles.cardMainTitle}>Capital Assets</h2>
                <span className={styles.cardSubTitle}>Liquid Wallet Reserves</span>
              </div>
            </div>
            <span className={styles.statusBadge}>ACTIVE GATEWAY</span>
          </div>

          <div className={styles.balanceSection}>
            <span className={styles.balanceSubLabel}>Current Balance & Rupee Valuation</span>
            
            {/* Direct primary balance with both VE and Rupees */}
            <div className={styles.primaryBalanceRow}>
              <div className={styles.primaryVeCol}>
                <span className={styles.primaryVeNum}>{veBal.toFixed(1)}</span>
                <span className={styles.primaryVeUnit}>VE</span>
              </div>
              <span className={styles.equalsDivider}>≈</span>
              <div className={styles.primaryRupeeCol}>
                <span className={styles.rupeeSymbol}>₹</span>
                <span className={styles.primaryRupeeNum}>
                  {veRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={styles.inrTag}>INR</span>
              </div>
            </div>

            {/* Price Conversion Strip */}
            <div className={styles.cryptoEquivRow}>
              <span className={styles.goldCryptoBadge}>
                <Sparkles size={12} className={styles.sparkleIcon} />
                Current Price: 1 VE = ₹1.00 INR
              </span>
              <span className={styles.growthBadge}>
                <TrendingUp size={12} />
                +18.4% Yield
              </span>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.portfolioSummary}>
              <span className={styles.footLabel}>Total Net Portfolio Value</span>
              <strong className={styles.footRupees}>
                ₹ {totalPortfolioRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
              </strong>
            </div>
            <div className={styles.chipMiniRow}>
              <Radio size={14} className={styles.contactlessIcon} />
              <span className={styles.instantTag}>INSTANT SETTLEMENT</span>
            </div>
          </div>
        </div>

        {/* 2. FOUR QUICK ACTION HUBS */}
        <div className={styles.quickActionRow}>
          <button className={styles.quickBtn} onClick={() => setShowTopUp(true)}>
            <div className={`${styles.quickIconCircle} ${styles.bgGreen}`}>
              <ArrowUpRight size={18} />
            </div>
            <span>Top Up</span>
          </button>

          <button className={styles.quickBtn} onClick={() => setShowWithdraw(true)}>
            <div className={`${styles.quickIconCircle} ${styles.bgAmber}`}>
              <ArrowDownLeft size={18} />
            </div>
            <span>Withdraw</span>
          </button>

          <button className={styles.quickBtn} onClick={() => setActiveWalletTab('vouchers')}>
            <div className={`${styles.quickIconCircle} ${styles.bgGold}`}>
              <Gift size={18} />
            </div>
            <span>Vouchers</span>
          </button>

          <button 
            className={styles.quickBtn} 
            onClick={() => {
              const el = document.getElementById('tap-estimator');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className={`${styles.quickIconCircle} ${styles.bgPurple}`}>
              <Calculator size={18} />
            </div>
            <span>Estimator</span>
          </button>
        </div>

        {/* 3. MULTI-ASSET PORTFOLIO BREAKDOWN WITH RUPEE VALUE */}
        <div className={styles.assetsSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionHeading}>Holdings & Token Valuation</h3>
            <span className={styles.assetCount}>4 Assets</span>
          </div>

          <div className={styles.assetsGrid}>
            <div className={styles.assetCard}>
              <div className={styles.assetCardTop}>
                <span className={styles.assetName}>Staked VE (SVE)</span>
                <span className={styles.apyBadge}>+18% APY</span>
              </div>
              <div className={styles.assetCoinVal}>{sveBal.toFixed(1)} SVE</div>
              <div className={styles.assetRupeeVal}>≈ ₹ {sveRupees.toFixed(2)} INR</div>
            </div>

            <div className={styles.assetCard}>
              <div className={styles.assetCardTop}>
                <span className={styles.assetName}>Utility Tokens</span>
                <span className={styles.utilityBadge}>Gas Fuel</span>
              </div>
              <div className={styles.assetCoinVal}>{tokenBal.toFixed(0)} TOKENS</div>
              <div className={styles.assetRupeeVal}>≈ ₹ {tokenRupees.toFixed(2)} INR</div>
            </div>

            <div className={styles.assetCard}>
              <div className={styles.assetCardTop}>
                <span className={styles.assetName}>Capital Gems</span>
                <span className={styles.gemBadge}>1 Gem = ₹10</span>
              </div>
              <div className={styles.assetCoinVal}>{gemBal.toFixed(0)} GEMS</div>
              <div className={styles.assetRupeeVal}>≈ ₹ {gemRupees.toFixed(2)} INR</div>
            </div>

            <div className={styles.assetCard}>
              <div className={styles.assetCardTop}>
                <span className={styles.assetName}>Lucky Spins</span>
                <span className={styles.spinBadge}>Instant Win</span>
              </div>
              <div className={styles.assetCoinVal}>{spinBal} SPINS</div>
              <div className={styles.assetRupeeVal}>Jackpot Wheels</div>
            </div>
          </div>
        </div>

        {/* 4. TAP-TO-CASH PROJECTION & COIN-TO-RUPEE ESTIMATOR CARD */}
        <div id="tap-estimator" className={styles.estimatorCard}>
          <div className={styles.estimatorHeader}>
            <div className={styles.estimatorTitleGroup}>
              <div className={styles.estimatorIconBadge}>
                <Calculator size={20} className={styles.iconGold} />
              </div>
              <div>
                <h3 className={styles.estimatorHeading}>Tap-to-Cash Projection Estimator</h3>
                <span className={styles.estimatorSub}>Calculate exact coins & ₹ Rupees earned from your taps</span>
              </div>
            </div>
            <div className={styles.rateChip}>
              <Sparkles size={11} className={styles.sparkleIcon} />
              <span>1 Tap = ₹1.00 INR (Base)</span>
            </div>
          </div>

          {/* Controls: Range Slider + Custom Number Input */}
          <div className={styles.estimatorControls}>
            <div className={styles.sliderLabelRow}>
              <span className={styles.sliderLabel}>Select or Slide Tap Volume:</span>
              <div className={styles.inputWrapper}>
                <input 
                  type="number"
                  min="10"
                  max="10000"
                  value={estimateTaps}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setEstimateTaps(Math.min(Math.max(val, 0), 10000));
                  }}
                  className={styles.tapNumberInput}
                />
                <span className={styles.inputUnit}>Taps</span>
              </div>
            </div>

            <input 
              type="range"
              min="25"
              max="2500"
              step="25"
              value={estimateTaps}
              onChange={(e) => setEstimateTaps(parseInt(e.target.value))}
              className={styles.tapRangeSlider}
            />

            {/* Quick Preset Selector Buttons */}
            <div className={styles.presetRow}>
              {[
                { label: '100 Taps', val: 100 },
                { label: '250 Taps', val: 250 },
                { label: '500 Taps (Full ⚡)', val: 500 },
                { label: '1,000 Taps', val: 1000 },
                { label: '2,500 Taps', val: 2500 }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  className={`${styles.presetBtn} ${estimateTaps === p.val ? styles.activePreset : ''}`}
                  onClick={() => setEstimateTaps(p.val)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Multiplier Info & Fever Surge Boost Switch */}
            <div className={styles.multiplierBar}>
              <div className={styles.multiplierInfo}>
                <span className={styles.multLabel}>Active Multiplier:</span>
                <span className={styles.multBadge}>
                  Level {multitapLevel} ({multitapLevel}x Coins/Tap)
                </span>
              </div>
              <button 
                type="button" 
                className={`${styles.feverToggleBtn} ${includeFeverSurge ? styles.feverActive : ''}`}
                onClick={() => setIncludeFeverSurge(!includeFeverSurge)}
              >
                <Flame size={13} className={includeFeverSurge ? styles.flameOrange : ''} />
                <span>{includeFeverSurge ? '🔥 2x Fever Boost ON' : '+ 2x Fever Boost'}</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC PROJECTION RESULT DISPLAY */}
          <div className={styles.projectionResultCard}>
            <div className={styles.formulaStrip}>
              <span>{estimateTaps.toLocaleString()} Taps</span>
              <span className={styles.opSym}>×</span>
              <span>{effectiveMultiplier}x Multiplier</span>
              <span className={styles.opSym}>=</span>
              <span className={styles.formulaHighlight}>{projectedVE.toLocaleString()} VE Coins</span>
            </div>

            <div className={styles.payoutMainRow}>
              <div className={styles.payoutMetric}>
                <span className={styles.metricCaption}>Estimated Earnings</span>
                <div className={styles.cashNumberWrap}>
                  <span className={styles.cashSymbol}>₹</span>
                  <span className={styles.cashAmount}>
                    {projectedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={styles.cashCurrency}>INR</span>
                </div>
              </div>

              <div className={styles.payoutDivider} />

              <div className={styles.payoutSubStats}>
                <div className={styles.subStatItem}>
                  <span className={styles.subStatLabel}>Energy Needed:</span>
                  <strong className={styles.subStatVal}>{energyRequired} ⚡</strong>
                </div>
                <div className={styles.subStatItem}>
                  <span className={styles.subStatLabel}>Est. Tap Time:</span>
                  <strong className={styles.subStatVal}>~{tappingDurationStr}</strong>
                </div>
                <div className={styles.subStatItem}>
                  <span className={styles.subStatLabel}>3x Refills/Day:</span>
                  <strong className={styles.subStatGreen}>₹ {dailyRupees.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* MILESTONE UNLOCKS MATRIX */}
          <div className={styles.milestonesWrap}>
            <div className={styles.milestoneHeaderRow}>
              <h4 className={styles.milestoneHeading}>
                <Target size={14} className={styles.iconGold} />
                What You Can Cash Out & Unlock:
              </h4>
              <span className={styles.milestoneHint}>Calculated for {estimateTaps} taps</span>
            </div>

            <div className={styles.milestoneList}>
              {rewardMilestones.map((m, idx) => {
                const isUnlocked = projectedRupees >= m.rupees;
                const progressPct = Math.min(100, Math.round((projectedRupees / m.rupees) * 100));
                return (
                  <div 
                    key={idx} 
                    className={`${styles.milestoneItem} ${isUnlocked ? styles.milestoneUnlocked : ''}`}
                  >
                    <div className={styles.mIconWrap}>{m.icon}</div>
                    <div className={styles.mInfoWrap}>
                      <div className={styles.mTitleLine}>
                        <span className={styles.mName}>{m.name}</span>
                        <span className={styles.mRupeeTag}>₹{m.rupees}</span>
                      </div>
                      <div className={styles.mBrandLine}>
                        <span>{m.brand}</span>
                        <span className={styles.mTapCount}>({m.tapsRequired} taps needed)</span>
                      </div>
                      <div className={styles.mProgressBarTrack}>
                        <div 
                          className={styles.mProgressBarFill} 
                          style={{ width: `${progressPct}%`, background: isUnlocked ? '#10b981' : '#ffb800' }}
                        />
                      </div>
                    </div>
                    <div className={styles.mStatusWrap}>
                      {isUnlocked ? (
                        <span className={styles.badgeUnlocked}>
                          <Check size={11} /> Ready to Cash
                        </span>
                      ) : (
                        <span className={styles.badgeRemaining}>
                          ₹{(m.rupees - projectedRupees).toFixed(0)} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Call to Action: Tap Coins Now */}
          <button 
            type="button"
            className={styles.btnStartTapping}
            onClick={() => navigate('/')}
          >
            <Zap size={16} />
            <span>Tap Coins Now to Earn ₹{projectedRupees.toFixed(0)} INR</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 5. SEGMENTED TAB SWITCHER */}
        <div className={styles.tabSwitcher}>
          <button 
            className={`${styles.tabBtn} ${activeWalletTab === 'vouchers' ? styles.activeTab : ''}`}
            onClick={() => setActiveWalletTab('vouchers')}
          >
            <Gift size={16} />
            <span>🎁 Redeem Vouchers</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeWalletTab === 'ledger' ? styles.activeTab : ''}`}
            onClick={() => setActiveWalletTab('ledger')}
          >
            <Activity size={16} />
            <span>📈 Yield & Audit Ledger</span>
          </button>
        </div>

        {/* 5. TAB 1: Vouchers Store */}
        {activeWalletTab === 'vouchers' && <VouchersTab />}

        {/* 6. TAB 2: Yield Chart & Audit Ledger */}
        {activeWalletTab === 'ledger' && (
          <>
            {/* Interactive SVG Area Chart */}
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <div className={styles.chartTitleWrap}>
                  <Activity size={16} className={styles.chartIconBlue} />
                  <div>
                    <h4 className={styles.chartTitle}>Yield Performance Curve</h4>
                    <span className={styles.chartSub}>Historical payout trend</span>
                  </div>
                </div>

                <div className={styles.timeframePills}>
                  {['24h', '7d', '30d'].map(tf => (
                    <button
                      key={tf}
                      className={`${styles.tfPill} ${timeframe === tf ? styles.activeTf : ''}`}
                      onClick={() => setTimeframe(tf)}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.svgWrapper}>
                <svg viewBox={`0 0 ${cWidth} ${cHeight}`} className={styles.chartSvg}>
                  <defs>
                    <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1={pad} y1={pad} x2={cWidth - pad} y2={pad} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                  <line x1={pad} y1={cHeight/2} x2={cWidth - pad} y2={cHeight/2} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                  <line x1={pad} y1={cHeight - pad} x2={cWidth - pad} y2={cHeight - pad} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

                  {/* Area Fill */}
                  <polygon points={areaPoints} fill="url(#areaGlow)" />

                  {/* Curve Line */}
                  <polyline points={polylinePoints} fill="none" stroke="#00f0ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Data Point Dots & Values */}
                  {pointsCoordinates.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4.5" fill="#0f131c" stroke="#ffb800" strokeWidth="2" />
                      <text x={p.x} y={p.y - 8} fontSize="9" fill="#ffb800" textAnchor="middle" fontWeight="bold">
                        ₹{p.val}
                      </text>
                      <text x={p.x} y={cHeight - 8} fontSize="8" fill="#94a3b8" textAnchor="middle">
                        {p.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Audit Ledger List */}
            <div className={styles.ledgerSection}>
              <div className={styles.ledgerHeader}>
                <h3 className={styles.ledgerTitle}>Reward Audit Ledger</h3>
                <span className={styles.auditTag}>TRANSACTION LOGS</span>
              </div>

              {loadingLedger ? (
                <div className={styles.ledgerLoading}>Retrieving audit records...</div>
              ) : ledger.length === 0 ? (
                <div className={styles.ledgerEmpty}>No transaction logs detected.</div>
              ) : (
                <div className={styles.ledgerList}>
                  {ledger.map(item => {
                    const isCredit = item.amount > 0;
                    const numAmt = Math.abs(parseFloat(item.amount.$numberDecimal || item.amount));
                    return (
                      <div key={item.id || item.requestId} className={styles.ledgerItem}>
                        <div className={styles.ledgerLeft}>
                          <div className={styles.ledgerType}>
                            {item.type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className={styles.ledgerTime}>
                            {new Date(item.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                        <div className={styles.ledgerRight}>
                          <span className={`${styles.ledgerAmt} ${isCredit ? styles.credit : styles.debit}`}>
                            {isCredit ? '+' : '-'}{numAmt.toFixed(1)} {item.currency}
                          </span>
                          <span className={styles.ledgerInrSub}>
                            ≈ ₹ {(numAmt * (item.currency === 'SVE' ? 2 : 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={styles.pageBtn}
                      >
                        Prev
                      </button>
                      <span className={styles.pageIndicator}>Page {currentPage} of {totalPages}</span>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={styles.pageBtn}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* 7. MODAL: TOP-UP WALLET (INR DEPOSIT) */}
        {showTopUp && (
          <div className={styles.modalOverlay} onClick={() => setShowTopUp(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleRow}>
                  <ArrowUpRight size={20} className={styles.iconGreen} />
                  <h3>Deposit & Top Up Balance</h3>
                </div>
                <button className={styles.closeBtn} onClick={() => setShowTopUp(false)}><X size={18} /></button>
              </div>

              {topUpMsg && <div className={styles.msgToast}>{topUpMsg}</div>}

              <form onSubmit={handleInitiateTopUp} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Select Top-Up Amount (INR)</label>
                  <div className={styles.presetChips}>
                    {['50', '100', '250', '500'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className={`${styles.presetChip} ${topUpAmt === amt ? styles.activeChip : ''}`}
                        onClick={() => setTopUpAmt(amt)}
                      >
                        ₹ {amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="10"
                    placeholder="Enter custom amount in Rupees"
                    value={topUpAmt}
                    onChange={(e) => setTopUpAmt(e.target.value)}
                    className={styles.inputField}
                    required
                  />
                  <span className={styles.formHint}>Credits +{parseFloat(topUpAmt || 0).toFixed(1)} VE directly to your game balance.</span>
                </div>

                <div className={styles.formGroup}>
                  <label>Payment Gateway / App</label>
                  <div className={styles.gatewaySelector}>
                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map(app => (
                      <button
                        key={app}
                        type="button"
                        className={`${styles.gatewayBtn} ${topUpMethod === app ? styles.activeGateway : ''}`}
                        onClick={() => setTopUpMethod(app)}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className={styles.btnPrimaryGreen} disabled={toppingUp}>
                  {toppingUp ? 'Processing Payment...' : `Pay ₹ ${parseFloat(topUpAmt || 0).toFixed(2)} & Add VE`}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 8. MODAL: UPI WITHDRAWAL (INR PAYOUT) */}
        {showWithdraw && (
          <div className={styles.modalOverlay} onClick={() => setShowWithdraw(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleRow}>
                  <ArrowDownLeft size={20} className={styles.iconGold} />
                  <h3>Withdraw Funds via UPI</h3>
                </div>
                <button className={styles.closeBtn} onClick={() => setShowWithdraw(false)}><X size={18} /></button>
              </div>

              {withdrawMsg && <div className={styles.msgToast}>{withdrawMsg}</div>}

              <form onSubmit={handleInitiateWithdrawal} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Withdrawal Amount (Available: ₹ {veRupees.toFixed(2)})</label>
                  <div className={styles.presetChips}>
                    {['25', '50', '100'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className={`${styles.presetChip} ${withdrawAmt === amt ? styles.activeChip : ''}`}
                        onClick={() => setWithdrawAmt(amt)}
                      >
                        ₹ {amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`${styles.presetChip} ${withdrawAmt === veRupees.toFixed(0) ? styles.activeChip : ''}`}
                      onClick={() => setWithdrawAmt(veRupees.toFixed(0))}
                    >
                      MAX (₹ {veRupees.toFixed(0)})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Amount to withdraw in INR"
                    value={withdrawAmt}
                    onChange={(e) => setWithdrawAmt(e.target.value)}
                    className={styles.inputField}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Your Registered UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. mobile@paytm or user@okhdfcbank"
                    value={withdrawUpi}
                    onChange={(e) => setWithdrawUpi(e.target.value)}
                    className={styles.inputField}
                    required
                  />
                </div>

                <div className={styles.feeBreakdown}>
                  <div className={styles.feeRow}>
                    <span>Payout Amount:</span>
                    <strong>₹ {parseFloat(withdrawAmt || 0).toFixed(2)}</strong>
                  </div>
                  <div className={styles.feeRow}>
                    <span>Transfer Processing Fee:</span>
                    <span className={styles.freeTag}>₹ 0.00 (FREE)</span>
                  </div>
                  <div className={styles.feeRow}>
                    <span>Estimated Settlement:</span>
                    <span>Instant (1 - 5 mins)</span>
                  </div>
                </div>

                <button type="submit" className={styles.btnPrimaryGold} disabled={withdrawing}>
                  {withdrawing ? 'Submitting Request...' : `Confirm Withdrawal of ₹ ${parseFloat(withdrawAmt || 0).toFixed(2)}`}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
