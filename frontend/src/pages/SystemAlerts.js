import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/systemAlerts.css';
import LMSCard from '../components/common/LMSCard';
import LMSButton from '../components/common/LMSButton';
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaTimesCircle,
  FaTrash,
  FaBell,
  FaFilter,
  FaSearch
} from 'react-icons/fa';

const SystemAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/alerts/user`);
      if (response.status === 200) {
        setAlerts(response.data.alerts || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Filter + Search
  useEffect(() => {
    let filtered = alerts;

    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    setFilteredAlerts(filtered);
  }, [alerts, searchTerm, filterType]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a._id !== id));
    } catch (error) {
      console.error('Error deleting alert:', error);
      setAlerts(prev => prev.filter(a => a._id !== id));
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/alerts/read-all`);
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case 'warning': return { icon: <FaExclamationTriangle />, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
      case 'success': return { icon: <FaCheckCircle />, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };
      case 'error': return { icon: <FaTimesCircle />, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
      default: return { icon: <FaInfoCircle />, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' };
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Alerts' },
    { value: 'warning', label: 'Warnings' },
    { value: 'error', label: 'Errors' },
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' }
  ];

  return (
    <div className="sa-page">
      {/* ── HEADER ── */}
      <div className="sa-header">
        <div className="sa-header-content">
          <h2 className="sa-header-title">
            <FaBell className="sa-header-icon" />
            System Alerts
          </h2>
          <p className="sa-header-subtitle">Monitor system notifications, warnings, and activity logs</p>
        </div>

        <div className="sa-stats-row">
          <LMSCard className="sa-stat-card" hover>
            <div className="sa-stat-inner">
              <span className="sa-stat-value">{alerts.length}</span>
              <span className="sa-stat-label">Total Alerts</span>
            </div>
          </LMSCard>
          <LMSCard className="sa-stat-card" hover>
            <div className="sa-stat-inner">
              <span className="sa-stat-value sa-stat-value--unread">{unreadCount}</span>
              <span className="sa-stat-label">Unread</span>
            </div>
          </LMSCard>
          <LMSCard className="sa-stat-card" hover>
            <div className="sa-stat-inner">
              <span className="sa-stat-value sa-stat-value--warning">{alerts.filter(a => a.type === 'warning').length}</span>
              <span className="sa-stat-label">Warnings</span>
            </div>
          </LMSCard>
          <LMSCard className="sa-stat-card" hover>
            <div className="sa-stat-inner">
              <span className="sa-stat-value sa-stat-value--error">{alerts.filter(a => a.type === 'error').length}</span>
              <span className="sa-stat-label">Errors</span>
            </div>
          </LMSCard>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="sa-controls">
        <div className="sa-search-wrap">
          <FaSearch className="sa-search-icon" />
          <input
            type="text"
            className="sa-search-input"
            placeholder="Search alerts by title or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="sa-controls-right">
          <div className="sa-filter-dropdown">
            <LMSButton variant="secondary" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <FaFilter /> Filter
            </LMSButton>
            {showFilterMenu && (
              <div className="sa-filter-menu">
                {filterOptions.map(option => (
                  <div
                    key={option.value}
                    className={`sa-filter-option ${filterType === option.value ? 'sa-filter-option--active' : ''}`}
                    onClick={() => { setFilterType(option.value); setShowFilterMenu(false); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setFilterType(option.value); setShowFilterMenu(false); }}}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {unreadCount > 0 && (
            <LMSButton variant="primary" onClick={markAllRead}>
              <FaCheckCircle /> Mark All Read
            </LMSButton>
          )}
        </div>
      </div>

      {/* ── ALERTS LIST ── */}
      <div className="sa-content">
        {loading ? (
          <div className="sa-loading">
            <div className="sa-spinner"></div>
            <p>Loading alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="sa-empty">
            <FaBell className="sa-empty-icon" />
            <h3>No alerts found</h3>
            <p>All systems are running normally</p>
          </div>
        ) : (
          <div className="sa-alerts-grid">
            {filteredAlerts.map((alert) => {
              const style = getAlertStyle(alert.type);
              return (
                <LMSCard
                  key={alert._id}
                  hover
                  className="sa-alert-card"
                  style={{
                    borderLeft: `4px solid ${style.color}`,
                    opacity: alert.read ? 0.75 : 1
                  }}
                >
                  <div className="sa-card-header">
                    <div className="sa-card-profile">
                      <div
                        className="sa-alert-icon"
                        style={{ background: style.bg, color: style.color, borderColor: style.border }}
                      >
                        {style.icon}
                      </div>
                      <div className="sa-card-info">
                        <div className="sa-alert-title">{alert.title}</div>
                        <div className="sa-alert-date">
                          {new Date(alert.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="sa-card-badges">
                      {!alert.read && (
                        <span className="sa-badge sa-badge--unread">Unread</span>
                      )}
                      <span
                        className="sa-badge"
                        style={{
                          background: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`
                        }}
                      >
                        {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="sa-card-body">
                    <div className="sa-message-group" style={{ borderLeftColor: style.color }}>
                      <div className="sa-message-label"><FaInfoCircle /> Message</div>
                      <div className="sa-message-text">{alert.message}</div>
                    </div>
                  </div>

                  <div className="sa-card-footer">
                    <div className="sa-status-text">
                      <FaBell />
                      <span>{alert.read ? 'Read' : 'Unread'}</span>
                    </div>
                    <LMSButton variant="danger" onClick={() => handleDelete(alert._id)}>
                      <FaTrash /> Dismiss
                    </LMSButton>
                  </div>
                </LMSCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAlerts;