import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/facultyQueries.css';
import {
  FaSearch,
  FaFilter,
  FaUser,
  FaClock,
  FaSortAmountDown,
  FaSortAmountUp,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaTimes
} from 'react-icons/fa';

const ParticipantQueries = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({ total: 0, pending: 0, answered: 0, resolved: 0 });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    courseCode: '',
    question: '',
    priority: 'Medium',
  });

  const [querySubjects, setQuerySubjects] = useState([]);

  // Get employee data from localStorage
  const getEmployeeData = () => {
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return { ...parsed, id: parsed._id || parsed.id };
      }
      return null;
    } catch { return null; }
  };

  const employee = getEmployeeData();
  const employeeId = employee?._id || employee?.id;
  const employeeName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee';

  useEffect(() => {
      const fetchSubjects = async () => {
    try {

      const response = await axios.get(
        `${API_BASE_URL}/api/queries/participant/${employeeId}/subjects`
      );

      if (response.data.success) {
        setQuerySubjects(response.data.subjects);
      }

    } catch (err) {
      console.error(err);
    }
  };

    fetchSubjects();
  }, [employeeId]);

  const subjects = querySubjects;

  // Fetch this employee's queries
  const fetchQueries = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 8,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'All' && { status: filterStatus }),
        ...(filterSubject !== 'All' && { courseName: filterSubject }),
        sortBy: 'createdAt',
        sortOrder,
        ...(employeeId && { studentId: employeeId })
      });

      const response = await axios.get(`${API_BASE_URL}/api/queries?${queryParams}`);
      if (response.status === 200) {
        setQueries(response.data.queries);
        setPagination(response.data.pagination || {});
        setStats(response.data.stats || { total: 0, pending: 0, answered: 0, resolved: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch queries:', error);
      setQueries([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus, filterSubject, sortOrder, employeeId]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRaiseQuery = async (e) => {
    e.preventDefault();
    if (!form.courseCode || !form.question) {
      alert('Please fill all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId: employeeId,
        courseCode: form.courseCode,
        question: form.question,
        priority: form.priority
      };
      console.log('Submitting Payload:', payload);
      
      const response = await axios.post(`${API_BASE_URL}/api/queries/participant`, payload);
      if (response.status === 201) {
        alert('Query submitted successfully!');
        setForm({ courseCode: '', question: '', priority: 'Medium',});
        setShowRaiseForm(false);
        fetchQueries();
      }
    } catch (error) {
      console.error('Error submitting query:', error);
      alert('Failed to submit query. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="teacher-queries-container">

      {/* Header */}
      <div className="queries-header">
        <div className="queries-header-content">
          <h2>My Queries</h2>
          <p>Raise questions and view replies from your trainee</p>
        </div>

        <div className="queries-statistics-row">
          <div className="queries-stat-card">
            <span className="queries-stat-number">{stats.total}</span>
            <span className="queries-stat-label">Total</span>
          </div>
          <div className="queries-stat-card pending">
            <span className="queries-stat-number">{stats.pending}</span>
            <span className="queries-stat-label">Pending</span>
          </div>
          <div className="queries-stat-card answered">
            <span className="queries-stat-number">{stats.answered}</span>
            <span className="queries-stat-label">Answered</span>
          </div>
          <div className="queries-stat-card resolved">
            <span className="queries-stat-number">{stats.resolved}</span>
            <span className="queries-stat-label">Resolved</span>
          </div>
        </div>
      </div>

      {/* Raise Query Button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          className="submit-reply-button"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.95rem' }}
          onClick={() => setShowRaiseForm(!showRaiseForm)}
        >
          {showRaiseForm ? <FaTimes /> : <FaPlus />}
          {showRaiseForm ? 'Cancel' : 'Raise a Query'}
        </button>
      </div>

      {/* Raise Query Form */}
      {showRaiseForm && (
        <div className="query-card-restructured" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>New Query</h3>
          <form onSubmit={handleRaiseQuery}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                  Subject *
                </label>
                <select
                  name="courseCode"
                  value={form.courseCode}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select Course</option>

                  {subjects.map(subject => (
                    <option
                      key={subject.courseCode}
                      value={subject.courseCode}
                    >
                      {subject.courseName} ({subject.courseCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                  Priority
                </label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                Your Question *
              </label>
              <textarea
                name="question"
                value={form.question}
                onChange={handleFormChange}
                required
                placeholder="Describe your question in detail..."
                rows="4"
                className="compose-textarea"
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="submit-reply-button"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {submitting ? 'Submitting...' : 'Submit Query'}
            </button>
          </form>
        </div>
      )}

      {/* Controls */}
      <div className="queries-controls">
        <div className="queries-controls-left">
          <div className="queries-search-container">
            <FaSearch className="queries-search-icon" />
            <input
              type="text"
              placeholder="Search your queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="queries-search-input"
            />
          </div>
        </div>

        <div className="queries-controls-right">
          <div className="queries-filter-dropdown">
            <button className="queries-filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <FaFilter /> Filter
            </button>
            {showFilterMenu && (
              <div className="queries-filter-menu">
                <div className="filter-group">
                  <label>Status:</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Answered">Answered</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Subject:</label>
                  <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                    <option value="All">All Subjects</option>
                    {subjects.map(subject => ( <option key={subject.courseCode} value={subject.courseName}> {subject.courseName} </option> ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="queries-sort-dropdown">
            <button className="queries-sort-btn" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
              {sortOrder === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />} Sort
            </button>
          </div>
        </div>
      </div>

      {/* Queries List */}
      <div className="queries-main-container">
        {loading ? (
          <div className="queries-loading-spinner">
            <div className="queries-spinner"></div>
            <p>Loading queries...</p>
          </div>
        ) : (
          <div className="queries-cards-grid-restructured">
            {queries.length === 0 ? (
              <div className="queries-no-data">
                <p>No queries found. Click "Raise a Query" to submit your first question.</p>
              </div>
            ) : (
              queries.map((query) => (
                <div key={query._id} className="query-card-restructured">

                  {/* Top Section */}
                  <div className="card-top-section">
                    <div className="student-profile-area">
                      <div className="student-avatar"><FaUser /></div>
                      <div className="student-info">
                        <div className="student-name-section">
                          <h3 className="student-name">{query.studentName || employeeName}</h3>
                          <span className="query-time">
                            <FaClock className="time-icon" />
                            {formatTimeAgo(query.createdAt)}
                          </span>
                        </div>
                        <div className="student-meta">
                          <span className={`subject-chip`}>{query.courseName}</span>
                          <span className={`class-badge`} style={{
                            background: query.priority === 'Urgent' ? '#fef2f2' : query.priority === 'High' ? '#fff7ed' : '#f0fdf4',
                            color: query.priority === 'Urgent' ? '#ef4444' : query.priority === 'High' ? '#f97316' : '#16a34a'
                          }}>
                            {query.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="question-container">
                    <h4>Your Question</h4>
                    <div className="question-content">
                      <p>{query.question}</p>
                    </div>
                  </div>

                  {/* Reply Section */}
                  <div className="card-interaction-section">
                    {query.status === 'Answered' || query.status === 'Resolved' ? (
                      <div className="answered-section">
                        <div className="reply-header">
                          <h4>Trainee Reply</h4>
                          {query.repliedAt && (
                            <div className="reply-timestamp">
                              <span>{formatTimeAgo(query.repliedAt)}</span>
                            </div>
                          )}
                        </div>
                        <div className="reply-content">
                          <p>{query.reply}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="pending-section">
                        <div className="reply-content" style={{ background: '#fffbeb', borderRadius: '8px', padding: '12px' }}>
                          <p style={{ color: '#92400e', margin: 0, fontSize: '0.9rem' }}>
                            ⏳ Waiting for trainee response...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="card-footer">
                    <div className="query-id">#{query._id.slice(-6)}</div>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '600', padding: '2px 10px',
                      borderRadius: '20px',
                      background: query.status === 'Resolved' ? '#f0fdf4' : query.status === 'Answered' ? '#eff6ff' : '#fef2f2',
                      color: query.status === 'Resolved' ? '#16a34a' : query.status === 'Answered' ? '#2563eb' : '#ef4444'
                    }}>
                      {query.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="queries-pagination">
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="queries-pagination-btn">
              <FaChevronLeft />
            </button>
            <span className="queries-pagination-info">Page {currentPage} of {pagination.totalPages}</span>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.totalPages} className="queries-pagination-btn">
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantQueries;