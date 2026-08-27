import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { 
  ChevronLeft, BarChart2, Save, RefreshCw, Users, ShieldAlert, Zap, Award, Search, Eye, Check, X
} from 'lucide-react';
import styles from './AdminPanel.module.css';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { liveState } = useSocket();

  // Admin states
  const [config, setConfig] = useState({});
  const [auditLog, setAuditLog] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  
  // Withdrawal inputs
  const [txRefInputs, setTxRefInputs] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  
  // Impersonate / Preview state
  const [previewUserId, setPreviewUserId] = useState('');
  const [previewData, setPreviewData] = useState(null);

  // Edit states
  const [editReason, setEditReason] = useState('Adjust economy parameters');
  const [updatingKey, setUpdatingKey] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Get configs
      const configRes = await fetch(`${API_URL}/api/admin/tap-economy/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const configData = await configRes.json();
      if (configData.success) {
        setConfig(configData.config);
      }

      // 2. Get audits
      const auditRes = await fetch(`${API_URL}/api/admin/tap-economy/config/audit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const auditData = await auditRes.json();
      if (auditData.success) {
        setAuditLog(auditData.audits);
      }

      // 3. Get analytics
      const analyticsRes = await fetch(`${API_URL}/api/admin/tap-economy/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const analyticsData = await analyticsRes.json();
      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
      }

      // 4. Get withdrawals list
      const withdrawalsRes = await fetch(`${API_URL}/api/admin/withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const withdrawalsData = await withdrawalsRes.json();
      if (withdrawalsData.success) {
        setWithdrawals(withdrawalsData.withdrawals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (key) => {
    setUpdatingKey(key);
    let val = config[key];
    
    // Parse arrays/objects if edit is JSON, else parse floats/integers
    if (typeof val === 'string') {
      try {
        if (val.startsWith('[') || val.startsWith('{')) {
          val = JSON.parse(val);
        }
      } catch (e) {}
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/tap-economy/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, value: val, reason: editReason })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Successfully updated configuration key: ${key}`);
        fetchAdminData();
      } else {
        showToast(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingKey('');
    }
  };

  const handleSeasonRollover = async () => {
    if (!window.confirm('Trigger Season Rollover? This freezes rankings, issues prizes, and archives progress.')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/tap-economy/season/rollover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Admin rollover manual trigger' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Season Rollover completed successfully!');
        fetchAdminData();
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Preview user dashboard (impersonate mode)
  const handlePreviewUser = async (id) => {
    const targetId = id || previewUserId;
    if (!targetId) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/tap-economy/users/${targetId}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveWithdrawal = async (id) => {
    const txRef = txRefInputs[id] || '';
    if (!txRef.trim()) {
      showToast('Please enter the UPI Transaction Reference ID.');
      return;
    }
    setProcessingId(id);
    try {
      const res = await fetch(`${API_URL}/api/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ txRef, adminComment: commentInputs[id] || '' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Withdrawal approved successfully!');
        fetchAdminData();
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
      showToast('Error approving withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (id) => {
    if (!window.confirm('Are you sure you want to reject this withdrawal? The VE balance will be fully refunded to the user.')) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API_URL}/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminComment: commentInputs[id] || 'Rejected by Admin' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Withdrawal request rejected. VE balance refunded.');
        fetchAdminData();
      } else {
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
      showToast('Error rejecting withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfigChange = (key, val) => {
    setConfig(prev => ({
      ...prev,
      [key]: val
    }));
  };

  if (loading) return <div className="loading-screen">Loading Control Center...</div>;

  return (
    <div className="content-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}

      <div className={styles.adminHeader}>
        <ShieldAlert className={styles.iconGold} size={28} />
        <h2>VELoop Admin Control Center</h2>
      </div>

      {/* Manual Season Rollover Card */}
      <div className={styles.card}>
        <div className={styles.row}>
          <div>
            <h3>Active Season Rollover</h3>
            <p className={styles.subtitle}>Sequence: Freeze → Rank → Distribute → Archive → Activate Next → Reset Efficiency</p>
          </div>
          <button onClick={handleSeasonRollover} className={styles.btnRollover}>
            Trigger Rollover
          </button>
        </div>
      </div>

      {/* User Search / Impersonator Mode */}
      <div className={styles.card}>
        <h3>Impersonate / Preview Mode (Read-only)</h3>
        <p className={styles.subtitle}>Inspect the live Tap & Earn stats of any registered member in the workspace.</p>
        
        {/* Search row */}
        <div className={styles.searchRow}>
          <input 
            type="text" 
            placeholder="Paste User ObjectId (e.g. 64df5...)"
            value={previewUserId}
            onChange={(e) => setPreviewUserId(e.target.value)}
            className={styles.inputSearch}
          />
          <button onClick={() => handlePreviewUser()} className={styles.btnSearch}>
            <Eye size={14} /> Preview
          </button>
        </div>

        {/* Selected preview user statistics block */}
        {previewData && (
          <div className={styles.previewDataBlock}>
            <div className={styles.previewHeader}>
              <h4>Member: {previewData.user.username}</h4>
              <button onClick={() => setPreviewData(null)} className={styles.btnClosePreview}>Close</button>
            </div>
            <div className={styles.previewGrid}>
              <div>Level: <strong>{previewData.user.level}</strong></div>
              <div>VE: <strong>{parseFloat(previewData.user.veBalance.$numberDecimal || previewData.user.veBalance).toFixed(1)}</strong></div>
              <div>SVE: <strong>{parseFloat(previewData.user.sveBalance.$numberDecimal || previewData.user.sveBalance).toFixed(1)}</strong></div>
              <div>Energy Capacity: <strong>{500 + (previewData.tapState.energyCapacityLevel - 1) * 100}</strong></div>
              <div>Recharge Speed Lvl: <strong>{previewData.tapState.rechargeSpeedLevel}</strong></div>
              <div>Total Taps: <strong>{previewData.tapState.totalAcceptedTaps}</strong></div>
            </div>
          </div>
        )}

        {/* Dynamic User Impersonation select list */}
        {analytics && analytics.usersStats && (
          <div className={styles.listSection}>
            <span className={styles.label}>Select user to inspect:</span>
            <div className={styles.usersMiniList}>
              {analytics.usersStats.map(u => (
                <div key={u.userId} className={styles.userMiniRow} onClick={() => handlePreviewUser(u.userId)}>
                  <span>{u.username}</span>
                  <span className={styles.userMiniScore}>{u.totalTaps} taps <ChevronRight size={10} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Player Payout Requests (UPI) */}
      <div className={styles.card}>
        <h3>Player Payout Requests (UPI)</h3>
        <p className={styles.subtitle}>Review pending withdrawal transactions, approve with UPI reference keys, or reject to trigger auto-refunds.</p>

        {withdrawals.length === 0 ? (
          <div className={styles.emptyAudits}>No withdrawal requests found.</div>
        ) : (
          <div className={styles.withdrawalList}>
            {withdrawals.map(w => (
              <div key={w.id} className={styles.withdrawalRow} style={{
                borderBottom: '1px solid #1a1a2e',
                padding: '15px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{w.username}</strong>
                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                      {new Date(w.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span style={{
                    fontWeight: '800',
                    fontSize: '15px',
                    color: w.status === 'approved' ? '#4caf50' : w.status === 'rejected' ? '#f44336' : '#ff9800'
                  }}>
                    Rs. {w.amount.toFixed(2)} ({w.status.toUpperCase()})
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#aaa' }}>
                  UPI ID: <strong style={{ color: '#fff' }}>{w.upiId}</strong>
                </div>

                {w.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="UPI Tx Ref ID (Required to Approve)"
                      value={txRefInputs[w.id] || ''}
                      onChange={(e) => setTxRefInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                      style={{
                        flex: 1,
                        background: '#0f0f1e',
                        border: '1px solid #333',
                        color: '#fff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <input 
                      type="text" 
                      placeholder="Admin comment (Optional)"
                      value={commentInputs[w.id] || ''}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                      style={{
                        flex: 1,
                        background: '#0f0f1e',
                        border: '1px solid #333',
                        color: '#fff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <button 
                      onClick={() => handleApproveWithdrawal(w.id)}
                      disabled={processingId === w.id}
                      className={styles.btnApprove}
                      style={{
                        background: '#4caf50',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRejectWithdrawal(w.id)}
                      disabled={processingId === w.id}
                      className={styles.btnReject}
                      style={{
                        background: '#f44336',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#666', background: '#0c0c17', padding: '8px', borderRadius: '4px' }}>
                    {w.txRef && <div>Tx Ref: <strong style={{ color: '#999' }}>{w.txRef}</strong></div>}
                    {w.adminComment && <div>Comment: <em>{w.adminComment}</em></div>}
                    {w.processedAt && <div>Processed: {new Date(w.processedAt).toLocaleString()}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Telemetry Analytics Card */}
      {analytics && (
        <div className={styles.card}>
          <h3>Core Telemetry Analytics</h3>
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsStat}>
              <Users size={16} className={styles.iconBlue} />
              <div>
                <span>Total Registrations</span>
                <strong>{analytics.totalUsers} Members</strong>
              </div>
            </div>
            <div className={styles.analyticsStat}>
              <Zap size={16} className={styles.iconGold} />
              <div>
                <span>Taps Processed</span>
                <strong>{analytics.totalTaps} accepted</strong>
              </div>
            </div>
          </div>

          <div className={styles.divider} />
          
          <h4>Distributions Audit</h4>
          <div className={styles.ledgerAgg}>
            <div>VE: <strong>{analytics.rewardsDistributed.VE} VE</strong></div>
            <div>SVE: <strong>{analytics.rewardsDistributed.SVE} SVE</strong></div>
            <div>Tokens: <strong>{analytics.rewardsDistributed.Token} Tokens</strong></div>
            <div>Gems: <strong>{analytics.rewardsDistributed.Gem} Gems</strong></div>
          </div>
        </div>
      )}

      {/* Economy Configuration variables editor */}
      <div className={styles.card}>
        <h3>Economy Config Editor</h3>
        <p className={styles.subtitle}>Modify server-authoritative logic. Ratios must sum to exactly 1.0 (100%).</p>
        
        {/* Audit Reason */}
        <div className={styles.inputGroup}>
          <label>Audit Reason (Required for all parameter adjustments)</label>
          <input 
            type="text" 
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            className={styles.inputReason}
          />
        </div>

        <div className={styles.configList}>
          {Object.keys(config).map(key => (
            <div key={key} className={styles.configItem}>
              <div className={styles.configHeader}>
                <span className={styles.configKey}>{key}</span>
                <button 
                  onClick={() => handleUpdateConfig(key)}
                  disabled={updatingKey === key}
                  className={styles.btnSaveConfig}
                >
                  <Save size={12} /> {updatingKey === key ? 'Saving...' : 'Save'}
                </button>
              </div>
              
              <input 
                type="text" 
                value={typeof config[key] === 'object' ? JSON.stringify(config[key]) : config[key]}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                className={styles.inputConfigValue}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Card */}
      <div className={styles.section}>
        <h3>Configuration Change Audit Log</h3>
        <div className={styles.auditFeed}>
          {auditLog.length === 0 ? (
            <div className={styles.emptyAudits}>No change logs recorded.</div>
          ) : (
            auditLog.map(audit => (
              <div key={audit._id} className={styles.auditItem}>
                <div className={styles.auditHeader}>
                  <strong>{audit.key}</strong>
                  <span>{new Date(audit.timestamp).toLocaleDateString()}</span>
                </div>
                <div className={styles.auditChanges}>
                  <span>Old: {JSON.stringify(audit.oldValue)}</span> → <span>New: {JSON.stringify(audit.newValue)}</span>
                </div>
                <p className={styles.auditReason}>Reason: {audit.reason || 'No reason specified'}</p>
                {audit.adminId && <div className={styles.auditAdmin}>Admin: {audit.adminId.username}</div>}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
