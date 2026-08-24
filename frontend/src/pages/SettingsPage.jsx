import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, LogOut, ShieldAlert, Monitor, Volume2, Moon } from 'lucide-react';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    theme, toggleTheme, reducedMotion, setReducedMotion, hapticsEnabled, setHapticsEnabled 
  } = useTheme();

  if (!user) return null;

  return (
    <div className="content-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <h2>Module Preferences</h2>
      <p className={styles.description}>Configure local VELoop Tap & Earn interface parameters.</p>

      {/* Toggles Card */}
      <div className={styles.card}>
        {/* Theme Toggle */}
        <div className={styles.row}>
          <div className={styles.labelGroup}>
            <Moon size={18} className={styles.iconBlue} />
            <div>
              <div className={styles.settingTitle}>Dark Theme / Palette</div>
              <div className={styles.settingDesc}>Enforces deep navy fintech theme. Toggle to switch.</div>
            </div>
          </div>
          <button onClick={toggleTheme} className={styles.btnToggle}>
            {theme === 'dark' ? 'DARK' : 'LIGHT'}
          </button>
        </div>

        <div className={styles.divider} />

        {/* Haptics */}
        <div className={styles.row}>
          <div className={styles.labelGroup}>
            <Volume2 size={18} className={styles.iconGold} />
            <div>
              <div className={styles.settingTitle}>Haptic Feedbacks</div>
              <div className={styles.settingDesc}>Vibrate phone during physical clicks and rewards.</div>
            </div>
          </div>
          <button 
            onClick={() => setHapticsEnabled(!hapticsEnabled)} 
            className={`${styles.btnToggle} ${hapticsEnabled ? styles.active : ''}`}
          >
            {hapticsEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div className={styles.divider} />

        {/* Reduced Motion */}
        <div className={styles.row}>
          <div className={styles.labelGroup}>
            <Monitor size={18} className={styles.iconBlue} />
            <div>
              <div className={styles.settingTitle}>Reduced Motion</div>
              <div className={styles.settingDesc}>Disables floating coin bursts and spin wheel transitions.</div>
            </div>
          </div>
          <button 
            onClick={() => setReducedMotion(!reducedMotion)} 
            className={`${styles.btnToggle} ${reducedMotion ? styles.active : ''}`}
          >
            {reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Account Info card */}
      <div className={styles.card}>
        <div className={styles.labelGroup}>
          <ShieldAlert size={18} className={styles.iconGold} />
          <div>
            <div className={styles.settingTitle}>Security Access Profile</div>
            <div className={styles.settingDesc}>Authenticated session username: <strong>{user.username}</strong></div>
          </div>
        </div>
        
        <button onClick={logout} className={styles.btnLogout}>
          <LogOut size={16} /> Close Session & Logout
        </button>
      </div>

    </div>
  );
}
