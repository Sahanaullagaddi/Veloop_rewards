import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user, token, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [liveState, setLiveState] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setLiveState(null);
      setIsConnected(false);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join', user.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('stateUpdate', (updatedState) => {
      setLiveState(prev => {
        if (!prev) return updatedState;
        return { ...prev, ...updatedState };
      });
    });

    newSocket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    setSocket(newSocket);

    // Initial state fetch from REST API
    fetchInitialState();

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const fetchInitialState = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (data.success && data.user) {
        // Fetch tap state too
        const stateRes = await fetch(`${SOCKET_URL}/api/tap/streak`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const stateData = await stateRes.json();

        // Also fetch daily challenge
        const challengeRes = await fetch(`${SOCKET_URL}/api/tap/daily-challenge`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const challengeData = await challengeRes.json();

        // Combine into liveState
        setLiveState({
          veBalance: data.user.veBalance ? data.user.veBalance.$numberDecimal || data.user.veBalance : '0.0',
          sveBalance: data.user.sveBalance ? data.user.sveBalance.$numberDecimal || data.user.sveBalance : '0.0',
          tokenBalance: data.user.tokenBalance ? data.user.tokenBalance.$numberDecimal || data.user.tokenBalance : '0.0',
          gemBalance: data.user.gemBalance ? data.user.gemBalance.$numberDecimal || data.user.gemBalance : '0.0',
          spinBalance: data.user.spinBalance || 0,
          fragmentBalance: data.user.fragmentBalance ? data.user.fragmentBalance.$numberDecimal || data.user.fragmentBalance : '0.0',
          level: data.user.level,
          xp: data.user.xp,
          currentEnergy: 500, // will be refreshed by tap state fetches
          energyCapacity: 500,
          energyBankBalance: 500,
          energyBankCapacity: 500,
          currentStreak: stateData.success ? stateData.currentStreak : 0,
          bestStreak: stateData.success ? stateData.bestStreak : 0,
          dailyChallengeProgress: challengeData.success ? challengeData.progress : 0,
          dailyChallengeClaimed: challengeData.success ? challengeData.claimed : false,
          subscriptionType: data.user.subscriptionType || 'free',
          subscriptionExpiry: data.user.subscriptionExpiry || null
        });

        // Trigger loading of full state details
        refreshTapState();
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error loading initial liveState:', err);
      logout();
    }
  };

  const refreshTapState = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/tap/lucky`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Find user tap state from admin preview (convenient way to fetch dynamic fields)
        const previewRes = await fetch(`${SOCKET_URL}/api/admin/tap-economy/users/${user.id}/preview`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const previewData = await previewRes.json();
        if (previewData.success) {
          const state = previewData.tapState;
          setLiveState(prev => {
            if (!prev) return null;
            return {
              ...prev,
              currentEnergy: state.currentEnergy,
              energyCapacity: 500 + (state.energyCapacityLevel - 1) * 100,
              energyCapacityLevel: state.energyCapacityLevel,
              rechargeSpeedLevel: state.rechargeSpeedLevel,
              energyBankLevel: state.energyBankLevel,
              energyBankBalance: state.energyBankBalance,
              energyBankCapacity: 500 + (state.energyBankLevel - 1) * 250,
              tapEfficiencyLevel: state.tapEfficiencyLevel,
              currentStreak: state.currentStreak,
              bestStreak: state.bestStreak,
              currentCombo: state.currentCombo,
              totalAcceptedTaps: state.totalAcceptedTaps,
              activeBoostExpiry: state.activeBoostExpiry,
              activeShieldExpiry: state.activeShieldExpiry,
              shieldCooldownExpiry: state.shieldCooldownExpiry
            };
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      liveState,
      setLiveState,
      isConnected,
      notifications,
      refreshTapState,
      fetchInitialState
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
