import React, { useState, useMemo, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/assignments.css';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [sortBy, setSortBy] = useState('dueDate');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({});

  // Get student data from localStorage
  const getStudentData = () => {
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

  const student = getStudentData();
  const studentId = student?.id || localStorage.getItem('studentId') || localStorage.getItem('userId');
  const studentName = student?.firstName && student?.lastName 
    ? `${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim()
    : localStorage.getItem('studentName') || localStorage.getItem('userName') || 'Student';
  const studentClass = (student?.class || localStorage.getItem('studentClass') || localStorage.getItem('userClass') || '10').toString().replace(/^Class\s*/i, '');

  // Fetch assignments from backend
  const fetchAssignments = useCallback(async () => {
  try {
    setLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/assignments/student/${studentId}?class=${studentClass}`);
    const data = await response.json();
    
    if (data.success) {
      // Transform backend data to match frontend structure
      const transformedAssignments = data.assignments.map(assignment => ({
        ...assignment,
        id: assignment._id,
        status: assignment.hasSubmitted ? 'Submitted' : 'Pending',
        submittedDate: assignment.submissionDate ? assignment.submissionDate.split('T')[0] : null
      }));
      setAssignments(transformedAssignments);
    } else {
      console.error('Failed to fetch assignments:', data.message);
      setAssignments([]);
    }
  } catch (error) {
    console.error('Error fetching assignments:', error);
    setAssignments([]);
  } finally {
    setLoading(false);
  }
}, [studentId, studentClass]); // Add dependencies here

// Now useEffect won't complain
useEffect(() => {
  if (studentId) {
    fetchAssignments();
  }
}, [studentId, fetchAssignments]);

  // Get unique subjects for filter dropdown
  const subjects = [...new Set(assignments.map(item => item.subject))];

  // Filtered and sorted assignments
  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || assignment.status === filterStatus;
      const matchesSubject = filterSubject === 'All' || assignment.subject === filterSubject;

      return matchesSearch && matchesStatus && matchesSubject;
    });

    // Sort assignments
    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === 'priority') {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      } else if (sortBy === 'subject') {
        return a.subject.localeCompare(b.subject);
      }
      return 0;
    });

    return filtered;
  }, [assignments, searchTerm, filterStatus, filterSubject, sortBy]);

  const handleFileChange = (e, assignmentId) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFiles({ ...selectedFiles, [assignmentId]: file });
    }
  };

  const handleSubmit = async (assignmentId) => {
    const file = selectedFiles[assignmentId];

    if (!file) {
      alert('Please select a file before submitting.');
      return;
    }

    try {
      setUploading({ ...uploading, [assignmentId]: true });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', studentId);
      formData.append('studentName', studentName);

      const response = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        const updatedAssignments = assignments.map(assignment =>
          assignment.id === assignmentId || assignment._id === assignmentId
            ? { 
                ...assignment, 
                status: 'Submitted', 
                submittedDate: new Date().toISOString().split('T')[0],
                hasSubmitted: true,
                submissionDate: new Date().toISOString(),
                submissionFile: file.name
              }
            : assignment
        );

        setAssignments(updatedAssignments);

        // Remove the selected file
        const updatedFiles = { ...selectedFiles };
        delete updatedFiles[assignmentId];
        setSelectedFiles(updatedFiles);

        alert('Assignment submitted successfully!');
      } else {
        alert('Failed to submit assignment: ' + data.message);
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setUploading({ ...uploading, [assignmentId]: false });
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadgeClass = (status) => {
    const baseClass = 'assignment-status-badge';
    switch (status) {
      case 'Submitted':
        return `${baseClass} assignment-status-badge--submitted`;
      case 'Pending':
        return `${baseClass} assignment-status-badge--pending`;
      case 'In Progress':
        return `${baseClass} assignment-status-badge--progress`;
      default:
        return baseClass;
    }
  };

  const getPriorityClass = (priority) => {
    const baseClass = 'assignment-priority-indicator';
    switch (priority) {
      case 'High':
        return `${baseClass} assignment-priority-indicator--high`;
      case 'Medium':
        return `${baseClass} assignment-priority-indicator--medium`;
      case 'Low':
        return `${baseClass} assignment-priority-indicator--low`;
      default:
        return baseClass;
    }
  };

  // Statistics
  const stats = {
    total: assignments.length,
    submitted: assignments.filter(a => a.status === 'Submitted').length,
    pending: assignments.filter(a => a.status === 'Pending').length,
    inProgress: assignments.filter(a => a.status === 'In Progress').length,
  };

  return (
    <div className="assignment-dashboard">
      {/* Header Section */}
      <div className="assignment-dashboard__header">
        <div className="assignment-dashboard__title-section">
          <h1 className="assignment-dashboard__title">My Assignments</h1>
          <p className="assignment-dashboard__subtitle">
            Track, manage, and submit your assignments efficiently
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="assignment-stats">
          <div className="assignment-stats__card assignment-stats__card--total">
            <div className="assignment-stats__number">{stats.total}</div>
            <div className="assignment-stats__label">Total</div>
          </div>
          <div className="assignment-stats__card assignment-stats__card--submitted">
            <div className="assignment-stats__number">{stats.submitted}</div>
            <div className="assignment-stats__label">Submitted</div>
          </div>
          <div className="assignment-stats__card assignment-stats__card--pending">
            <div className="assignment-stats__number">{stats.pending}</div>
            <div className="assignment-stats__label">Pending</div>
          </div>
          <div className="assignment-stats__card assignment-stats__card--progress">
            <div className="assignment-stats__number">{stats.inProgress}</div>
            <div className="assignment-stats__label">In Progress</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="assignment-controls">
        <div className="assignment-controls__search">
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="assignment-controls__search-input"
          />
        </div>

        <div className="assignment-controls__filters">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="assignment-controls__filter-select"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Submitted">Submitted</option>
            <option value="In Progress">In Progress</option>
          </select>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="assignment-controls__filter-select"
          >
            <option value="All">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="assignment-controls__filter-select"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="subject">Sort by Subject</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && assignments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading assignments...</p>
        </div>
      )}

      {/* Assignment Cards */}
      <div className="assignment-grid">
        {filteredAssignments.length === 0 && !loading ? (
          <div className="assignment-empty-state">
            <p>
              {assignments.length === 0 
                ? 'No assignments have been created yet.' 
                : 'No assignments found matching your criteria.'
              }
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment, idx) => {
            const daysUntilDue = getDaysUntilDue(assignment.dueDate);
            const isOverdue = daysUntilDue < 0 && assignment.status !== 'Submitted';
            const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0 && assignment.status !== 'Submitted';
            const assignmentId = assignment.id || assignment._id;
            const isUploading = uploading[assignmentId];

            return (
              <div
                key={assignmentId}
                className={`assignment-card ${isOverdue ? 'assignment-card--overdue' : ''} ${isDueSoon ? 'assignment-card--due-soon' : ''}`}
              >
                <div className="assignment-card__header">
                  <div className="assignment-card__subject-badge">
                    {assignment.subject}
                  </div>
                  <div className={getPriorityClass(assignment.priority)}>
                    {assignment.priority}
                  </div>
                </div>

                <div className="assignment-card__content">
                  <h3 className="assignment-card__title">{assignment.title}</h3>
                  <p className="assignment-card__description">{assignment.description}</p>

                  <div className="assignment-card__meta">
                    <div className="assignment-card__due-date">
                      <strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}
                      {isOverdue && (
                        <span className="assignment-card__overdue-text">
                          ({Math.abs(daysUntilDue)} days overdue)
                        </span>
                      )}
                      {isDueSoon && !isOverdue && (
                        <span className="assignment-card__due-soon-text">
                          ({daysUntilDue} days left)
                        </span>
                      )}
                    </div>

                    {assignment.submittedDate && (
                      <div className="assignment-card__submitted-date">
                        <strong>Submitted:</strong> {new Date(assignment.submittedDate).toLocaleDateString()}
                      </div>
                    )}

                    <div className="assignment-card__created-date">
                      <strong>Created:</strong> {new Date(assignment.createdAt || assignment.createdDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className={getStatusBadgeClass(assignment.status)}>
                    {assignment.status}
                  </div>
                </div>

                {assignment.status === 'Pending' && (
                  <div className="assignment-card__submission">
                    <div className="assignment-file-upload">
                      <input
                        type="file"
                        id={`file-${assignmentId}`}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.ppt,.pptx,.xls,.xlsx"
                        onChange={(e) => handleFileChange(e, assignmentId)}
                        className="assignment-file-upload__input"
                        disabled={isUploading}
                      />
                      <label
                        htmlFor={`file-${assignmentId}`}
                        className={`assignment-file-upload__label ${isUploading ? 'disabled' : ''}`}
                      >
                        {isUploading ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>

                    {selectedFiles[assignmentId] && (
                      <div className="assignment-selected-file">
                        <span className="assignment-selected-file__name">
                          {selectedFiles[assignmentId].name}
                        </span>
                        <span className="assignment-selected-file__size">
                          ({(selectedFiles[assignmentId].size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}

                    <button
                      className="assignment-submit-btn"
                      onClick={() => handleSubmit(assignmentId)}
                      disabled={!selectedFiles[assignmentId] || isUploading}
                    >
                      {isUploading ? 'Submitting...' : 'Submit Assignment'}
                    </button>
                  </div>
                )}

                {assignment.status === 'Submitted' && assignment.submissionFile && (
                  <div className="assignment-card__submitted-info">
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f0f9ff', 
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#0369a1'
                    }}>
                      <strong>Submitted file:</strong> {assignment.submissionFile}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Assignments;
