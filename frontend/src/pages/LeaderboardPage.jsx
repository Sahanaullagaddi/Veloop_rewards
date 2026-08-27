import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { Trophy, Shield, Award, Users, Loader } from 'lucide-react';
import styles from './LeaderboardPage.module.css';

export default function LeaderboardPage() {
  const { token, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setMyRank(data.myRank);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTrophyColor = (rank) => {
    if (rank === 1) return styles.trophyGold;
    if (rank === 2) return styles.trophySilver;
    if (rank === 3) return styles.trophyBronze;
    return '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <div className={styles.headerIconWrapper}>
          <Trophy size={32} className={styles.iconGold} />
        </div>
        <h2>Global Tap League</h2>
        <p>Compete with players worldwide and rise to the top of the leaderboard!</p>
      </div>

      {loading ? (
        <div className={styles.spinnerWrapper}>
          <Loader className={styles.spinner} size={28} />
          <span>Syncing leaderboard...</span>
        </div>
      ) : (
        <>
          {/* User Rank Card */}
          {myRank && (
            <div className={styles.myRankCard}>
              <div className={styles.myRankInfo}>
                <div className={styles.myRankBadge}>
                  #{myRank.rank || 'N/A'}
                </div>
                <div>
                  <h3>{myRank.username} (You)</h3>
                  <p>Level {myRank.level}</p>
                </div>
              </div>
              <div className={styles.myRankScore}>
                <strong>{myRank.veBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong> VE
              </div>
            </div>
          )}

          {/* Leaderboard Table List */}
          <div className={styles.leaderboardCard}>
            <div className={styles.tableHeader}>
              <span>Rank</span>
              <span>Player</span>
              <span style={{ textAlign: 'right' }}>Total VE Balance</span>
            </div>

            <div className={styles.tableList}>
              {leaderboard.map(item => {
                const isMe = item.username === user?.username;
                const isTopThree = item.rank <= 3;

                return (
                  <div key={item.id} className={`${styles.tableRow} ${isMe ? styles.currentRow : ''}`}>
                    <div className={styles.rankCell}>
                      {isTopThree ? (
                        <Trophy size={18} className={getTrophyColor(item.rank)} />
                      ) : (
                        <span className={styles.rankText}>#{item.rank}</span>
                      )}
                    </div>

                    <div className={styles.playerCell}>
                      <div className={styles.avatar}>
                        {item.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className={isMe ? 'gold-text' : ''}>
                          {item.username} {isMe && <span className={styles.meLabel}>You</span>}
                        </h4>
                        <span className={styles.levelLabel}>Level {item.level}</span>
                      </div>
                    </div>

                    <div className={styles.scoreCell}>
                      <strong>{item.veBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong> VE
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
