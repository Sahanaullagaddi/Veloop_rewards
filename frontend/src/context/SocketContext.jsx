import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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

  const pendingTapsRef = useRef([]);

  const registerTap = (requestId, amount, energyCost) => {
    let mainEnergyConsumed = 0;
    let bankEnergyConsumed = 0;

    if (liveState) {
      if (liveState.currentEnergy >= energyCost) {
        mainEnergyConsumed = energyCost;
      } else {
        mainEnergyConsumed = liveState.currentEnergy;
        bankEnergyConsumed = energyCost - mainEnergyConsumed;
      }
    } else {
      mainEnergyConsumed = energyCost;
    }

    pendingTapsRef.current.push({
      requestId,
      amount,
      mainEnergyConsumed,
      bankEnergyConsumed
    });
    
    setLiveState(prev => {
      if (!prev) return null;

      let raw = prev.veBalance;
      if (typeof raw === 'object' && raw.$numberDecimal) {
        raw = raw.$numberDecimal;
      }
      let currentBal = parseFloat(raw || 0);
      const nextBal = currentBal + amount;
      
      const formattedBal = typeof prev.veBalance === 'object' && prev.veBalance.$numberDecimal 
        ? { $numberDecimal: nextBal.toString() } 
        : nextBal;

      return {
        ...prev,
        currentEnergy: Math.max(0, prev.currentEnergy - mainEnergyConsumed),
        energyBankBalance: Math.max(0, prev.energyBankBalance - bankEnergyConsumed),
        veBalance: formattedBal
      };
    });
  };

  const reconcileState = (serverState, finishedRequestId = null) => {
    if (finishedRequestId) {
      pendingTapsRef.current = pendingTapsRef.current.filter(t => t.requestId !== finishedRequestId);
    }

    setLiveState(prev => {
      if (!prev) return null;

      const mergedBaseState = { ...prev, ...serverState };

      let extraVe = 0;
      let deductedEnergy = 0;
      let deductedEnergyBank = 0;

      pendingTapsRef.current.forEach(tap => {
        extraVe += tap.amount;
        deductedEnergy += tap.mainEnergyConsumed;
        deductedEnergyBank += tap.bankEnergyConsumed;
      });

      let raw = mergedBaseState.veBalance;
      if (typeof raw === 'object' && raw.$numberDecimal) {
        raw = raw.$numberDecimal;
      }
      let serverBal = parseFloat(raw || 0);
      const nextBal = serverBal + extraVe;

      const formattedBal = typeof prev.veBalance === 'object' && prev.veBalance.$numberDecimal 
        ? { $numberDecimal: nextBal.toString() } 
        : nextBal;

      return {
        ...mergedBaseState,
        veBalance: formattedBal,
        currentEnergy: Math.max(0, mergedBaseState.currentEnergy - deductedEnergy),
        energyBankBalance: Math.max(0, mergedBaseState.energyBankBalance - deductedEnergyBank)
      };
    });
  };

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
      reconcileState(updatedState);
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

          const userCoins = Math.floor(parseFloat(data.user.veBalance?.$numberDecimal || data.user.veBalance || 0));
          const effectiveTaps = Math.max(data.user.total_taps || 0, userCoins);
          const effectiveLevel = effectiveTaps < 2000 ? 1 : Math.min(10, Math.max(1, Math.floor(effectiveTaps / 1000)));
          const userGender = data.user.gender || 'male';
          const resolvedImageUrl = (data.user.character_image_url && data.user.level === effectiveLevel)
            ? data.user.character_image_url
            : (userGender === 'female'
              ? `/assets/characters/female/character_f_lvl${effectiveLevel}.png`
              : `/assets/characters/male/character_lvl${effectiveLevel}.png`);

          setLiveState({
            veBalance: data.user.veBalance ? data.user.veBalance.$numberDecimal || data.user.veBalance : '0.0',
            sveBalance: data.user.sveBalance ? data.user.sveBalance.$numberDecimal || data.user.sveBalance : '0.0',
            tokenBalance: data.user.tokenBalance ? data.user.tokenBalance.$numberDecimal || data.user.tokenBalance : '0.0',
            gemBalance: data.user.gemBalance ? data.user.gemBalance.$numberDecimal || data.user.gemBalance : '0.0',
            spinBalance: data.user.spinBalance || 0,
            fragmentBalance: data.user.fragmentBalance ? data.user.fragmentBalance.$numberDecimal || data.user.fragmentBalance : '0.0',
            level: effectiveLevel,
            total_taps: effectiveTaps,
            gender: userGender,
            character_image_url: resolvedImageUrl,
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
      const res = await fetch(`${SOCKET_URL}/api/tap/state`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const state = data.tapState;
        setLiveState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentEnergy: state.currentEnergy,
            energyCapacity: state.energyCapacity,
            energyCapacityLevel: state.energyCapacityLevel,
            rechargeSpeedLevel: state.rechargeSpeedLevel,
            energyBankLevel: state.energyBankLevel,
            energyBankBalance: state.energyBankBalance,
            energyBankCapacity: state.energyBankCapacity,
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
      fetchInitialState,
      registerTap,
      reconcileState
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
