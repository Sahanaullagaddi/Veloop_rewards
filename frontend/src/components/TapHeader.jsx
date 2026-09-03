import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Flame, Bell, Settings, Wallet, User as UserIcon, Calendar, BookOpen, Users } from 'lucide-react';
import styles from './TapHeader.module.css';

export default function TapHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { liveState } = useSocket();

  if (!user || !liveState) return null;

  const isCurrent = (path) => location.pathname === path;

  // Format dynamic decimal balances safely
  const formatBalance = (val) => {
    if (val === null || val === undefined) return '0.0';
    let raw = val;
    if (typeof val === 'object' && val.$numberDecimal) {
      raw = val.$numberDecimal;
    }
    const num = parseFloat(raw);
    return isNaN(num) ? '0.0' : num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  // Format integer token balances safely
  const formatInt = (val) => {
    if (val === null || val === undefined) return '0';
    let raw = val;
    if (typeof val === 'object' && val.$numberDecimal) {
      raw = val.$numberDecimal;
    }
    const num = Math.floor(parseFloat(raw));
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  return (
    <header className={styles.header}>
      {/* Profile Section (Left) */}
      <div className={styles.profileSection} onClick={() => navigate('/profile')}>
        <div className={styles.avatar}>
          {user.username.substring(0, 1).toUpperCase()}
        </div>
        <div className={styles.profileMeta}>
          <span className={styles.username}>{user.username}</span>
          <span className={styles.levelBadgeTopLeft}>
            <span className={styles.levelStar}>★</span> Lvl {liveState.level || 1}
          </span>
        </div>
      </div>

      {/* Main VE Balance (Center) */}
      <div className={styles.mainBalance} onClick={() => navigate('/wallet')}>
        <span className={styles.balanceText}>{formatBalance(liveState.veBalance)} VE</span>
      </div>

      {/* Secondary Dot Balances (Right) */}
      <div className={styles.secondaryBalances}>
        <div className={styles.statItem} title="SVE Balance">
          <span className={styles.dotYellow} />
          <span>{formatInt(liveState.sveBalance)}</span>
        </div>
        <div className={styles.statItem} title="Token Balance">
          <span className={styles.dotGreen} />
          <span>{formatInt(liveState.tokenBalance)}</span>
        </div>
        <div className={styles.statItem} title="Gem Balance">
          <span className={styles.dotPurple} />
          <span>{formatInt(liveState.gemBalance)}</span>
        </div>
        <div className={styles.statItem} title="Spins Balance">
          <span className={styles.dotBlue} />
          <span>{liveState.spinBalance || 0}</span>
        </div>
      </div>
    </header>
  );
}
