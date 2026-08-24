import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAd } from '../context/AdContext';
import styles from './TapCircle.module.css';

export default function TapCircle() {
  const { token } = useAuth();
  const { liveState, setLiveState } = useSocket();
  const { hapticsEnabled } = useTheme();
  const { recordClientTap } = useAd();

  const [floats, setFloats] = useState([]);
  const [isPressing, setIsPressing] = useState(false);
  const [inlineFeedback, setInlineFeedback] = useState(null); // 'Too Fast' or 'Energy Empty'
  const circleRef = useRef(null);
  const lastTapRef = useRef(0);

  if (!liveState) return null;

  const handleTap = async (e) => {
    e.preventDefault();
    const now = Date.now();

    // 1. Client-side Rate Limit (200ms)
    if (now - lastTapRef.current < 200) {
      triggerFeedback('Too Fast!');
      triggerHaptic(50); // double short buzz
      return;
    }
    lastTapRef.current = now;

    // 2. Client-side Energy Check
    const shieldActive = liveState.activeShieldExpiry && new Date(liveState.activeShieldExpiry) > now;
    const energyCost = shieldActive ? 1 : 1; // standard tap cost = 1 energy
    
    const hasEnergy = liveState.currentEnergy >= energyCost || liveState.energyBankBalance >= energyCost;
    if (!hasEnergy) {
      triggerFeedback('Energy Empty!');
      triggerHaptic([100, 50, 100]); // sad buzz
      return;
    }

    // 3. Physical vs Effective Multipliers
    let multitapMultiplier = 1;
    if (liveState.multitapExpiry && new Date(liveState.multitapExpiry) > now) {
      multitapMultiplier = liveState.multitapLevel || 2;
    }
    const isBoostActive = liveState.activeBoostExpiry && new Date(liveState.activeBoostExpiry) > now;
    const boostMultiplier = isBoostActive ? 2 : 1;
    const effectiveTaps = 1 * multitapMultiplier * boostMultiplier;

    // Optimistic Update
    // Decrement energy locally
    let nextEnergy = liveState.currentEnergy;
    let nextBank = liveState.energyBankBalance;
    if (nextEnergy >= energyCost) {
      nextEnergy -= energyCost;
    } else {
      nextBank -= (energyCost - nextEnergy);
      nextEnergy = 0;
    }

    // Capture coordinates inside the tap circle
    const rect = circleRef.current.getBoundingClientRect();
    const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    const y = e.clientY ? e.clientY - rect.top : rect.height / 2;

    const floatId = `${now}-${Math.random()}`;
    const initialRewardText = `+${effectiveTaps} Taps`;
    
    setFloats(prev => [...prev, { id: floatId, x, y, text: initialRewardText, currency: 'VE' }]);
    
    // Set optimistic values
    setLiveState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentEnergy: nextEnergy,
        energyBankBalance: nextBank,
        currentCombo: (prev.currentCombo || 0) + 1,
        currentStreak: (prev.currentStreak || 0) + 1
      };
    });

    setIsPressing(true);
    triggerHaptic(80); // successful tap vibration

    // Let the AdProvider record a tap (may trigger ad opportunity)
    recordClientTap();

    // Reconcile with Server
    const requestId = `tap-${now}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      const res = await fetch('http://localhost:5000/api/tap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, timestamp: new Date(now).toISOString() })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Successful server validation: update float with actual reward type and amount
        const rewardDisplay = `+${data.rewardAmount} ${data.rewardType}`;
        setFloats(prev => prev.map(f => f.id === floatId ? { ...f, text: rewardDisplay, currency: data.rewardType } : f));
        
        // Instant balance reconciliation
        if (data.userBalances) {
          setLiveState(prev => {
            if (!prev) return null;
            return {
              ...prev,
              veBalance: data.userBalances.veBalance,
              sveBalance: data.userBalances.sveBalance,
              tokenBalance: data.userBalances.tokenBalance,
              gemBalance: data.userBalances.gemBalance,
              spinBalance: data.userBalances.spinBalance,
              fragmentBalance: data.userBalances.fragmentBalance,
              level: data.userBalances.level,
              xp: data.userBalances.xp
            };
          });
        }
      } else {
        // Rollback state if server rejected
        triggerFeedback(data.message || 'Verification Failed');
      }
    } catch (err) {
      console.error('Failed to process tap on server:', err);
    }
  };

  const triggerFeedback = (msg) => {
    setInlineFeedback(msg);
    setTimeout(() => setInlineFeedback(null), 1500);
  };

  const triggerHaptic = (pattern) => {
    if (hapticsEnabled && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Fail silently
      }
    }
  };

  // Clean up floating items
  useEffect(() => {
    const interval = setInterval(() => {
      const expiry = Date.now() - 1000;
      setFloats(prev => prev.filter(f => parseFloat(f.id.split('-')[0]) > expiry));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const isBoostActive = liveState.activeBoostExpiry && new Date(liveState.activeBoostExpiry) > Date.now();
  const isShieldActive = liveState.activeShieldExpiry && new Date(liveState.activeShieldExpiry) > Date.now();

  return (
    <div className={styles.tapArea}>
      {/* Inline Feedback Messages */}
      {inlineFeedback && (
        <div className={`${styles.feedback} ${inlineFeedback.includes('Fast') ? styles.warning : styles.error}`}>
          {inlineFeedback}
        </div>
      )}

      {/* Tappable Core Circle */}
      <div 
        ref={circleRef}
        className={`${styles.circle} ${isPressing ? styles.pressed : ''} ${isBoostActive ? styles.boosted : ''} ${isShieldActive ? styles.shielded : ''}`}
        onPointerDown={handleTap}
        onPointerUp={() => setIsPressing(false)}
        onPointerLeave={() => setIsPressing(false)}
        role="button"
        tabIndex={0}
        aria-label="Tap Core to Earn Rewards"
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            handleTap(e);
          }
        }}
      >
        <div className={styles.innerCore}>
          <span className={styles.tapSymbol}>VE</span>
        </div>

        {/* Floating Coin Payout Animations */}
        {floats.map(f => (
          <span 
            key={f.id} 
            className={`${styles.floatingCoin} ${f.currency === 'SVE' ? styles.goldCoin : styles.blueCoin}`}
            style={{ left: `${f.x}px`, top: `${f.y}px` }}
          >
            {f.text}
          </span>
        ))}
      </div>
    </div>
  );
}
