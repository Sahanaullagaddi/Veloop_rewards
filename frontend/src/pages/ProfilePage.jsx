import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Award, Calendar, ChevronLeft, User, ShieldCheck } from 'lucide-react';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

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
    </div>
  );
}
