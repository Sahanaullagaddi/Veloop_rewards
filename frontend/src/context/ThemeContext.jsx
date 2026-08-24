import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('veloop_theme') || 'dark';
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('veloop_reduced_motion') === 'true';
  });

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    return localStorage.getItem('veloop_haptics') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('veloop_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('veloop_reduced_motion', reducedMotion);
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('veloop_haptics', hapticsEnabled);
  }, [hapticsEnabled]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      reducedMotion,
      setReducedMotion,
      hapticsEnabled,
      setHapticsEnabled
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
