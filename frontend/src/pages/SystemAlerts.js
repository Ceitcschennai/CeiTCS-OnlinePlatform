import React, { useEffect, useState } from 'react';
import '../styles/manageparticipant.css';
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

  // Static demo alerts — replace with API call if you have a backend endpoint
  useEffect(() => {
    setLoading(true);
    // Simulated alerts — swap this with a real fetch if needed
    const demoAlerts = [
      {
        _id: '1',
        type: 'warning',
        title: 'Pending Employee Approvals',
        message: 'There are employees waiting for approval.',
        createdAt: new Date().toISOString(),
        read: false
      },
      {
        _id: '2',
        type: 'info',
        title: 'New Trainee Registered',
        message: 'A new trainee has registered and is pending approval.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        read: false
      },
      {
        _id: '3',
        type: 'success',
        title: 'Payment Received',
        message: 'A payment has been successfully processed.',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        read: true
      },
      {
        _id: '4',
        type: 'error',
        title: 'Login Attempt Failed',
        message: 'Multiple failed login attempts detected.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        read: true
      }
    ];
    setAlerts(demoAlerts);
    setFilteredAlerts(demoAlerts);
    setLoading(false);
  }, []);

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

  const handleDelete = (id) => {
    setAlerts(prev => prev.filter(a => a._id !== id));
  };

  const markAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <FaExclamationTriangle style={{ color: '#f59e0b' }} />;
      case 'success': return <FaCheckCircle style={{ color: '#10b981' }} />;
      case 'error': return <FaTimesCircle style={{ color: '#ef4444' }} />;
      default: return <FaInfoCircle style={{ color: '#3b82f6' }} />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'warning': return '#f59e0b';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Alerts' },
    { value: 'warning', label: 'Warnings' },
    { value: 'error', label: 'Errors' },
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' }
  ];

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="student-management-container">
      {/* Header */}
      <div className="student-management-header" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}>
        <div className="student-header-content">
          <h2>
            <FaBell className="student-header-icon" />
            System Alerts
          </h2>
          <p>Monitor system notifications, warnings, and activity logs</p>

          <div className="student-statistics-row">
            <div className="student-stat-card">
              <span className="student-stat-number" style={{ color: '#dc2626' }}>{alerts.length}</span>
              <span className="student-stat-label">Total Alerts</span>
            </div>
            <div className="student-stat-card">
              <span className="student-stat-number" style={{ color: '#dc2626' }}>{unreadCount}</span>
              <span className="student-stat-label">Unread</span>
            </div>
            <div className="student-stat-card">
              <span className="student-stat-number" style={{ color: '#dc2626' }}>
                {alerts.filter(a => a.type === 'warning').length}
              </span>
              <span className="student-stat-label">Warnings</span>
            </div>
            <div className="student-stat-card">
              <span className="student-stat-number" style={{ color: '#dc2626' }}>
                {alerts.filter(a => a.type === 'error').length}
              </span>
              <span className="student-stat-label">Errors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="students-controls">
        <div className="controls-row">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search alerts by title or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="controls-right">
            <div className="filter-dropdown" style={{ position: 'relative' }}>
              <button className="filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                <FaFilter /> Filter
              </button>
              {showFilterMenu && (
                <div className="filter-menu">
                  {filterOptions.map(option => (
                    <div
                      key={option.value}
                      className={`filter-option ${filterType === option.value ? 'active' : ''}`}
                      onClick={() => { setFilterType(option.value); setShowFilterMenu(false); }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {unreadCount > 0 && (
              <button className="add-student-btn" onClick={markAllRead} style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}>
                <FaCheckCircle />
                Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="students-container">
        {loading ? (
          <div className="students-loading-spinner">
            <div className="students-spinner"></div>
            <p>Loading alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <FaBell className="empty-icon" />
            <h3>No alerts found</h3>
            <p>All systems are running normally</p>
          </div>
        ) : (
          <div className="students-grid">
            {filteredAlerts.map((alert) => (
              <div
                key={alert._id}
                className="student-card"
                style={{
                  borderLeft: `4px solid ${getBorderColor(alert.type)}`,
                  opacity: alert.read ? 0.75 : 1
                }}
              >
                <div className="student-card-header">
                  <div className="student-profile">
                    <div
                      className="student-avatar"
                      style={{ background: `linear-gradient(135deg, ${getBorderColor(alert.type)}22, ${getBorderColor(alert.type)}44)` }}
                    >
                      {getIcon(alert.type)}
                    </div>
                    <div className="student-info">
                      <div className="student-name" style={{ fontSize: '1.1rem' }}>
                        {alert.title}
                      </div>
                      <div className="student-id">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="student-badges">
                    {!alert.read && (
                      <span className="status-badge status-pending">Unread</span>
                    )}
                    <span
                      className="status-badge"
                      style={{
                        background: `${getBorderColor(alert.type)}22`,
                        color: getBorderColor(alert.type),
                        border: `1px solid ${getBorderColor(alert.type)}`
                      }}
                    >
                      {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="student-card-body">
                  <div className="student-detail-group" style={{ borderLeftColor: getBorderColor(alert.type) }}>
                    <div className="student-detail-label">
                      <FaInfoCircle /> Message
                    </div>
                    <div className="student-detail-value" style={{ fontWeight: 400, fontSize: '0.95rem' }}>
                      {alert.message}
                    </div>
                  </div>
                </div>

                <div className="student-card-footer">
                  <div className="student-registration-date">
                    <FaBell />
                    <span>{alert.read ? 'Read' : 'Unread'}</span>
                  </div>
                  <div className="student-actions">
                    <button
                      onClick={() => handleDelete(alert._id)}
                      className="action-btn btn-delete"
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
      </div>
    </div>
  );
};

export default SystemAlerts;