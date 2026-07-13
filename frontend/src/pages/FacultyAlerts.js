import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/facultyAlerts.css';
import {
  FaBell,
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaCalendarAlt
} from 'react-icons/fa';

const FacultyAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch =
      alert.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.senderName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || alert.type === filterType;

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const markAsRead = async (alertId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/alerts/${alertId}/read`);
      setAlerts(prev => prev.map(a =>
        a._id === alertId ? { ...a, read: true, readAt: new Date().toISOString() } : a
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/alerts/${alertId}`);
      setAlerts(prev => prev.filter(a => a._id !== alertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
      setAlerts(prev => prev.filter(a => a._id !== alertId));
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning': return <FaExclamationTriangle style={{ color: '#f59e0b' }} />;
      case 'success': return <FaCheckCircle style={{ color: '#10b981' }} />;
      case 'error': return <FaTimesCircle style={{ color: '#ef4444' }} />;
      case 'info':
      default: return <FaInfoCircle style={{ color: '#3b82f6' }} />;
    }
  };

  const getAlertBorderColor = (type) => {
    switch (type) {
      case 'warning': return '#f59e0b';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'warning': return 'Warning';
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'info': return 'Info';
      default: return 'Info';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterOptions = [
    { value: 'all', label: 'All Alerts' },
    { value: 'warning', label: 'Warnings' },
    { value: 'error', label: 'Errors' },
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' }
  ];

  return (
    <div className="faculty-alerts-container">
      {/* Header */}
      <div className="faculty-alerts-header">
        <div className="faculty-alerts-header-content">
          <div className="faculty-alerts-header-icon"><FaBell /></div>
          <div>
            <h1 className="faculty-alerts-title">System Alerts</h1>
            <p className="faculty-alerts-subtitle">View system notifications and important updates</p>
          </div>
        </div>
        <div className="faculty-alerts-stats-badge">
          <FaCalendarAlt style={{ marginRight: 6 }} />
          {unreadCount} Unread Alert{unreadCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Statistics Row */}
      <div className="faculty-alerts-stats-row">
        <div className="faculty-alerts-stat-card">
          <span className="faculty-alerts-stat-number">{alerts.length}</span>
          <span className="faculty-alerts-stat-label">Total Alerts</span>
        </div>
        <div className="faculty-alerts-stat-card">
          <span className="faculty-alerts-stat-number" style={{ color: '#f59e0b' }}>
            {alerts.filter(a => a.type === 'warning').length}
          </span>
          <span className="faculty-alerts-stat-label">Warnings</span>
        </div>
        <div className="faculty-alerts-stat-card">
          <span className="faculty-alerts-stat-number" style={{ color: '#ef4444' }}>
            {alerts.filter(a => a.type === 'error').length}
          </span>
          <span className="faculty-alerts-stat-label">Errors</span>
        </div>
        <div className="faculty-alerts-stat-card">
          <span className="faculty-alerts-stat-number" style={{ color: '#3b82f6' }}>
            {alerts.filter(a => a.type === 'info').length}
          </span>
          <span className="faculty-alerts-stat-label">Info</span>
        </div>
      </div>

      {/* Controls */}
      <div className="faculty-alerts-controls">
        <div className="faculty-alerts-controls-left">
          <div className="faculty-alerts-search-container">
            <FaSearch className="faculty-alerts-search-icon" />
            <input
              type="text"
              placeholder="Search alerts by title, message, or sender..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="faculty-alerts-search-input"
            />
          </div>
        </div>

        <div className="faculty-alerts-controls-right">
          <div className="faculty-alerts-filter-dropdown">
            <button
              className="faculty-alerts-filter-btn"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <FaFilter /> Filter
            </button>
            {showFilterMenu && (
              <div className="faculty-alerts-filter-menu">
                {filterOptions.map(option => (
                  <div
                    key={option.value}
                    className={`faculty-alerts-filter-option ${filterType === option.value ? 'active' : ''}`}
                    onClick={() => {
                      setFilterType(option.value);
                      setShowFilterMenu(false);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="faculty-alerts-main-container">
        {loading ? (
          <div className="faculty-alerts-loading">
            <div className="faculty-alerts-spinner"></div>
            <p>Loading alerts...</p>
          </div>
        ) : paginatedAlerts.length === 0 ? (
          <div className="faculty-alerts-empty-state">
            <FaBell className="faculty-alerts-empty-icon" />
            <h3>No alerts found</h3>
            <p>All system notifications will appear here</p>
          </div>
        ) : (
          <div className="faculty-alerts-grid">
            {paginatedAlerts.map((alert) => (
              <div
                key={alert._id}
                className="faculty-alert-card"
                style={{
                  borderLeft: `4px solid ${getAlertBorderColor(alert.type)}`,
                  opacity: alert.read ? 0.75 : 1
                }}
              >
                <div className="faculty-alert-card-header">
                  <div className="faculty-alert-profile">
                    <div
                      className="faculty-alert-avatar"
                      style={{
                        background: `linear-gradient(135deg, ${getAlertBorderColor(alert.type)}22, ${getAlertBorderColor(alert.type)}44)`
                      }}
                    >
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="faculty-alert-info">
                      <div className="faculty-alert-title">{alert.title}</div>
                      <div className="faculty-alert-time">
                        {formatDate(alert.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="faculty-alert-badges">
                    {!alert.read && (
                      <span className="faculty-alert-badge-unread">Unread</span>
                    )}
                    <span
                      className="faculty-alert-type-badge"
                      style={{
                        background: `${getAlertBorderColor(alert.type)}22`,
                        color: getAlertBorderColor(alert.type),
                        border: `1px solid ${getAlertBorderColor(alert.type)}`
                      }}
                    >
                      {getAlertTypeLabel(alert.type)}
                    </span>
                  </div>
                </div>

                <div className="faculty-alert-card-body">
                  <div className="faculty-alert-message">
                    <FaInfoCircle className="faculty-alert-message-icon" />
                    <span>{alert.message}</span>
                  </div>

                  {alert.senderName && (
                    <div className="faculty-alert-sender">
                      <FaUser className="faculty-alert-sender-icon" />
                      <span>From: {alert.senderName}</span>
                    </div>
                  )}
                </div>

                <div className="faculty-alert-card-footer">
                  <div className="faculty-alert-status">
                    <FaBell />
                    <span>{alert.read ? 'Read' : 'Unread'}</span>
                  </div>
                  <div className="faculty-alert-actions">
                    {!alert.read && (
                      <button
                        onClick={() => markAsRead(alert._id)}
                        className="faculty-alert-read-btn"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert._id)}
                      className="faculty-alert-dismiss-btn"
                      title="Dismiss Alert"
                    >
                      <FaTrash /> Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="faculty-alerts-pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="faculty-alerts-pagination-btn"
            >
              <FaChevronLeft />
            </button>
            <span className="faculty-alerts-pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="faculty-alerts-pagination-btn"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyAlerts;