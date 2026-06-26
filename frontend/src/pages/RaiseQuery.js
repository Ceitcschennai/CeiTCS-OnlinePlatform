import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/studentQueries.css';


const RaiseQuery = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [queries, setQueries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingQueries, setFetchingQueries] = useState(true);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [error, setError] = useState('');
  
  // Get current student data
  const getUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedData = JSON.parse(userData);
        return parsedData.student || parsedData;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };

  const student = getUserData();
  const currentStudentId =
    student?._id ||
    student?.id ||
    localStorage.getItem('studentId') ||
    localStorage.getItem('userId');
  const currentStudentName = student?.firstName && student?.lastName 
    ? `${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim()
    : localStorage.getItem('studentName') || localStorage.getItem('userName') || 'Student';
  const currentStudentClass = (student?.class || localStorage.getItem('studentClass') || localStorage.getItem('userClass') || '10').toString().replace(/^Class\s*/i, '');

// Fetch subjects from backend
   const fetchSubjects = useCallback(async () => {
     try {
       setFetchingSubjects(true);
       setError('');
      
       const response = await axios.get(`${API_BASE_URL}/api/subjects`);
      
       if (response.status === 200 && response.data.subjects) {
         const subjectNames = response.data.subjects.map(subject => subject.name);
         setSubjects([...new Set(subjectNames)]);
       } else {
         setError('Failed to load subjects');
         setSubjects([]);
       }
     } catch (error) {
       console.error('Failed to fetch subjects:', error);
       setError('Failed to load subjects. Please refresh the page.');
       // Set empty array instead of dummy data
       setSubjects([]);
     } finally {
       setFetchingSubjects(false);
     }
   }, []);

// Fetch student's queries
   const fetchStudentQueries = useCallback(async () => {
     if (!currentStudentId) {
       setError('Student ID not found. Please log in again.');
       setFetchingQueries(false);
       return;
     }

     try {
       setFetchingQueries(true);
       setError('');

       console.log("Student:", student);
       console.log("Student ID:", currentStudentId);

       const response = await axios.get(`${API_BASE_URL}/api/queries/student/${currentStudentId}`);

       if (response.status === 200) {
         setQueries(response.data.queries || []);
       } else {
         setError('Failed to load your queries');
         setQueries([]);
       }
     } catch (error) {
       console.error('Failed to fetch queries:', error);
       
       if (error.response?.status === 404) {
         // Student has no queries yet - this is normal
         setQueries([]);
       } else {
         setError('Failed to load your queries. Please refresh the page.');
         setQueries([]);
       }
     } finally {
       setFetchingQueries(false);
     }
   }, [currentStudentId, student]);

// Load data on component mount
   useEffect(() => {
    fetchSubjects();
    fetchStudentQueries();
  }, [fetchSubjects, fetchStudentQueries]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject || !message.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (!currentStudentId) {
      alert('Student ID not found. Please log in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newQuery = {
        studentId: currentStudentId,
        studentName: currentStudentName,
        studentClass: currentStudentClass,
        subject,
        question: message.trim(),
        priority
      };
      console.log("Submitting Query:", {
        studentId: currentStudentId,
        studentName: currentStudentName,
        studentClass: currentStudentClass,
        subject,
        question: message.trim(),
        priority
      });

      const response = await axios.post(`${API_BASE_URL}/api/queries`, newQuery);

      if (response.status === 201) {
        // Reset form
        setSubject('');
        setMessage('');
        setPriority('Medium');
        
        // Refresh the queries list
        await fetchStudentQueries();
        
        alert('Query submitted successfully! Our teachers will respond soon.');
      } else {
        throw new Error('Failed to submit query');
      }
    } catch (error) {
      console.error('Error submitting query:', error);
      
      if (error.response?.status === 400) {
        alert('Please check your input and try again.');
      } else if (error.response?.status === 401) {
        alert('Session expired. Please log in again.');
      } else {
        alert('Failed to submit query. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#ff9800';
      case 'Answered': return '#2196f3';
      case 'Resolved': return '#4caf50';
      default: return '#757575';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return '#4caf50';
      case 'Medium': return '#ff9800';
      case 'High': return '#f44336';
      case 'Urgent': return '#9c27b0';
      default: return '#757575';
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

  const handleRefresh = () => {
    fetchSubjects();
    fetchStudentQueries();
  };

  return (
    <div className="student-query-page">
      <div className="query-header">
        <h2>Ask Your Doubts</h2>
        <p>Get help from our expert teachers</p>
        {error && (
          <div style={{ 
            color: '#f44336', 
            fontSize: '0.9rem', 
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>{error}</span>
            <button 
              onClick={handleRefresh}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="query-form-container">
        <form className="modern-query-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Subject *</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={fetchingSubjects}
              >
                <option value="">
                  {fetchingSubjects ? 'Loading subjects...' : 'Select Subject'}
                </option>
                {subjects.map((subj, index) => (
                  <option key={index} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
              {fetchingSubjects && (
                <small style={{ color: '#666', fontSize: '0.8rem' }}>
                  Loading available subjects...
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={loading}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Your Question *</label>
            <textarea
              placeholder="Describe your doubt or question in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows="5"
              disabled={loading}
              maxLength={1000}
            ></textarea>
            <small style={{ color: '#666', fontSize: '0.8rem' }}>
              {message.length}/1000 characters
            </small>
          </div>

          <button 
            type="submit" 
            className="query-submit-btn" 
            disabled={loading || fetchingSubjects || !subjects.length}
          >
            {loading ? 'Submitting...' : 'Submit Query'}
          </button>
        </form>
      </div>

      <div className="queries-section">
        <div className="section-header">
          <h3>Your Queries</h3>
          <p className="section-subtitle">Track your doubts and get expert answers</p>
          {!fetchingQueries && queries.length > 0 && (
            <button 
              onClick={fetchStudentQueries}
              style={{
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Refresh
            </button>
          )}
        </div>
        
        <div className="query-list">
          {fetchingQueries ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading your queries...</p>
            </div>
          ) : queries.length === 0 ? (
            <div className="no-queries">
              <div className="empty-state">
                <div className="empty-icon">?</div>
                <h4>No queries yet!</h4>
                <p>Submit your first question above to get started</p>
              </div>
            </div>
          ) : (
            queries.map((q) => (
              <div className="elegant-query-card" key={q._id}>
                <div className="card-header">
                  <div className="query-subject-badge">
                    <span className="subject-name">{q.subject}</span>
                  </div>
                  
                  <div className="card-meta">
                    <div className="badges-container">
                      <span 
                        className={`status-chip ${q.status.toLowerCase()}`}
                        style={{ backgroundColor: getStatusColor(q.status) }}
                      >
                        <span className="chip-dot"></span>
                        {q.status}
                      </span>
                      {q.priority && (
                        <span 
                          className={`priority-chip ${q.priority.toLowerCase()}`}
                          style={{ backgroundColor: getPriorityColor(q.priority) }}
                        >
                          {q.priority}
                        </span>
                      )}
                    </div>
                    <div className="time-stamp">
                      {formatTimeAgo(q.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="question-box">
                    <div className="question-header">
                      <span className="question-label">Your Question</span>
                    </div>
                    <div className="question-text">{q.question}</div>
                  </div>
                  
                  {q.reply ? (
                    <div className="reply-box">
                      <div className="reply-header">
                        <span className="reply-label">Teacher's Answer</span>
                        {q.teacherName && (
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            - {q.teacherName}
                          </span>
                        )}
                      </div>
                      <div className="reply-text">{q.reply}</div>
                      {q.repliedAt && (
                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                          Answered {formatTimeAgo(q.repliedAt)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="waiting-reply">
                      <span>Waiting for teacher's response...</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RaiseQuery;