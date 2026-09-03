import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Award, Calendar, ChevronLeft, User, ShieldCheck, LogOut, Settings, ChevronRight, BookOpen } from 'lucide-react';
import { API_URL } from '../config';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { liveState, reconcileState } = useSocket();

  if (!user || !liveState) return <div className="loading-screen">Loading Profile...</div>;

  const handleGenderChange = async (newGender) => {
    try {
      const res = await fetch(`${API_URL}/api/tap/user/gender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gender: newGender })
      });
      const data = await res.json();
      if (data.success) {
        reconcileState({
          gender: data.gender,
          character_image_url: data.character_image_url
        });
      }
    } catch (err) {
      console.error('Failed to change gender:', err);
    }
  };

  const xpNeeded = (liveState.level || 1) * 200;
  const xpPct = Math.min(100, ((liveState.xp || 0) / xpNeeded) * 100);

  const formattedDate = user.createdAt 
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Standard user badges list
  const badgesList = user.badges || [];

  return (
    <div className="content-container">
      <div className={styles.mobileContainer}>
        
        {/* Profile Header Block */}
        <div className={styles.profileHeaderBlock}>
          <button onClick={() => navigate('/settings')} className={styles.settingsBtn}>
            <Settings size={18} />
          </button>
          
          <div className={styles.avatarWrapper}>
            <div className={styles.largeAvatar}>
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className={styles.levelBadge}>Lvl {liveState.level || 1}</div>
          </div>
          
          <h2 className={styles.username}>{user.username}</h2>
          <span className={styles.titleBadge}>
            {liveState.level >= 10 ? 'Veloop Tycoon' : liveState.level >= 5 ? 'Fintech Specialist' : 'Novice Trader'}
          </span>
        </div>

        {/* Character Gender Selector */}
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>Gender</span>
            <div className={styles.genderToggleGroup}>
              <button 
                className={`${styles.genderBtn} ${(liveState.gender || 'male') === 'male' ? styles.genderActive : ''}`}
                onClick={() => handleGenderChange('male')}
              >
                ♂ Male
              </button>
              <button 
                className={`${styles.genderBtn} ${liveState.gender === 'female' ? styles.genderActive : ''}`}
                onClick={() => handleGenderChange('female')}
              >
                ♀ Female
              </button>
            </div>
          </div>
        </div>

        {/* Level & Progress Card */}
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>Fintech Level</span>
            <span className={styles.levelText}>Lvl {liveState.level || 1}</span>
          </div>
          <div className={styles.progressContainer}>
            <div className={styles.progressFill} style={{ width: `${xpPct}%` }} />
          </div>
          <div className={styles.xpRow}>
            <span>{liveState.xp || 0} XP</span>
            <span>{xpNeeded} XP for Lvl {(liveState.level || 1) + 1}</span>
          </div>
        </div>

        {/* Game Statistics Grid */}
        <div className={styles.statsSection}>
          <h3 className={styles.sectionTitle}>
            <User size={18} className={styles.iconBlue} /> Performance Statistics
          </h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Taps</span>
              <span className={styles.statValue}>{liveState.totalAcceptedTaps || 0}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Multiplier</span>
              <span className={styles.statValue}>x{liveState.multitapLevel || 1}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Active Streak</span>
              <span className={styles.statValue}>{liveState.currentStreak || 0}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Best Streak</span>
              <span className={styles.statValue}>{liveState.bestStreak || 0}</span>
            </div>
          </div>
        </div>

        {/* Member Details */}
        <div className={styles.infoCard}>
          <Calendar size={18} className={styles.iconBlue} />
          <div>
            <div className={styles.label}>Member Since</div>
            <div className={styles.infoText}>{formattedDate}</div>
          </div>
        </div>

        {/* Badges / Achievements */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Award size={18} className={styles.iconGold} /> Unlocked Achievements
          </h3>
          
          {badgesList.length === 0 ? (
            <div className={styles.emptyBadges}>
              <p>No achievements unlocked yet.</p>
              <span>Keep tapping and upgrading to earn exclusive badges!</span>
            </div>
          ) : (
            <div className={styles.badgesGrid}>
              {badgesList.map((b, idx) => (
                <div key={idx} className={styles.badgeCard}>
                  <ShieldCheck size={32} className={styles.badgeIcon} />
                  <span className={styles.badgeName}>{b.name}</span>
                  <span className={styles.badgeDate}>
                    {new Date(b.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rules & Mechanics Sub-navigation Card */}
        <div className={styles.rulesCard} onClick={() => navigate('/rules')}>
          <div className={styles.rulesCardContent}>
            <BookOpen size={18} className={styles.iconBlue} />
            <div>
              <h4 className={styles.rulesCardTitle}>Rules & Game Mechanics</h4>
              <p className={styles.rulesCardDesc}>Read details on anti-abuse limits, multipliers, and payouts.</p>
            </div>
          </div>
          <ChevronRight size={18} className={styles.rulesCardArrow} />
        </div>

        {/* Logout Action */}
        <div className={styles.logoutWrapper}>
          <button onClick={logout} className={styles.logoutBtn}>
            <LogOut size={16} /> Close Session & Logout
          </button>
        </div>

      </div>
    </div>
  );
}
