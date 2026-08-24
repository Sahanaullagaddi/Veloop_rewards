import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { API_URL } from '../config';

const AdContext = createContext();

export function AdProvider({ children }) {
  const { token } = useAuth();
  const { setLiveState } = useSocket();
  const [tapCount, setTapCount] = useState(0);
  const [opportunityWindow, setOpportunityWindow] = useState(() => Math.floor(Math.random() * (40 - 15 + 1)) + 15);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [currentAdType, setCurrentAdType] = useState('video'); // video, interstitial
  const [earnedReward, setEarnedReward] = useState(null);

  // Check if we hit the ad opportunity window
  const recordClientTap = () => {
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= opportunityWindow) {
        // Trigger ad opportunity
        setShowAdModal(true);
        // Reset counters and roll next window
        setOpportunityWindow(Math.floor(Math.random() * (40 - 15 + 1)) + 15);
        return 0;
      }
      return next;
    });
  };

  const playAd = (type = 'video') => {
    setCurrentAdType(type);
    setAdPlaying(true);
    setAdProgress(0);
    setEarnedReward(null);
  };

  useEffect(() => {
    let timer;
    if (adPlaying) {
      timer = setInterval(() => {
        setAdProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            completeAdPlay();
            return 100;
          }
          return prev + 20; // 5 steps (5 seconds)
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [adPlaying]);

  const completeAdPlay = async () => {
    setAdPlaying(false);
    
    // Call backend to log and verify reward
    const requestId = `ad-reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      const res = await fetch(`${API_URL}/api/tap/ads/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, adType: currentAdType })
      });
      const data = await res.json();
      if (data.success) {
        setEarnedReward({
          type: data.rewardType,
          amount: data.rewardAmount
        });
        // Sync balance in local state
        setLiveState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            veBalance: data.veBalance
          };
        });
      }
    } catch (err) {
      console.error('Error claiming ad reward:', err);
    }
  };

  const closeAdModal = () => {
    setShowAdModal(false);
    setEarnedReward(null);
  };

  return (
    <AdContext.Provider value={{
      recordClientTap,
      showAdModal,
      setShowAdModal,
      adPlaying,
      adProgress,
      playAd,
      earnedReward,
      closeAdModal,
      currentAdType
    }}>
      {children}
    </AdContext.Provider>
  );
}

export function useAd() {
  return useContext(AdContext);
}
