import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, ChevronLeft, Award, HelpCircle, Inbox } from 'lucide-react';
import { API_URL } from '../config';
import styles from './SeasonPage.module.css';

export default function SeasonPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [activeSeason, setActiveSeason] = useState(null);
  const [pastSeasons, setPastSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/season`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActiveSeason(data.activeSeason);
        setPastSeasons(data.pastSeasons);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading Season Details...</div>;

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
            <Calendar className={styles.iconBlue} size={20} />
            <h2>{activeSeason ? activeSeason.name : 'Season 3'}</h2>
          </div>
          <span className={styles.statusBadge}>ACTIVE</span>
        </div>
        <div className={styles.timerRow}>
          <div className={styles.label}>End Date</div>
          <div className={styles.value}>
            {activeSeason 
              ? new Date(activeSeason.endDate).toLocaleString() 
              : '4 days 12 hours remaining'
            }
          </div>
        </div>
      </div>

      {/* Explainer Panel */}
      <div className={styles.card}>
        <div className={styles.explainerHeader}>
          <HelpCircle size={16} className={styles.iconGold} />
          <h3>How Seasonal Scoring Works</h3>
        </div>
        <p className={styles.explainerText}>
          Score is determined by your total <strong>effective taps</strong> in the active season. Effective taps count your physical clicks multiplied by any active Multitaps and Boost window modifiers. 
        </p>
        <p className={styles.explainerText}>
          When a season ends, the rankings freeze, rewards are distributed to the top 100 users, and seasonal upgrades (Tap Efficiency) are reset.
        </p>
      </div>

      {/* Reward Tiers List */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Award size={18} className={styles.iconGold} /> Rank Reward Tiers Table
        </h3>

        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Leaderboard Rank</span>
            <span>Reward Payout</span>
          </div>
          <div className={styles.tableRow}>
            <span>Rank #1</span>
            <span className={styles.rewardCol}>1000 VE + 100 SVE</span>
          </div>
          <div className={styles.tableRow}>
            <span>Rank #2 – #3</span>
            <span className={styles.rewardCol}>500 VE + 50 SVE</span>
          </div>
          <div className={styles.tableRow}>
            <span>Rank #4 – #10</span>
            <span className={styles.rewardCol}>200 VE + 20 SVE</span>
          </div>
          <div className={styles.tableRow}>
            <span>Rank #11 – #50</span>
            <span className={styles.rewardCol}>100 VE</span>
          </div>
          <div className={styles.tableRow}>
            <span>Rank #51 – #100</span>
            <span className={styles.rewardCol}>50 VE</span>
          </div>
        </div>
      </div>

      {/* Past Season Archive */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Inbox size={18} className={styles.iconBlue} /> Past Season Archives
        </h3>

        {pastSeasons.length === 0 ? (
          <div className={styles.emptyState}>No archived seasons detected.</div>
        ) : (
          <div className={styles.archiveList}>
            {pastSeasons.map((s, idx) => (
              <div key={idx} className={styles.archiveItem}>
                <div>
                  <div className={styles.archiveName}>{s.name}</div>
                  <div className={styles.archiveDate}>
                    Ended: {new Date(s.endDate).toLocaleDateString()}
                  </div>
                </div>
                <span className={styles.archiveBadge}>ARCHIVED</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
