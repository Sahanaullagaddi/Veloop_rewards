import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { 
  Bot, Sparkles, TrendingUp, Zap, Flame, ShieldCheck, Send, X, AlertCircle, ChevronRight
} from 'lucide-react';
import styles from './AiOracleModal.module.css';

export default function AiOracleModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [oracleData, setOracleData] = useState(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [answering, setAnswering] = useState(false);
  const [conversation, setConversation] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/ai/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setOracleData(data.oracle);
      }
    } catch (err) {
      console.error('Failed to load AI Oracle insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async (qText) => {
    const q = qText || customQuestion;
    if (!q.trim()) return;

    setAnswering(true);
    const userMsg = { role: 'user', text: q };
    setConversation(prev => [...prev, userMsg]);
    if (!qText) setCustomQuestion('');

    try {
      const res = await fetch(`${API_URL}/api/tap/ai/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      if (data.success && data.oracle.aiAnswer) {
        setConversation(prev => [...prev, { role: 'oracle', text: data.oracle.aiAnswer }]);
      }
    } catch (err) {
      console.error(err);
      setConversation(prev => [...prev, { role: 'oracle', text: 'Oracle encountered a network disruption. Please retry.' }]);
    } finally {
      setAnswering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.oracleContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.botIconCircle}>
              <Bot size={22} className={styles.botIcon} />
            </div>
            <div>
              <div className={styles.titleRow}>
                <h3 className={styles.title}>VELoop AI Oracle</h3>
                <span className={styles.aiBadge}>GenAI Copilot</span>
              </div>
              <p className={styles.subtitle}>Algorithmic Wealth & Staking Strategist</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loadingBox}>
              <Sparkles size={28} className={styles.sparklePulse} />
              <p>Analyzing on-chain rhythm and yield telemetry...</p>
            </div>
          ) : oracleData ? (
            <>
              {/* Telemetry & Rating Cards */}
              <div className={styles.kpiRow}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Fintech Rating</span>
                  <strong className={styles.kpiValueGold}>{oracleData.healthRating}</strong>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Projected 24h Yield</span>
                  <strong className={styles.kpiValueCyan}>+{oracleData.projectedDailyYield} VE</strong>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Proof-of-Human</span>
                  <div className={styles.humanBadgeRow}>
                    <ShieldCheck size={14} className={styles.greenText} />
                    <strong className={styles.greenText}>{oracleData.verifiedHumanScore}%</strong>
                  </div>
                </div>
              </div>

              {/* Dynamic AI Challenge */}
              {oracleData.aiChallenge && (
                <div className={styles.challengeCard}>
                  <div className={styles.challengeHeader}>
                    <Sparkles size={16} className={styles.goldText} />
                    <strong>{oracleData.aiChallenge.title}</strong>
                  </div>
                  <p className={styles.challengeTask}>{oracleData.aiChallenge.task}</p>
                  <span className={styles.challengeReward}>Reward: {oracleData.aiChallenge.reward}</span>
                </div>
              )}

              {/* Recommendations */}
              <div className={styles.recSection}>
                <h4 className={styles.sectionTitle}>Strategic Recommendations</h4>
                <div className={styles.recList}>
                  {oracleData.recommendations.map((rec, i) => (
                    <div key={i} className={styles.recCard}>
                      <div className={styles.recIconWrap}>
                        {rec.type === 'staking' && <TrendingUp size={16} className={styles.iconGold} />}
                        {rec.type === 'upgrade' && <Zap size={16} className={styles.iconCyan} />}
                        {rec.type === 'combo' && <Flame size={16} className={styles.iconOrange} />}
                      </div>
                      <div className={styles.recContent}>
                        <strong>{rec.title}</strong>
                        <p>{rec.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat / Consultation Section */}
              <div className={styles.chatSection}>
                <h4 className={styles.sectionTitle}>Consult the Oracle</h4>
                
                {/* Preset Prompt Chips */}
                <div className={styles.chipsScroll}>
                  {[
                    "How can I maximize my VE yield?",
                    "Which Staking Vault gives best APY?",
                    "When should I use Energy Shield?"
                  ].map((chip, idx) => (
                    <button 
                      key={idx}
                      className={styles.promptChip}
                      onClick={() => askQuestion(chip)}
                      disabled={answering}
                    >
                      <span>{chip}</span>
                      <ChevronRight size={12} />
                    </button>
                  ))}
                </div>

                {/* Conversation History */}
                {conversation.length > 0 && (
                  <div className={styles.conversationBox}>
                    {conversation.map((msg, i) => (
                      <div key={i} className={msg.role === 'user' ? styles.userBubble : styles.oracleBubble}>
                        {msg.role === 'oracle' && <Bot size={14} className={styles.bubbleBotIcon} />}
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input row */}
                <form 
                  className={styles.inputForm}
                  onSubmit={(e) => { e.preventDefault(); askQuestion(); }}
                >
                  <input
                    type="text"
                    placeholder="Ask about strategy, vouchers, or mechanics..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className={styles.chatInput}
                    disabled={answering}
                  />
                  <button type="submit" className={styles.sendBtn} disabled={answering || !customQuestion.trim()}>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className={styles.loadingBox}>
              <AlertCircle size={24} className={styles.iconOrange} />
              <p>Unable to connect to AI Oracle services.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
