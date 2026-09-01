import React, { useState, useRef, useEffect } from 'react';
import styles from './BoostsRewardsRow.module.css';

const CARDS_CONFIG = [
  {
    id: 'protect',
    label: 'Protect',
    videoSrc: '/videos/11.mp4',
    posterSrc: '/posters/11.png',
    glowClass: styles.glowBlue,
    actionKey: 'shield'
  },
  {
    id: 'levelup',
    label: 'Level Up',
    videoSrc: '/videos/22.mp4',
    posterSrc: '/posters/22.png',
    glowClass: styles.glowOrange,
    actionKey: 'upgrade'
  },
  {
    id: 'spin',
    label: 'Spin',
    videoSrc: '/videos/33.mp4',
    posterSrc: '/posters/33.png',
    glowClass: styles.glowPurple,
    actionKey: 'spin'
  },
  {
    id: 'refill',
    label: 'Refill',
    videoSrc: '/videos/44.mp4',
    posterSrc: '/posters/44.png',
    glowClass: styles.glowGreen,
    actionKey: 'refill'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    videoSrc: '/videos/55.mp4',
    posterSrc: '/posters/55.png',
    glowClass: styles.glowGold,
    actionKey: 'tasks'
  },
  {
    id: 'dailygoal',
    label: 'Daily Goal',
    videoSrc: '/videos/77.mp4',
    posterSrc: null,
    glowClass: styles.glowIndigo,
    actionKey: 'goal'
  },
  {
    id: 'leaders',
    label: 'Leaders',
    videoSrc: '/videos/88.mp4',
    posterSrc: null,
    glowClass: styles.glowAmber,
    actionKey: 'leaders'
  }
];

function BoostCard({ card, onAction }) {
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  // Performance Optimization: IntersectionObserver to pause video when scrolled offscreen
  useEffect(() => {
    const cardEl = cardRef.current;
    const videoEl = videoRef.current;
    if (!cardEl || !videoEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        });
      },
      {
        threshold: 0.2
      }
    );

    observer.observe(cardEl);
    return () => observer.disconnect();
  }, []);

  const handleCardClick = () => {
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      if (onAction) {
        onAction(card.actionKey);
      }
    }, 150);
  };

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${card.glowClass} ${isPressed ? styles.pressed : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={card.label}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          handleCardClick();
        }
      }}
    >
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          src={card.videoSrc}
          poster={card.posterSrc || undefined}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          className={styles.videoElement}
        />
      </div>
      <div className={styles.labelContainer}>
        <span className={styles.labelText}>{card.label}</span>
      </div>
    </div>
  );
}

export default function BoostsRewardsRow({
  onOpenShield,
  onOpenUpgrades,
  onOpenLucky,
  onOpenBank,
  onOpenMissions,
  onOpenGoal,
  onOpenLeaders
}) {
  const handleAction = (actionKey) => {
    switch (actionKey) {
      case 'shield':
        if (onOpenShield) onOpenShield();
        break;
      case 'upgrade':
        if (onOpenUpgrades) onOpenUpgrades();
        break;
      case 'spin':
        if (onOpenLucky) onOpenLucky();
        break;
      case 'refill':
        if (onOpenBank) onOpenBank();
        break;
      case 'tasks':
        if (onOpenMissions) onOpenMissions();
        break;
      case 'goal':
        if (onOpenGoal) onOpenGoal();
        break;
      case 'leaders':
        if (onOpenLeaders) onOpenLeaders();
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.scrollWrapper}>
      <div className={styles.scrollContainer}>
        {CARDS_CONFIG.map((card) => (
          <BoostCard key={card.id} card={card} onAction={handleAction} />
        ))}
      </div>
    </div>
  );
}
