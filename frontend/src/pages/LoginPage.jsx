import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!username || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setLoading(true);
    let result;
    if (isRegistering) {
      result = await register(username, password);
    } else {
      result = await login(username, password);
    }

    if (result.success) {
      navigate('/');
    } else {
      setErrorMessage(result.message || 'Authentication failed. Please check credentials.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setLoading(true);
    
    // Simulate OAuth handshake
    setTimeout(async () => {
      const result = await login('neo', 'neo123');
      if (result.success) {
        navigate('/');
      } else {
        setErrorMessage('Failed to connect via Google Account.');
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className={styles.container}>
      {/* Floating Background Elements */}
      <div className={`${styles.coin} ${styles.coin1}`}>🪙</div>
      <div className={`${styles.coin} ${styles.coin2}`}>💰</div>
      <div className={`${styles.coin} ${styles.coin3}`}>🪙</div>
      <div className={`${styles.coin} ${styles.coin4}`}>⚡</div>
      <div className={`${styles.coin} ${styles.coin5}`}>🪙</div>
      <div className={`${styles.coin} ${styles.coin6}`}>💰</div>

      {/* Glowing background aura */}
      <div className={styles.bgAura}></div>

      <div className={styles.card}>
        <div className={styles.heroCoinWrapper}>
          <div className={styles.heroCoin}>
            <Zap className={styles.heroCoinIcon} size={28} />
          </div>
        </div>

        <div className={styles.logoSection}>
          <h1 className={styles.wordmark}>VELoop</h1>
          <span className={styles.tag}>Tap & Earn</span>
        </div>
        
        <p className={styles.eyebrow}>Your simple rewards app</p>
        <h2 className={styles.title}>
          {isRegistering ? 'Create your account' : 'Tap to earn rewards'}
        </h2>
        <p className={styles.subtitle}>
          {isRegistering ? 'Create a profile and start tapping.' : 'Sign in to see your balance, energy, and rewards.'}
        </p>

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. neo"
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className={styles.toggle}>
          <span>{isRegistering ? 'Already have a profile?' : 'First time using VELoop?'}</span>
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMessage('');
            }}
            className={styles.toggleBtn}
            disabled={loading}
          >
            {isRegistering ? 'Login Access' : 'Register Account'}
          </button>
        </div>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        {/* Continue with Google Action */}
        <button 
          onClick={handleGoogleLogin} 
          className={styles.googleBtn}
          type="button"
          disabled={loading}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.14-.14 3.01l-5.12 3.4c2.99 1.7 6.84 2.8 9.17.6 2.3-2.2 3.14-5.27 3.14-8.86z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-6.19-4.8c-1.12.75-2.54 1.2-4.08 1.2-3.14 0-5.8-2.12-6.75-4.97H2.84v5.13C4.82 20.3 8.16 24 12 24z"/>
            <path fill="#FBBC05" d="M5.25 14.52a7.18 7.18 0 0 1 0-4.54V4.85H2.84a11.96 11.96 0 0 0 0 14.8l2.41-5.13z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 8.16 0 4.82 3.7 2.84 8.01l4.82 3.73c.95-2.85 3.61-4.99 6.75-4.99z"/>
          </svg>
          {loading ? 'Connecting Google...' : 'Continue with Google'}
        </button>

        <div className={styles.demoCredits}>
          <p><strong>Try the demo</strong></p>
          <p>Player account: neo / neo123</p>
          <button
            type="button"
            className={styles.demoButton}
            onClick={() => {
              setUsername('neo');
              setPassword('neo123');
              setIsRegistering(false);
              setErrorMessage('');
            }}
          >
            Fill demo account
          </button>
        </div>
      </div>
    </div>
  );
}
