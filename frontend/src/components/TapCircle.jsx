import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAd } from '../context/AdContext';
import { API_URL } from '../config';
import styles from './TapCircle.module.css';

// Persistent global variables for coin click sound effect
let globalAudioCtx = null;

export default function TapCircle() {
  const { token, user } = useAuth();
  const { liveState, registerTap, reconcileState, setLiveState } = useSocket();
  const { hapticsEnabled } = useTheme();
  const { recordClientTap } = useAd();

  const [floats, setFloats] = useState([]);
  const [isPressing, setIsPressing] = useState(false);
  const [inlineFeedback, setInlineFeedback] = useState(null); // 'Too Fast' or 'Energy Empty'
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const circleRef = useRef(null);
  const lastTapRef = useRef(0);
  const prevLevelRef = useRef(liveState?.level || 1);

  const userCoins = Math.floor(parseFloat(liveState?.veBalance || 0));
  const effectiveTaps = Math.max(liveState?.total_taps || 0, userCoins);
  const calculatedLevel = Math.min(10, Math.max(1, Math.floor(effectiveTaps / 1000) + 1));
  const currentLevel = Math.min(10, Math.max(liveState?.level || 1, calculatedLevel));
  
  const username = (user?.username || liveState?.username || '').toLowerCase();
  const isFemaleName = username.includes('reena') || username.includes('rina') || username.includes('sahana') || username.includes('sarah') || username.includes('priya') || username.includes('pooja') || username.includes('girl') || username.includes('woman') || username.includes('trinity');
  const userGender = liveState?.gender === 'female' || isFemaleName ? 'female' : (liveState?.gender || 'male');

  const fallbackUrl = userGender === 'female'
    ? `/assets/characters/female/character_f_lvl${currentLevel}.png`
    : `/assets/characters/male/character_lvl${currentLevel}.png`;
  const characterImageUrl = (liveState?.character_image_url && liveState?.level === currentLevel && (liveState?.gender === userGender || !isFemaleName))
    ? liveState.character_image_url
    : fallbackUrl;

  const triggerLevelUpCelebration = (lvl) => {
    setIsLevelingUp(true);
    triggerHaptic([100, 50, 100, 50, 200]);
    setTimeout(() => setIsLevelingUp(false), 2000);
  };

  useEffect(() => {
    if (liveState?.level && liveState.level > prevLevelRef.current) {
      triggerLevelUpCelebration(liveState.level);
    }
    if (liveState?.level) {
      prevLevelRef.current = liveState.level;
    }
  }, [liveState?.level]);

  if (!liveState) return null;

  const handleTap = async (e) => {
    e.preventDefault();

    // Initialize or resume AudioContext early in user touch event handler to bypass autoplay policy
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !globalAudioCtx) {
        globalAudioCtx = new AudioContextClass();
      }
      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume().catch(() => {});
      }
    } catch (err) {
      // Fail silently
    }

    const now = Date.now();

    // 1. Client-side Rate Limit (50ms)
    if (now - lastTapRef.current < 50) {
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

    // Centralized optimistic state update
    const requestId = `tap-${now}-${Math.random().toString(36).substr(2, 9)}`;
    registerTap(requestId, effectiveTaps, energyCost);

    // Reconcile with Server
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
        
        // Trigger celebratory transition if leveled up
        if (data.leveledUp) {
          triggerLevelUpCelebration(data.level);
        }

        // Instant balance & energy reconciliation
        if (data.userBalances) {
          reconcileState(data.userBalances, requestId);
        }
      } else {
        // Rollback state if server rejected
        reconcileState({}, requestId);
        triggerFeedback(data.message || 'Verification Failed');
      }
    } catch (err) {
      console.error('Failed to process tap on server:', err);
      // Rollback state on network/communication failure
      reconcileState({}, requestId);
    }
  };

  const playTapSound = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      
      if (!globalAudioCtx) {
        globalAudioCtx = new AudioContextClass();
      }
      
      const ctx = globalAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Play coin pickup clink sound effect
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (err) {
      console.warn('Audio play failed:', err);
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

      {/* Tappable Core Circle with Character Podium */}
      <div 
        ref={circleRef}
        className={`${styles.circle} ${isPressing ? styles.pressed : ''} ${isBoostActive ? styles.boosted : ''} ${isShieldActive ? styles.shielded : ''} ${isLevelingUp ? styles.levelUpFlash : ''}`}
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
            src={characterImageUrl} 
            alt={`Bunny Character Level ${currentLevel}`} 
            className={`${styles.bunnyCharacter} ${isLevelingUp ? styles.levelPulse : ''}`}
            draggable="false"
          />
        </div>

        {/* Floating Coin Payout Animations (Absolute overlay container) */}
        <div className={styles.floatsContainer}>
          {floats.map(f => (
            <span 
              key={f.id} 
              className={`${styles.floatingCoin} ${f.currency === 'SVE' ? styles.goldCoin : styles.whiteCoin}`}
              style={{ left: `${f.x}px`, top: `${f.y}px` }}
            >
              {f.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
