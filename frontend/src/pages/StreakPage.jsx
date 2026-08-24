import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Flame, Award, HelpCircle } from 'lucide-react';
import styles from './StreakPage.module.css';

export default function StreakPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { liveState } = useSocket();

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!liveState || !liveState.streakExpiry) return;

    const timer = setInterval(() => {
      const diff = new Date(liveState.streakExpiry) - Date.now();
      setTimeLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
    }, 500);

    return () => clearInterval(timer);
  }, [liveState]);

  if (!liveState) return <div className="loading-screen">Loading Streak...</div>;

  return (
    <div className="content-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      {/* Flame card */}
      <div className={`${styles.card} ${liveState.currentStreak > 0 ? styles.activeStreak : ''}`}>
        <div className={styles.flameCenter}>
          <Flame size={72} className={liveState.currentStreak > 0 ? styles.glowingFlame : styles.coldFlame} />
          <div className={styles.streakCount}>{liveState.currentStreak || 0}</div>
          <span className={styles.label}>Active Tap Streak</span>
        </div>

        {liveState.currentStreak > 0 && timeLeft > 0 && (
          <div className={styles.timerBar}>
            <div className={styles.timerLabel}>Resets in {timeLeft}s</div>
            <div className={styles.progressContainer}>
              <div className={styles.progressFill} style={{ width: `${(timeLeft / 5) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className={styles.grid}>
        <div className={styles.gridCard}>
          <span className={styles.label}>Best Streak</span>
          <div className={styles.gridValue}>{liveState.bestStreak || 0} Taps</div>
        </div>
        <div className={styles.gridCard}>
          <span className={styles.label}>Streak XP Bonus</span>
          <div className={styles.gridValue}>+{Math.floor((liveState.currentStreak || 0) / 10) * 5} XP/tap</div>
        </div>
      </div>

      {/* Explainer Panel */}
      <div className={styles.card}>
        <div className={styles.explainerHeader}>
          <HelpCircle size={16} className={styles.iconGold} />
          <h3>Streak Maintenance Rules</h3>
        </div>
        <p className={styles.explainerText}>
          The tap streak registers continuous physical clicks. If the time elapsed between clicks exceeds <strong>5.0 seconds</strong>, the active streak resets back to 0.
        </p>
        <p className={styles.explainerText}>
          Maintaining high streaks qualifies you for Streak Milestones and badges visible on your Profile page.
        </p>
      </div>

      {/* Milestones */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Award size={18} className={styles.iconGold} /> Streak Milestone Awards
        </h3>

        <div className={styles.milestoneList}>
          <div className={`${styles.milestoneItem} ${liveState.bestStreak >= 50 ? styles.completed : ''}`}>
            <div>
              <h4>Streak Master Badge</h4>
              <p>Achieve an all-time streak of 50 consecutive taps.</p>
            </div>
            <span className={styles.milestoneStatus}>{liveState.bestStreak >= 50 ? 'Completed' : 'Locked'}</span>
          </div>

          <div className={`${styles.milestoneItem} ${liveState.bestStreak >= 100 ? styles.completed : ''}`}>
            <div>
              <h4>Streak Grandmaster</h4>
              <p>Achieve an all-time streak of 100 consecutive taps.</p>
            </div>
            <span className={styles.milestoneStatus}>{liveState.bestStreak >= 100 ? 'Completed' : 'Locked'}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
