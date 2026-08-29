import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Wallet, Trophy, Users, User, ShieldAlert } from 'lucide-react';
import styles from './BottomNavigation.module.css';

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={styles.bottomNav}>
      <button 
        onClick={() => navigate('/')} 
        className={`${styles.navItem} ${styles.tapTab} ${isActive('/') ? styles.active : ''}`}
      >
        <Zap size={20} />
        <span>Tap</span>
      </button>

      <button 
        onClick={() => navigate('/wallet')} 
        className={`${styles.navItem} ${styles.walletTab} ${isActive('/wallet') ? styles.active : ''}`}
      >
        <Wallet size={20} />
        <span>Wallet</span>
      </button>

      <button 
        onClick={() => navigate('/league')} 
        className={`${styles.navItem} ${styles.leaguesTab} ${isActive('/league') ? styles.active : ''}`}
      >
        <Trophy size={20} />
        <span>Leagues</span>
      </button>

      <button 
        onClick={() => navigate('/invites')} 
        className={`${styles.navItem} ${styles.invitesTab} ${isActive('/invites') ? styles.active : ''}`}
      >
        <Users size={20} />
        <span>Invites</span>
      </button>

      <button 
        onClick={() => navigate('/profile')} 
        className={`${styles.navItem} ${styles.profileTab} ${isActive('/profile') ? styles.active : ''}`}
      >
        <User size={20} />
        <span>Profile</span>
      </button>

      {user.isAdmin && (
        <button 
          onClick={() => navigate('/admin')} 
          className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}
        >
          <ShieldAlert size={20} className={styles.adminIcon} />
          <span>Admin</span>
        </button>
      )}
    </nav>
  );
}
