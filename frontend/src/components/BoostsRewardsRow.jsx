import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import styles from './BoostsRewardsRow.module.css';

const CARDS_CONFIG = [
  {
    id: 'protect',
    title: 'Protect',
    description: 'Shield energy, tap with 90% defense.',
    videoSrc: '/videos/a1.webm',
    fallbackMp4: '/videos/a1.mp4',
    glowClass: styles.glowBlue,
    arrowClass: styles.arrowBlue,
    actionKey: 'shield'
  },
  {
    id: 'levelup',
    title: 'Upgrades',
    description: 'Upgrade and multiply your earnings.',
    videoSrc: '/videos/a2.webm',
    fallbackMp4: '/videos/a2.mp4',
    glowClass: styles.glowPurple,
    arrowClass: styles.arrowPurple,
    actionKey: 'upgrade'
  },
  {
    id: 'spin',
    title: 'Lucky Spin',
    description: 'Spin the wheel, win exciting prizes.',
    videoSrc: '/videos/a7.webm',
    fallbackMp4: '/videos/a7.mp4',
    glowClass: styles.glowPurple,
    arrowClass: styles.arrowPurple,
    actionKey: 'spin'
  },
  {
    id: 'refill',
    title: 'Refill',
    description: 'Instant refill, recharge to 100% full.',
    videoSrc: '/videos/a5.webm',
    fallbackMp4: '/videos/a5.mp4',
    glowClass: styles.glowGreen,
    arrowClass: styles.arrowGreen,
    actionKey: 'refill'
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Complete quests, earn bonus coins.',
    videoSrc: '/videos/a3.webm',
    fallbackMp4: '/videos/a3.mp4',
    glowClass: styles.glowGold,
    arrowClass: styles.arrowGold,
    actionKey: 'tasks'
  },
  {
    id: 'dailygoal',
    title: 'Daily Goal',
    description: 'Tap 1,000 times, claim daily crates.',
    videoSrc: '/videos/a4.webm',
    fallbackMp4: '/videos/a4.mp4',
    glowClass: styles.glowIndigo,
    arrowClass: styles.arrowIndigo,
    actionKey: 'goal'
  },
  {
    id: 'leaders',
    title: 'Tap League',
    description: 'Compete, climb ranks & win big.',
    videoSrc: '/videos/a6.webm',
    fallbackMp4: '/videos/a6.mp4',
    glowClass: styles.glowAmber,
    arrowClass: styles.arrowAmber,
    actionKey: 'leaders'
  }
];

function BoostCard({ card, onAction, isDragRef }) {
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  // Performance: IntersectionObserver pauses offscreen videos, plays in-view
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
        threshold: 0.15
      }
    );

    observer.observe(cardEl);
    return () => observer.disconnect();
  }, []);

  const handleCardClick = () => {
    // If the user was dragging to scroll, ignore click action
    if (isDragRef && isDragRef.current) return;

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
      aria-label={card.title}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          handleCardClick();
        }
      }}
    >
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          className={styles.videoElement}
        >
          <source src={card.videoSrc} type="video/webm" />
          <source src={card.fallbackMp4} type="video/mp4" />
        </video>
      </div>
      <div className={styles.infoContainer}>
        <span className={styles.cardTitle}>{card.title}</span>
        <span className={styles.cardDesc}>{card.description}</span>
        <div className={`${styles.arrowBtn} ${card.arrowClass}`}>
          <ArrowRight size={14} strokeWidth={2.5} />
        </div>
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
  const containerRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDragRef = useRef(false);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollArrows = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateScrollArrows();
    el.addEventListener('scroll', updateScrollArrows, { passive: true });
    window.addEventListener('resize', updateScrollArrows, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateScrollArrows);
      window.removeEventListener('resize', updateScrollArrows);
    };
  }, []);

  // Mouse Drag to Scroll (for desktop browsers)
  const handleMouseDown = (e) => {
    isDownRef.current = true;
    isDragRef.current = false;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDownRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 8) {
      isDragRef.current = true;
    }
    containerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDownRef.current = false;
    setTimeout(() => {
      isDragRef.current = false;
    }, 60);
  };

  // Wheel Horizontal Scrolling
  const handleWheel = (e) => {
    if (e.deltaY !== 0 && containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollByAmount = (amount) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

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
      {canScrollLeft && (
        <button 
          className={`${styles.navBtn} ${styles.navBtnLeft}`}
          onClick={() => scrollByAmount(-220)}
          aria-label="Scroll left"
          type="button"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <div
        ref={containerRef}
        className={styles.scrollContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {CARDS_CONFIG.map((card) => (
          <BoostCard 
            key={card.id} 
            card={card} 
            onAction={handleAction} 
            isDragRef={isDragRef}
          />
        ))}
      </div>

      {canScrollRight && (
        <button 
          className={`${styles.navBtn} ${styles.navBtnRight}`}
          onClick={() => scrollByAmount(220)}
          aria-label="Scroll right"
          type="button"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
