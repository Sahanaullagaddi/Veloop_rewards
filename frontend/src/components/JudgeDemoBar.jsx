import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { 
  Zap, Flame, FastForward, Coins, Shield, Sparkles, ChevronUp, ChevronDown, Award
} from 'lucide-react';
import styles from './JudgeDemoBar.module.css';

export default function JudgeDemoBar() {
  const { token } = useAuth();
  const { refreshTapState, liveState } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const triggerAction = async (actionName) => {
    setLoadingAction(actionName);
    setStatusMsg('');
    try {
      const res = await fetch(`${API_URL}/api/tap/demo/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: actionName })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(data.message);
        if (refreshTapState) refreshTapState();
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        setStatusMsg(data.message || 'Action failed.');
      }
    } catch (err) {
      console.error(err);
      setStatusMsg('Network error.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <aside aria-label="Judge Demo Controller" className={`${styles.demoDock} ${isOpen ? styles.open : styles.collapsed}`}>
      <button 
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="Judge Pitch & Fast-Forward Controller"
      >
        <div className={styles.toggleContent}>
          <span className={styles.badgePulse}>
            <Award size={14} className={styles.iconGold} />
          </span>
          <span className={styles.toggleText}>Judge Demo Controls</span>
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>

      {isOpen && (
        <div className={styles.panelBody}>
          <div className={styles.panelHeader}>
            <div>
              <h4 className={styles.panelTitle}>Hackathon Pitch Controls</h4>
              <p className={styles.panelSubtitle}>Instant fast-forward actions for live demo</p>
            </div>
            <span className={styles.tagJudge}>JUDGE MODE</span>
          </div>

          {statusMsg && (
            <div className={styles.statusToast}>
              <Sparkles size={13} />
              <span>{statusMsg}</span>
            </div>
          )}

          <div className={styles.actionGrid}>
            <button 
              className={styles.actionBtn}
              onClick={() => triggerAction('refill_energy')}
              disabled={loadingAction !== null}
            >
              <Zap size={15} className={styles.iconCyan} />
              <div className={styles.btnText}>
                <strong>Refill Energy</strong>
                <span>Instant 100% capacity</span>
              </div>
            </button>

            <button 
              className={styles.actionBtn}
              onClick={() => triggerAction('set_fever')}
              disabled={loadingAction !== null}
            >
              <Flame size={15} className={styles.iconOrange} />
              <div className={styles.btnText}>
                <strong>Trigger Fever</strong>
                <span>25x combo & 2x rewards</span>
              </div>
            </button>

            <button 
              className={styles.actionBtn}
              onClick={() => triggerAction('mature_staking')}
              disabled={loadingAction !== null}
            >
              <FastForward size={15} className={styles.iconPurple} />
              <div className={styles.btnText}>
                <strong>Unlock Staking</strong>
                <span>Mature active vaults</span>
              </div>
            </button>

            <button 
              className={styles.actionBtn}
              onClick={() => triggerAction('grant_tokens')}
              disabled={loadingAction !== null}
            >
              <Coins size={15} className={styles.iconYellow} />
              <div className={styles.btnText}>
                <strong>Grant +350 VE</strong>
                <span>Test high-tier upgrades</span>
              </div>
            </button>

            <button 
              className={styles.actionBtn}
              onClick={() => triggerAction('activate_shield')}
              disabled={loadingAction !== null}
            >
              <Shield size={15} className={styles.iconGreen} />
              <div className={styles.btnText}>
                <strong>Shield 90%</strong>
                <span>30s 90% energy save</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
