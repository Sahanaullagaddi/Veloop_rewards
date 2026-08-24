import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Trophy, Calendar, RefreshCw } from 'lucide-react';
import { API_URL } from '../config';
import styles from './TapLeaguePage.module.css';

export default function TapLeaguePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [seasonName, setSeasonName] = useState('Season 3');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/league`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setMyRank(data.myRank);
        setSeasonName(data.seasonName);
        setSeasonEnd(new Date(data.seasonEndDate).toLocaleDateString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-screen">Syncing League Leaderboard...</div>;

  return (
    <div className="content-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      {/* Season Card */}
      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.titleGroup}>
            <Trophy className={styles.iconGold} size={20} />
            <h2>{seasonName} Leaderboard</h2>
          </div>
          <button onClick={fetchLeaderboard} className={styles.btnRefresh}>
            <RefreshCw size={14} />
          </button>
        </div>
        <div className={styles.timerRow}>
          <div className={styles.label}>End Date</div>
          <div className={styles.value}>{seasonEnd || '4 days left'}</div>
        </div>
      </div>

      {/* Rankings List */}
      <div className={styles.leaderboardList}>
        <div className={styles.listHeader}>
          <span>Rank</span>
          <span>Username</span>
          <span>Effective Taps</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className={styles.emptyState}>No rankings recorded. Be the first to tap!</div>
        ) : (
          leaderboard.map(item => {
            const isTop3 = item.rank <= 3;
            let rankClass = '';
            if (item.rank === 1) rankClass = styles.rank1;
            else if (item.rank === 2) rankClass = styles.rank2;
            else if (item.rank === 3) rankClass = styles.rank3;

            return (
              <div 
                key={item.userId} 
                className={`${styles.rowItem} ${isTop3 ? styles.top3 : ''}`}
              >
                <span className={`${styles.rankBadge} ${rankClass}`}>{item.rank}</span>
                <span className={styles.username}>{item.username}</span>
                <span className={styles.score}>{item.score}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky My Rank Row */}
      {myRank && (
        <div className={styles.stickyFooter}>
          <div className={styles.stickyRow}>
            <span className={styles.stickyRank}>{myRank.rank}</span>
            <div className={styles.stickyUser}>
              <span className={styles.stickyName}>{myRank.username} (You)</span>
              <span className={styles.stickyScore}>Current Score: {myRank.score}</span>
            </div>
            <span className={styles.rewardNotice}>
              {myRank.rank === 1 ? '1000 VE' :
               myRank.rank <= 3 ? '500 VE' :
               myRank.rank <= 10 ? '200 VE' :
               myRank.rank <= 50 ? '100 VE' :
               myRank.rank <= 100 ? '50 VE' : 'Unranked'}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
