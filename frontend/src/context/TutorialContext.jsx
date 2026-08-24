import React, { createContext, useState, useEffect, useContext } from 'react';

const TutorialContext = createContext();

export function TutorialProvider({ children }) {
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    return localStorage.getItem('veloop_tutorial_completed') === 'true';
  });

  const [activeStep, setActiveStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!hasCompletedTutorial) {
      // Start tutorial with a slight delay
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTutorial]);

  const startTutorial = () => {
    setActiveStep(0);
    setShowTutorial(true);
  };

  const nextStep = () => {
    if (activeStep < 3) {
      setActiveStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const completeTutorial = () => {
    setShowTutorial(false);
    setHasCompletedTutorial(true);
    localStorage.setItem('veloop_tutorial_completed', 'true');
  };

  const resetTutorial = () => {
    setHasCompletedTutorial(false);
    localStorage.removeItem('veloop_tutorial_completed');
    setActiveStep(0);
    setShowTutorial(true);
  };

  return (
    <TutorialContext.Provider value={{
      showTutorial,
      activeStep,
      nextStep,
      prevStep,
      completeTutorial,
      startTutorial,
      resetTutorial,
      hasCompletedTutorial
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
