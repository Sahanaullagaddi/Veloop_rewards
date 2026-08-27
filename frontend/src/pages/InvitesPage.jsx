import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { Users, Copy, Check, Gift, Sparkles, Loader } from 'lucide-react';
import styles from './InvitesPage.module.css';

export default function InvitesPage() {
  const { token, user } = useAuth();
  const { liveState, setLiveState } = useSocket();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const refCode = user?.referralCode || '';
  const inviteUrl = `${window.location.origin}/register?ref=${refCode}`;

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const res = await fetch(`${API_URL}/api/referrals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReferrals(data.referrals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    showToast('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async (refId) => {
    if (claimingId) return;
    setClaimingId(refId);
    try {
      const res = await fetch(`${API_URL}/api/referrals/claim/${refId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setLiveState(prev => ({
          ...prev,
          veBalance: data.userBalances.veBalance,
          sveBalance: data.userBalances.sveBalance,
          tokenBalance: data.userBalances.tokenBalance,
          gemBalance: data.userBalances.gemBalance,
          spinBalance: data.userBalances.spinBalance
        }));
        fetchReferrals();
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
      showToast('Error claiming reward');
    } finally {
      setClaimingId(null);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const pendingClaims = referrals.filter(r => r.isEligible).length;
  const claimedCount = referrals.filter(r => r.rewardClaimed).length;

  return (
    <div className={styles.container}>
      {toastMsg && <div className={styles.toast}>{toastMsg}</div>}

      <div className={styles.heroSection}>
        <div className={styles.iconCircle}>
          <Users size={32} className={styles.iconGold} />
        </div>
        <h2>Invite Friends & Earn!</h2>
        <p>Get <strong className="gold-text">+500 VE</strong> for every friend you invite who reaches Level 3!</p>
      </div>

      {/* Referral Link Card */}
      <div className={styles.card}>
        <h3>Your Referral Code: <span className="gold-text">{refCode || 'Generating...'}</span></h3>
        <div className={styles.linkWrapper}>
          <input type="text" readOnly value={inviteUrl} className={styles.inputLink} />
          <button onClick={handleCopy} className={styles.btnCopy}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Summary Box */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <h4>Total Invites</h4>
          <p>{referrals.length}</p>
        </div>
        <div className={styles.summaryCard}>
          <h4>Claimed Rewards</h4>
          <p className="gold-text">+{claimedCount * 500} VE</p>
        </div>
        {pendingClaims > 0 && (
          <div className={`${styles.summaryCard} ${styles.glowing}`}>
            <h4>Claimable Now</h4>
            <p className={styles.claimableCount}>{pendingClaims} Pending</p>
          </div>
        )}
      </div>

      {/* Friend Referrals List */}
      <div className={styles.listSection}>
        <h3>Invited Friends ({referrals.length})</h3>

        {loading ? (
          <div className={styles.spinnerWrapper}>
            <Loader className={styles.spinner} size={28} />
            <span>Loading friends list...</span>
          </div>
        ) : referrals.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No invites yet. Share your code to get started!</p>
          </div>
        ) : (
          <div className={styles.friendList}>
            {referrals.map(ref => (
              <div key={ref.id} className={styles.friendRow}>
                <div className={styles.friendDetails}>
                  <div className={styles.avatar}>
                    {ref.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4>{ref.username}</h4>
                    <p>Level {ref.level} · Joined {new Date(ref.joinedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className={styles.friendAction}>
                  {ref.rewardClaimed ? (
                    <span className={styles.badgeClaimed}>Claimed</span>
                  ) : ref.isEligible ? (
                    <button 
                      onClick={() => handleClaim(ref.id)} 
                      disabled={claimingId === ref.id}
                      className={styles.btnClaim}
                    >
                      {claimingId === ref.id ? 'Claiming...' : 'Claim 500 VE'}
                    </button>
                  ) : (
                    <span className={styles.badgePending}>Req. Lvl 3</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
