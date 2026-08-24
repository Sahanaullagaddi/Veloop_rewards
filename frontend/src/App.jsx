import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TutorialProvider, useTutorial } from './context/TutorialContext';
import { AdProvider, useAd } from './context/AdContext';

// Header
import TapHeader from './components/TapHeader';

// Pages
import TapEarnPage from './pages/TapEarnPage';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import SeasonPage from './pages/SeasonPage';
import StreakPage from './pages/StreakPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import TapLeaguePage from './pages/TapLeaguePage';
import AdminPanel from './pages/AdminPanel';
import LoginPage from './pages/LoginPage';
import RulesPage from './pages/RulesPage';

// CSS
import './index.css';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading Auth State...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// App shell layout
function AppContent() {
  const { token } = useAuth();
  const { isConnected } = useSocket();
  const { showTutorial, activeStep, nextStep, prevStep, completeTutorial } = useTutorial();
  const { showAdModal, adPlaying, adProgress, earnedReward, closeAdModal, playAd, currentAdType } = useAd();

  const tutorialSteps = [
    { title: "Tap Circle Core", text: "Tap the central core to generate VE and SVE yield. Maintain your streak to unlock achievements!" },
    { title: "Energy Bank & Upgrades", text: "Energy depletes on tap. Upgrade your energy capacity, recharge rates, and bank limits to keep tapping." },
    { title: "Boosters & Shields", text: "Activate active 30s Boosts for 2x rewards. Purchase Shields to save 90% energy consumption." },
    { title: "Seasonal Leagues", text: "Verify your score and climb to the top 100 ranking in the season. Major VE prizes await top players!" }
  ];

  return (
    <div className="app-container">
      {token && <TapHeader />}
      
      {/* Offline awareness ribbon */}
      {token && !isConnected && (
        <div className="offline-ribbon">
          Reconnecting to VELoop services... (Offline mode active)
        </div>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><TapEarnPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        <Route path="/season" element={<ProtectedRoute><SeasonPage /></ProtectedRoute>} />
        <Route path="/streak" element={<ProtectedRoute><StreakPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/league" element={<ProtectedRoute><TapLeaguePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/rules" element={<ProtectedRoute><RulesPage /></ProtectedRoute>} />
      </Routes>

      {/* Onboarding On-screen Tutorial Coachmark Overlay */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-card">
            <h3>{tutorialSteps[activeStep].title}</h3>
            <p>{tutorialSteps[activeStep].text}</p>
            <div className="tutorial-dots">
              {tutorialSteps.map((_, i) => (
                <span key={i} className={`dot ${i === activeStep ? 'active' : ''}`} />
              ))}
            </div>
            <div className="tutorial-actions">
              {activeStep > 0 && <button onClick={prevStep}>Back</button>}
              <button onClick={nextStep} className="btn-primary">
                {activeStep === 3 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Ad Provider Overlay Modal */}
      {showAdModal && (
        <div className="ad-overlay">
          <div className="ad-card">
            {!adPlaying && !earnedReward && (
              <>
                <h3>Ad Opportunity Available!</h3>
                <p>Watch a short 5-second simulated ad to instantly earn <strong>10 VE</strong>.</p>
                <div className="ad-actions">
                  <button onClick={() => playAd('video')} className="btn-primary">Watch Video</button>
                  <button onClick={closeAdModal}>Skip Ad</button>
                </div>
              </>
            )}

            {adPlaying && (
              <>
                <h3>Simulating Sponsored Ad...</h3>
                <p>Do not close the application.</p>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${adProgress}%` }} />
                </div>
                <button disabled className="btn-disabled">Please Wait ({5 - adProgress/20}s)</button>
              </>
            )}

            {earnedReward && (
              <>
                <h3 className="gold-text">Reward Claimed!</h3>
                <p>You received <strong>+{earnedReward.amount} {earnedReward.type}</strong> from the ad view!</p>
                <button onClick={closeAdModal} className="btn-primary">Continue Tapping</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider>
            <TutorialProvider>
              <AdProvider>
                <AppContent />
              </AdProvider>
            </TutorialProvider>
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}
