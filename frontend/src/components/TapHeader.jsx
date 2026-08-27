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

  return (
    <header className={styles.header}>
      {/* Identity Logo */}
      <div className={styles.logoSection} onClick={() => navigate('/')}>
        <span className={styles.wordmark}>VELoop</span>
        <span className={styles.tag}>Tap & Earn</span>
      </div>

      {/* Nav Elements */}
      <div className={styles.navRow}>
        {/* Streak Flame */}
        <div 
          className={`${styles.navItem} ${styles.streakFlame} ${liveState.currentStreak > 0 ? styles.glowingFlame : ''} ${isCurrent('/streak') ? styles.active : ''}`}
          onClick={() => navigate('/streak')}
          title="Tap Streak"
        >
          <Flame size={16} className={styles.iconOrange} />
          <span className={styles.streakText}>{liveState.currentStreak || 0}</span>
        </div>

        {/* VE Balance Chip */}
        <div 
          className={`${styles.navItem} ${styles.balanceChip} ${isCurrent('/wallet') ? styles.active : ''}`}
          onClick={() => navigate('/wallet')}
          title="Wallet"
        >
          <Wallet size={16} className={styles.iconGold} />
          <span className={styles.balanceText}>{formatBalance(liveState.veBalance)} VE</span>
        </div>

        {/* Notification Bell */}
        <div 
          className={`${styles.navItem} ${styles.bellBtn} ${isCurrent('/notifications') ? styles.active : ''}`}
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <Bell size={16} />
          {liveState.notificationsCount > 0 && (
            <span className={styles.badge}>{liveState.notificationsCount}</span>
          )}
        </div>

        {/* Settings Icon */}
        <div 
          className={`${styles.navItem} ${styles.settingsBtn} ${isCurrent('/settings') ? styles.active : ''}`}
          onClick={() => navigate('/settings')}
          title="Settings"
        >
          <Settings size={16} />
        </div>
      </div>
    </header>
  );
}
