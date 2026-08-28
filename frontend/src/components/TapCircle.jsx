import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAd } from '../context/AdContext';
import { API_URL } from '../config';
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
    const isBoostActive = liveState.activeBoostExpiry && new Date(liveState.activeBoostExpiry) > now;
    const boostMultiplier = isBoostActive ? 2 : 1;
    const shieldActive = liveState.activeShieldExpiry && new Date(liveState.activeShieldExpiry) > now;
    
    const multitapMultiplier = liveState.multitapLevel || 1;
    const effectiveTaps = multitapMultiplier * boostMultiplier;
    
    let energyCost = effectiveTaps;
    if (shieldActive) {
      energyCost = Math.ceil(energyCost * 0.1); // 90% protection
    }
    
    const hasEnergy = liveState.currentEnergy >= energyCost || liveState.energyBankBalance >= energyCost;
    if (!hasEnergy) {
      triggerFeedback('Energy Empty!');
      triggerHaptic([100, 50, 100]); // sad buzz
      return;
    }

    // Capture coordinates inside the tap circle
    const rect = circleRef.current.getBoundingClientRect();
    const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    const y = e.clientY ? e.clientY - rect.top : rect.height / 2;

    const floatId = `${now}-${Math.random()}`;
    
    // Add floating text immediately on client side (optimistic display)
    setFloats(prev => [...prev, { id: floatId, x, y, text: `+${effectiveTaps}`, currency: 'VE' }]);
    
    setIsPressing(true);
    triggerHaptic(80); // successful tap vibration
    playTapSound();

    // Let the AdProvider record a tap (may trigger ad opportunity)
    recordClientTap();

    // Optimistically deduct energy on client-side
    setLiveState(prev => {
      if (!prev) return null;
      if (prev.currentEnergy >= energyCost) {
        return { ...prev, currentEnergy: prev.currentEnergy - energyCost };
      } else if (prev.energyBankBalance >= energyCost) {
        return { ...prev, energyBankBalance: prev.energyBankBalance - energyCost };
      }
      return prev;
    });

    // Reconcile with Server
    const requestId = `tap-${now}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      const res = await fetch(`${API_URL}/api/tap`, {
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
        
        // Instant balance & energy reconciliation
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
              xp: data.userBalances.xp,
              currentEnergy: data.userBalances.currentEnergy !== undefined ? data.userBalances.currentEnergy : prev.currentEnergy,
              energyBankBalance: data.userBalances.energyBankBalance !== undefined ? data.userBalances.energyBankBalance : prev.energyBankBalance
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

  const playTapSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Coin clink sound sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      
      // Fade out volume sweep
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (err) {
      console.warn('Audio blocked or failed:', err);
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
          <img 
            src="/hamster_avatar.jpg" 
            alt="Hamster Character" 
            className={styles.hamsterImage}
            draggable="false"
          />
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
