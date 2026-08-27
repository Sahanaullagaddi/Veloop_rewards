import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { ChevronLeft, BookOpen, Gift, Shield, Zap, Award, Info } from 'lucide-react';
import styles from './RulesPage.module.css';

export default function RulesPage() {
  const navigate = useNavigate();
  const { liveState } = useSocket();

  if (!liveState) return null;

  // Handles strings, numbers, and Mongoose Decimal128 objects
  const parseVal = (val) => {
    if (val === null || val === undefined) return '0.0';
    let raw = val;
    if (typeof val === 'object' && val.$numberDecimal) {
      raw = val.$numberDecimal;
    }
    const num = parseFloat(raw);
    return isNaN(num) ? '0.0' : num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  // Convert game assets to Rupees (Rs.) helper
  const getAssetValueRaw = (val, type) => {
    if (val === null || val === undefined) return 0;
    let raw = val;
    if (typeof val === 'object' && val.$numberDecimal) {
      raw = val.$numberDecimal;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) return 0;
    
    let rate = 1.0;
    if (type === 'VE') rate = 1.0;          // 1 VE = Rs. 1.00
    else if (type === 'SVE') rate = 2.0;     // 1 SVE = Rs. 2.00
    else if (type === 'Token') rate = 0.01;  // 100 Tokens = Rs. 1.00
    else if (type === 'Gem') rate = 10.0;    // 1 Gem = Rs. 10.00
    return num * rate;
  };

  const getRupeeVal = (val, type) => {
    const rawVal = getAssetValueRaw(val, type);
    return `Rs. ${rawVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Sum all Rupee asset valuations to compute Net Capital Overall
  const getTotalCapitalRupees = () => {
    const ve = getAssetValueRaw(liveState.veBalance, 'VE');
    const sve = getAssetValueRaw(liveState.sveBalance, 'SVE');
    const token = getAssetValueRaw(liveState.tokenBalance, 'Token');
    const gem = getAssetValueRaw(liveState.gemBalance, 'Gem');
    const total = ve + sve + token + gem;
    return `Rs. ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="content-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <div className={styles.rulesHeader}>
        <BookOpen className={styles.iconBlue} size={28} />
        <h2>VELoop Rules & Mechanics</h2>
      </div>
      <p className={styles.subtitle}>Review the server-authoritative logic governing rewards, limits, and assets.</p>

      {/* Section 1: Lucky Spin */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Gift className={styles.iconGold} size={20} />
          <h3>Lucky Spin Wheel Rules</h3>
        </div>
        <p className={styles.desc}>
          Qualify for the Lucky Wheel and earn high-tier rewards dynamically:
        </p>

        <ul className={styles.bullets}>
          <li><strong>Spin Requirement:</strong> Accumulate exactly <strong>10 accepted taps</strong> to earn <strong>1 Lucky Spin</strong> (obtained for free via tapping).</li>
          <li><strong>Asset Payouts:</strong> Spins roll authoritatively on the server and award VE, SVE, Gems, or Tokens.</li>
          <li><strong>Instant Settlement:</strong> Immediately after spinning, the won reward is atomically credited. Your wallet balance is updated on screen in real-time.</li>
        </ul>

        {/* Current status info */}
        <div className={styles.statusBox}>
          <div>Your Spins Balance: <strong>{liveState.spinBalance || 0} Spins</strong></div>
          <div>Total Accepted Taps: <strong>{liveState.totalAcceptedTaps || 0} Taps</strong></div>
        </div>

        {/* User wallet balance preview with Overall Net Capital */}
        <div className={styles.balancesPreviewBox}>
          <div className={styles.balancesPreviewHeader}>
            <h4 className={styles.balancesTitle}>Your Current Wallet Balances & Fiat Value (Rs.):</h4>
            <div className={styles.totalRupeeBalance}>
              Total Net Capital: <strong>{getTotalCapitalRupees()}</strong>
            </div>
          </div>
          <div className={styles.balancesGrid}>
            <div className={styles.balanceItem}>
              VE: <strong>{parseVal(liveState.veBalance)} VE</strong>
              <span className={styles.fiatVal}>≈ {getRupeeVal(liveState.veBalance, 'VE')}</span>
            </div>
            <div className={styles.balanceItem}>
              SVE: <strong>{parseVal(liveState.sveBalance)} SVE</strong>
              <span className={styles.fiatVal}>≈ {getRupeeVal(liveState.sveBalance, 'SVE')}</span>
            </div>
            <div className={styles.balanceItem}>
              Tokens: <strong>{parseVal(liveState.tokenBalance)} Tokens</strong>
              <span className={styles.fiatVal}>≈ {getRupeeVal(liveState.tokenBalance, 'Token')}</span>
            </div>
            <div className={styles.balanceItem}>
              Gems: <strong>{parseVal(liveState.gemBalance)} Gems</strong>
              <span className={styles.fiatVal}>≈ {getRupeeVal(liveState.gemBalance, 'Gem')}</span>
            </div>
          </div>
          <div className={styles.balancesNote}>
            *Once you trigger a spin, the won reward amount (e.g. +10 VE or +500 Tokens) is instantly added directly to the values above.
          </div>
        </div>

        <div className={styles.alertBox}>
          <Info size={14} className={styles.infoAlert} />
          <span>
            <strong>Asset Credit Policy:</strong> When you spin, the reward type and amount are rolled authoritatively on the server. The won assets are instantly and atomically credited to your wallet balance. There is no claiming delay—balances update on screen in real-time.
          </span>
        </div>

        <h4>Probability & Reward Payout List</h4>
        <div className={styles.tableList}>
          <div className={styles.tableRow}><span>10.0 VE (Common)</span><strong>50.0% probability (≈ Rs. 10.00)</strong></div>
          <div className={styles.tableRow}><span>50.0 VE (Uncommon)</span><strong>20.0% probability (≈ Rs. 50.00)</strong></div>
          <div className={styles.tableRow}><span>5.0 SVE (Rare)</span><strong>15.0% probability (≈ Rs. 10.00)</strong></div>
          <div className={styles.tableRow}><span>10.0 Gems (Epic)</span><strong>10.0% probability (≈ Rs. 100.00)</strong></div>
          <div className={styles.tableRow}><span>100.0 Tokens (Legendary)</span><strong>4.0% probability (≈ Rs. 1.00)</strong></div>
          <div className={styles.tableRow}><span>500.0 Tokens (Jackpot)</span><strong>1.0% probability (≈ Rs. 5.00)</strong></div>
        </div>
      </div>

      {/* Section 2: Authoritative Tap Loop */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Zap className={styles.iconBlue} size={20} />
          <h3>Anti-Abuse Rate Limits</h3>
        </div>
        <p className={styles.desc}>
          To protect the economy from automated scripts and macro abuse, the backend enforces the following check:
        </p>
        <ul className={styles.bullets}>
          <li><strong>200ms Rate Limit:</strong> Physical clicks submitted under 200ms are rejected as suspicious activity (`429 Too Fast`), and your local state is rolled back.</li>
          <li><strong>2s Combo Window:</strong> Tapping consecutively within 2 seconds increments your tap combo. Every 10 combo steps adds a <strong>+5%</strong> multiplier to your reward payouts.</li>
          <li><strong>Idempotency Filters:</strong> Every tap submission includes a unique `requestId`. Duplicate submissions return cached yields to prevent replay attacks.</li>
        </ul>
      </div>

      {/* Section 3: Energy Shield Guard */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Shield className={styles.iconGold} size={20} />
          <h3>Energy Shield Details</h3>
        </div>
        <p className={styles.desc}>
          Protect your energy reserve during high-multiplier combo streaks:
        </p>
        <ul className={styles.bullets}>
          <li><strong>Cost:</strong> 100 VE per activation.</li>
          <li><strong>Duration:</strong> 30 seconds of active protection.</li>
          <li><strong>Rate:</strong> Decreases physical tap energy consumption by <strong>90%</strong> (only consumes 0.1 energy per tap instead of 1.0).</li>
          <li><strong>Cooldown:</strong> Enforces a strict 5-minute cooloff period between shields.</li>
        </ul>
      </div>

      {/* Section 4: Season Placement */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Award className={styles.iconBlue} size={20} />
          <h3>Seasonal Leaderboard Rewards</h3>
        </div>
        <p className={styles.desc}>
          Rankings are determined by your cumulative seasonal score (effective taps). At the end of each season, VE rewards are distributed as follows:
        </p>
        <div className={styles.tableList}>
          <div className={styles.tableRow}><span>1st Place (Champion)</span><strong>1000.0 VE (≈ Rs. 1,000.00)</strong></div>
          <div className={styles.tableRow}><span>2nd & 3rd Place (Podium)</span><strong>500.0 VE (≈ Rs. 500.00)</strong></div>
          <div className={styles.tableRow}><span>4th to 10th Place (Elite)</span><strong>200.0 VE (≈ Rs. 200.00)</strong></div>
          <div className={styles.tableRow}><span>11th to 50th Place (Challenger)</span><strong>100.0 VE (≈ Rs. 100.00)</strong></div>
          <div className={styles.tableRow}><span>51st to 100th Place (Contender)</span><strong>50.0 VE (≈ Rs. 50.00)</strong></div>
        </div>
        <p className={styles.note}>
          *Rank ties are resolved deterministically: the player who achieved the score first holds the higher placement rank.
        </p>
      </div>

    </div>
  );
}
