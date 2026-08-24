import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  ChevronLeft, BarChart2, Save, RefreshCw, Users, ShieldAlert, Zap, Award, Search, Eye
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
      const configRes = await fetch('http://localhost:5000/api/admin/tap-economy/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const configData = await configRes.json();
      if (configData.success) {
        setConfig(configData.config);
      }

      // 2. Get audits
      const auditRes = await fetch('http://localhost:5000/api/admin/tap-economy/config/audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const auditData = await auditRes.json();
      if (auditData.success) {
        setAuditLog(auditData.audits);
      }

      // 3. Get analytics
      const analyticsRes = await fetch('http://localhost:5000/api/admin/tap-economy/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const analyticsData = await analyticsRes.json();
      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
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
      const res = await fetch('http://localhost:5000/api/admin/tap-economy/config', {
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
      const res = await fetch('http://localhost:5000/api/admin/tap-economy/season/rollover', {
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
      const res = await fetch(`http://localhost:5000/api/admin/tap-economy/users/${targetId}/preview`, {
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
