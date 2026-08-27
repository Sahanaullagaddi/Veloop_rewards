import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { X, Calendar, Gift, CheckCircle, Loader } from 'lucide-react';
import styles from './DailyCheckinModal.module.css';

export default function DailyCheckinModal({ onClose }) {
  const { token } = useAuth();
  const { setLiveState } = useSocket();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/checkin/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (claiming || !status?.eligible) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API_URL}/api/checkin/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setClaimedReward(data.reward);
        setLiveState(prev => ({
          ...prev,
          veBalance: data.userBalances.veBalance,
          sveBalance: data.userBalances.sveBalance,
          tokenBalance: data.userBalances.tokenBalance,
          gemBalance: data.userBalances.gemBalance,
          spinBalance: data.userBalances.spinBalance
        }));
        setStatus(prev => ({
          ...prev,
          eligible: false,
          consecutiveCheckins: data.consecutiveCheckins
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal} style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader className={styles.spinner} size={32} />
        </div>
      </div>
    );
  }

  const { eligible, consecutiveCheckins, rewards } = status || {};

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <Calendar size={22} className={styles.iconGold} />
            <h3>Daily Check-in Streak</h3>
          </div>
          <button onClick={onClose} className={styles.btnClose}><X size={20} /></button>
        </div>

        <div className={styles.body}>
          {claimedReward ? (
            <div className={styles.successScreen}>
              <CheckCircle size={56} className={styles.iconSuccess} />
              <h3>Day {consecutiveCheckins} Claimed!</h3>
              <p>You received:</p>
              <h2 className="gold-text">+{claimedReward.amount} {claimedReward.type}</h2>
              <button onClick={onClose} className={styles.btnFinish}>Awesome!</button>
            </div>
          ) : (
            <>
              <p className={styles.subtitle}>
                Check in every day to grow your streak and claim larger multipliers! If you miss a day, your streak will reset.
              </p>

              {/* 7 Day Grid */}
              <div className={styles.grid}>
                {rewards.map(reward => {
                  const isClaimed = reward.day <= consecutiveCheckins && !eligible;
                  const isCurrent = reward.day === (eligible ? consecutiveCheckins + 1 : consecutiveCheckins);
                  
                  return (
                    <div 
                      key={reward.day} 
                      className={`${styles.dayCard} ${isClaimed ? styles.claimed : ''} ${isCurrent ? styles.current : ''}`}
                    >
                      <span className={styles.dayLabel}>Day {reward.day}</span>
                      <div className={styles.rewardIconWrapper}>
                        <Gift size={20} className={isClaimed ? styles.iconClaimed : isCurrent ? styles.iconCurrent : styles.iconLocked} />
                      </div>
                      <span className={styles.rewardValue}>+{reward.amount} {reward.type}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.actionSection}>
                {eligible ? (
                  <button 
                    onClick={handleClaim} 
                    disabled={claiming} 
                    className={styles.btnClaim}
                  >
                    {claiming ? 'Claiming...' : `Claim Day ${consecutiveCheckins + 1} Reward`}
                  </button>
                ) : (
                  <div className={styles.alreadyClaimedBox}>
                    <CheckCircle size={16} />
                    <span>Come back tomorrow for your next reward!</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
