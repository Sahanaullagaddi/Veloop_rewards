import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Bell, CheckSquare } from 'lucide-react';
import { API_URL } from '../config';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tap/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading-screen">Loading Notifications...</div>;

  return (
    <div className="content-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.btnBack}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      {/* Header bar */}
      <div className={styles.headerBar}>
        <div className={styles.titleInfo}>
          <Bell size={20} className={styles.iconBlue} />
          <h2>Security Notifications</h2>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button onClick={handleMarkAllRead} className={styles.btnAction}>
            <CheckSquare size={14} /> Mark All Read
          </button>
        )}
      </div>

      {/* Feed list */}
      {notifications.length === 0 ? (
        <div className={styles.emptyState}>No notifications logged.</div>
      ) : (
        <div className={styles.feed}>
          {notifications.map(n => (
            <div 
              key={n._id} 
              className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}
            >
              <div className={styles.row}>
                <span className={`${styles.badge} ${
                  n.category === 'reward' ? styles.reward :
                  n.category === 'mission' ? styles.mission :
                  n.category === 'season' ? styles.season : styles.system
                }`}>
                  {n.category}
                </span>
                <span className={styles.time}>
                  {new Date(n.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h4 className={styles.itemTitle}>{n.title}</h4>
              <p className={styles.itemMessage}>{n.message}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
