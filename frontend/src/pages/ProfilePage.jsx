import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Award, Calendar, ChevronLeft, User, ShieldCheck, LogOut, Settings } from 'lucide-react';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { liveState } = useSocket();

  if (!user || !liveState) return <div className="loading-screen">Loading Profile...</div>;

  const xpNeeded = (liveState.level || 1) * 200;
  const xpPct = Math.min(100, ((liveState.xp || 0) / xpNeeded) * 100);

  const formattedDate = user.createdAt 
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Standard user badges list
  const badgesList = user.badges || [];

  return (
    <div className="content-container">
      {/* Navigation Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={() => navigate('/')} className={styles.btnBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'transparent', border: '1px solid #1a1a2e', borderRadius: '15px', color: '#888', cursor: 'pointer' }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <button onClick={() => navigate('/settings')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'transparent', border: '1px solid #1a1a2e', borderRadius: '15px', color: '#888', cursor: 'pointer' }}>
          <Settings size={14} /> Settings
        </button>
      </div>

      <div className={styles.profileHeader}>
        <div className={styles.largeAvatar}>
          {user.username.substring(0, 2).toUpperCase()}
        </div>
        <h2 className={styles.username}>{user.username}</h2>
        <span className={styles.securityTag}>SECURE MEMBER</span>
      </div>

      {/* Level Card */}
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Fintech Level</span>
          <span className={styles.levelText}>Lvl {liveState.level || 1}</span>
        </div>
        <div className={styles.xpRow}>
          <span>{liveState.xp || 0} XP</span>
          <span>{xpNeeded} XP for Lvl {(liveState.level || 1) + 1}</span>
        </div>
        <div className={styles.progressContainer}>
          <div className={styles.progressFill} style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      {/* Join Details */}
      <div className={styles.infoCard}>
        <Calendar size={16} className={styles.iconBlue} />
        <div>
          <div className={styles.label}>Member Since</div>
          <div className={styles.infoText}>{formattedDate}</div>
        </div>
      </div>

      {/* Badges / Achievements */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Award size={18} className={styles.iconGold} /> Earned Badges & Achievements
        </h3>
        
        {badgesList.length === 0 ? (
          <div className={styles.emptyBadges}>
            <p>No badges unlocked yet.</p>
            <span>Complete active milestones on the dashboard to unlock badges.</span>
          </div>
        ) : (
          <div className={styles.badgesGrid}>
            {badgesList.map((b, idx) => (
              <div key={idx} className={styles.badgeCard}>
                <ShieldCheck size={28} className={styles.badgeIcon} />
                <span className={styles.badgeName}>{b.name}</span>
                <span className={styles.badgeDate}>
                  {new Date(b.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout Action */}
      <div style={{ marginTop: '30px', padding: '0 10px' }}>
        <button 
          onClick={logout} 
          style={{
            width: '100%',
            backgroundColor: '#ff3333',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(255, 51, 51, 0.2)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e62e2e'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff3333'}
        >
          <LogOut size={16} /> Close Session & Logout
        </button>
      </div>
    </div>
  );
}
