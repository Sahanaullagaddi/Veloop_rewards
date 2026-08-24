import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronLeft, Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, BarChart2, Activity
} from 'lucide-react';
import styles from './WalletPage.module.css';

export default function WalletPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { liveState } = useSocket();

  const [ledger, setLedger] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState('all');

  // Withdrawal States
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');

  useEffect(() => {
    fetchLedger(currentPage);
  }, [currentPage, filterType]);

  const handleInitiateWithdrawal = async (e) => {
    e.preventDefault();
    setWithdrawMsg('');
    
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawMsg('Please enter a valid amount.');
      return;
    }
    
    // Parse user balance safely
    let rawBal = 0;
    if (liveState.veBalance) {
      rawBal = parseFloat(liveState.veBalance.$numberDecimal || liveState.veBalance);
    }
    
    if (amt > rawBal) {
      setWithdrawMsg('Insufficient VE balance to withdraw.');
      return;
    }
    
    if (!withdrawUpi || !withdrawUpi.includes('@')) {
      setWithdrawMsg('Please enter a valid UPI ID (must contain @).');
      return;
    }
    
    setWithdrawing(true);
    try {
      const res = await fetch('http://localhost:5000/api/tap/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt, upiId: withdrawUpi })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowWithdraw(false);
        setWithdrawAmt('');
        setWithdrawUpi('');
        fetchLedger(1);
      } else {
        setWithdrawMsg(data.message);
      }
    } catch (err) {
      console.error(err);
      setWithdrawMsg('Server error. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const fetchLedger = async (page) => {
    setLoadingLedger(true);
    try {
      const res = await fetch(`http://localhost:5000/api/tap/history?page=${page}&limit=7`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger);
        setTotalPages(data.pagination.pages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  if (!liveState) return <div className="loading-screen">Loading Wallet...</div>;

  const parseVal = (val) => {
    if (val === null || val === undefined) return '0.0';
    let raw = val;
    if (typeof val === 'object' && val.$numberDecimal) {
      raw = val.$numberDecimal;
    }
    const num = parseFloat(raw);
    return isNaN(num) ? '0.0' : num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const getRupeeVal = (val, type) => {
    if (val === null || val === undefined) return 'Rs. 0.00';
    let raw = val;
    if (typeof val === 'object' && val.$numberDecimal) {
      raw = val.$numberDecimal;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) return 'Rs. 0.00';
    
    let rate = 1.0;
    if (type === 'VE') rate = 1.0;
    else if (type === 'SVE') rate = 2.0;
    else if (type === 'Token') rate = 0.01;
    else if (type === 'Gem') rate = 10.0;
    
    return `Rs. ${(num * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Mock insights data for SVG chart rendering
  // We represent yield over the last 5 days
  const chartData = [
    { day: 'Day 1', yield: 45 },
    { day: 'Day 2', yield: 80 },
    { day: 'Day 3', yield: 110 },
    { day: 'Day 4', yield: 165 },
    { day: 'Day 5', yield: 245 }
  ];

  // SVG Chart settings
  const width = 300;
  const height = 120;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Max value in chart data
  const maxVal = 300;

  // Generate SVG Points
  const points = chartData.map((d, idx) => {
    const x = padding + (idx * chartWidth) / (chartData.length - 1);
    const y = height - padding - (d.yield * chartHeight) / maxVal;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="content-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      {/* Main Wallet Header */}
      <div className={styles.walletHeader}>
        <div className={styles.row}>
          <div className={styles.titleInfo}>
            <Wallet size={24} className={styles.iconGold} />
            <h2>Capital Assets</h2>
          </div>
          <span className={styles.statusBadge}>ACTIVE GATEWAY</span>
        </div>
        
        <div className={styles.primaryBalance}>
          {parseVal(liveState.veBalance)} <span>VE</span>
        </div>
      </div>

      {/* Action Row */}
      <div className={styles.actionRow}>
        <button className={styles.btnAction} onClick={() => alert('Top Up simulation: Hooked to payment processor gateway.')}>
          <ArrowUpRight size={16} /> Top Up
        </button>
        <button className={styles.btnAction} onClick={() => setShowWithdraw(true)}>
          <ArrowDownLeft size={16} /> Withdraw
        </button>
      </div>

      {/* Grid of other assets */}
      <div className={styles.grid}>
        <div className={styles.gridCard}>
          <span className={styles.label}>Staked VE (SVE)</span>
          <div className={styles.gridValue}>{parseVal(liveState.sveBalance)} SVE</div>
        </div>
        <div className={styles.gridCard}>
          <span className={styles.label}>Utility Tokens</span>
          <div className={styles.gridValue}>{parseVal(liveState.tokenBalance)} TOKENS</div>
        </div>
        <div className={styles.gridCard}>
          <span className={styles.label}>Capital Gems</span>
          <div className={styles.gridValue}>{parseVal(liveState.gemBalance)} GEMS</div>
        </div>
        <div className={styles.gridCard}>
          <span className={styles.label}>Lucky Spins</span>
          <div className={styles.gridValue}>{liveState.spinBalance || 0} SPINS</div>
        </div>
      </div>

      {/* Dynamic Tap Insights Chart */}
      <div className={styles.card}>
        <div className={styles.chartHeader}>
          <Activity size={16} className={styles.iconBlue} />
          <span className={styles.label}>Yield Insights (Last 5 Days)</span>
        </div>

        <div className={styles.chartWrapper}>
          <svg viewBox={`0 0 ${width} ${height}`} className={styles.svgChart}>
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeWidth="0.5" />
            <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="var(--border-color)" strokeWidth="0.5" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="0.5" />

            {/* Line Path */}
            <polyline
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth="2.5"
              points={points}
            />

            {/* Data Dots */}
            {chartData.map((d, idx) => {
              const x = padding + (idx * chartWidth) / (chartData.length - 1);
              const y = height - padding - (d.yield * chartHeight) / maxVal;
              return (
                <g key={idx}>
                  <circle cx={x} cy={y} r="4" fill="var(--bg-secondary)" stroke="var(--accent-gold)" strokeWidth="2" />
                  <text x={x} y={y - 8} fontSize="8" fill="var(--text-primary)" textAnchor="middle" fontWeight="bold">
                    {d.yield} VE
                  </text>
                </g>
              );
            })}

            {/* X Axis Labels */}
            {chartData.map((d, idx) => {
              const x = padding + (idx * chartWidth) / (chartData.length - 1);
              return (
                <text key={idx} x={x} y={height - 4} fontSize="8" fill="var(--text-secondary)" textAnchor="middle">
                  {d.day}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className={styles.section}>
        <div className={styles.row}>
          <h3 className={styles.sectionTitle}>Reward Audit Ledger</h3>
        </div>

        {loadingLedger ? (
          <div className={styles.ledgerLoading}>Retrieving audit records...</div>
        ) : ledger.length === 0 ? (
          <div className={styles.ledgerEmpty}>No transaction logs detected.</div>
        ) : (
          <div className={styles.ledgerList}>
            {ledger.map(item => {
              const isCredit = item.amount > 0;
              return (
                <div key={item.id} className={styles.ledgerItem}>
                  <div>
                    <div className={styles.ledgerType}>
                      {item.type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className={styles.ledgerTime}>
                      {new Date(item.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className={`${styles.ledgerAmt} ${isCredit ? styles.credit : styles.debit}`}>
                    {isCredit ? '+' : ''}{item.amount} {item.currency}
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                >
                  Prev
                </button>
                <span className={styles.pageIndicator}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UPI Withdrawal Modal */}
      {showWithdraw && (
        <div className={styles.modalOverlay} onClick={() => setShowWithdraw(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Withdraw via UPI Gateway</h3>
              <button onClick={() => setShowWithdraw(false)}>X</button>
            </div>
            
            <form onSubmit={handleInitiateWithdrawal} className={styles.withdrawForm}>
              <p className={styles.modalDesc}>
                Transfer your VE reward capital directly to your checking account instantly via UPI.
              </p>
              
              {withdrawMsg && <div className={styles.withdrawError}>{withdrawMsg}</div>}
              
              <div className={styles.inputGroup}>
                <label>Amount in VE (Rs.)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 50" 
                  value={withdrawAmt}
                  onChange={e => setWithdrawAmt(e.target.value)}
                  required
                  className={styles.modalInput}
                />
                <span className={styles.inputHint}>
                  Available: {parseVal(liveState.veBalance)} VE (≈ {getRupeeVal(liveState.veBalance, 'VE')})
                </span>
              </div>
              
              <div className={styles.inputGroup}>
                <label>Your UPI ID (e.g. paytm, gpay)</label>
                <input 
                  type="text" 
                  placeholder="e.g. name@okaxis" 
                  value={withdrawUpi}
                  onChange={e => setWithdrawUpi(e.target.value)}
                  required
                  className={styles.modalInput}
                />
              </div>

              <div className={styles.withdrawSummary}>
                <div>Conversion Rate: <strong>1 VE = Rs. 1.00</strong></div>
                <div>Settlement Speed: <strong>Instant Settle</strong></div>
              </div>
              
              <button type="submit" className="btn-primary" disabled={withdrawing}>
                {withdrawing ? 'Initiate Settle...' : 'Confirm Withdrawal'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
