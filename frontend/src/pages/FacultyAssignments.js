import React, { useState, useMemo, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/assignments.css';

const FacultyAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('All');
    const [sortBy, setSortBy] = useState('dueDate');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        totalSubmissions: 0,
        pendingSubmissions: 0,
        averageSubmissionRate: 0
    });
    const [newAssignment, setNewAssignment] = useState({
        subject: '',
        title: '',
        fromDate: '',
        dueDate: '',
        priority: 'Medium',
        description: '',
        totalStudents: 30
    });
    const [pdfFileName, setPdfFileName] = useState('');

    const getTraineeData = () => {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const parsedData = JSON.parse(userData);
                return parsedData.teacher || parsedData;
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
        return null;
    };

    const trainee = getTraineeData();
    const traineeId = trainee?.id || localStorage.getItem('teacherId') || localStorage.getItem('userId');
    const traineeName = trainee?.firstName && trainee?.lastName
        ? `${trainee.salutation || ''} ${trainee.firstName} ${trainee.lastName}`.trim()
        : localStorage.getItem('teacherName') || localStorage.getItem('userName') || 'Trainee';
    const traineeClass = (trainee?.class || localStorage.getItem('teacherClass') || localStorage.getItem('userClass') || '10').toString().replace(/^Class\s*/i, '');

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/assignments?teacherId=${traineeId}`);
            const data = await response.json();
            if (data.success) {
                setAssignments(data.assignments);
            } else {
                setAssignments([]);
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [traineeId]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/assignments/stats?teacherId=${traineeId}`);
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, [traineeId]);

    useEffect(() => {
        if (traineeId) {
            fetchAssignments();
            fetchStats();
        }
    }, [traineeId, fetchAssignments, fetchStats]);

    const subjects = [...new Set(assignments.map(item => item.subject))];

    const filteredAssignments = useMemo(() => {
        let filtered = assignments.filter(assignment => {
            const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                assignment.subject.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSubject = filterSubject === 'All' || assignment.subject === filterSubject;
            return matchesSearch && matchesSubject;
        });

        filtered.sort((a, b) => {
            if (sortBy === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate);
            if (sortBy === 'priority') {
                const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            if (sortBy === 'subject') return a.subject.localeCompare(b.subject);
            return 0;
        });

        return filtered;
    }, [assignments, searchTerm, filterSubject, sortBy]);

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        if (!newAssignment.title || !newAssignment.subject || !newAssignment.dueDate) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            setLoading(true);
            const assignmentData = {
                ...newAssignment,
                teacherId: traineeId,
                teacherName: traineeName,
                class: traineeClass
            };

            const response = await fetch(`${API_BASE_URL}/api/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignmentData)
            });

            const data = await response.json();
            if (data.success) {
                setNewAssignment({ subject: '', title: '', fromDate: '', dueDate: '', priority: 'Medium', description: '', totalStudents: 30 });
                setPdfFileName('');
                setShowCreateForm(false);
                await fetchAssignments();
                await fetchStats();
                alert('Assignment created successfully!');
            } else {
                alert('Failed to create assignment: ' + data.message);
            }
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Failed to create assignment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSubmission = async (assignment, submission) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/assignments/${assignment._id}/download/${submission._id}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = submission.fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Failed to download file');
            }
        } catch (error) {
            console.error('Error downloading submission:', error);
            alert('Failed to download file');
        }
    };

    const getDaysUntilDue = (dueDate) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getPriorityClass = (priority) => {
        const baseClass = 'assignment-priority-indicator';
        switch (priority) {
            case 'High': return `${baseClass} assignment-priority-indicator--high`;
            case 'Medium': return `${baseClass} assignment-priority-indicator--medium`;
            case 'Low': return `${baseClass} assignment-priority-indicator--low`;
            default: return baseClass;
        }
    };

    return (
        <div className="assignment-dashboard">
            {/* Header */}
            <div className="assignment-dashboard__header">
                <div className="assignment-dashboard__title-section">
                    <h1 className="assignment-dashboard__title">Assignment Management</h1>
                    <p className="assignment-dashboard__subtitle">Create, track, and manage student assignments</p>
                </div>

                <div className="assignment-stats">
                    <div className="assignment-stats__card assignment-stats__card--total">
                        <div className="assignment-stats__number">{stats.total}</div>
                        <div className="assignment-stats__label">Total Assignments</div>
                    </div>
                    <div className="assignment-stats__card assignment-stats__card--submitted">
                        <div className="assignment-stats__number">{stats.totalSubmissions}</div>
                        <div className="assignment-stats__label">Total Submissions</div>
                    </div>
                    <div className="assignment-stats__card assignment-stats__card--pending">
                        <div className="assignment-stats__number">{stats.pendingSubmissions}</div>
                        <div className="assignment-stats__label">Pending Submissions</div>
                    </div>
                    <div className="assignment-stats__card assignment-stats__card--progress">
                        <div className="assignment-stats__number">{stats.averageSubmissionRate}%</div>
                        <div className="assignment-stats__label">Avg. Submission Rate</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
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
                    <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="assignment-controls__filter-select">
                        <option value="All">All Subjects</option>
                        {subjects.map(subject => (<option key={subject} value={subject}>{subject}</option>))}
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="assignment-controls__filter-select">
                        <option value="dueDate">Sort by Due Date</option>
                        <option value="priority">Sort by Priority</option>
                        <option value="subject">Sort by Subject</option>
                    </select>
                    <button className="assignment-controls__create-btn" onClick={() => setShowCreateForm(true)} disabled={loading}>
                        {loading ? 'Loading...' : 'Create Assignment'}
                    </button>
                </div>
            </div>

            {/* Create Assignment Modal */}
            {showCreateForm && (
                <div className="assignment-modal-overlay" style={{ position: 'fixed', top: 50, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="assignment-modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '620px', maxHeight: '80vh', overflowY: 'auto', margin: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>Create New Assignment</h2>
                        <form onSubmit={handleCreateAssignment}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Subject *</label>
                                <input type="text" value={newAssignment.subject} onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })} className="assignment-controls__search-input" required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Title *</label>
                                <input type="text" value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} className="assignment-controls__search-input" required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>From Date *</label>
                                <input type="date" value={newAssignment.fromDate} onChange={(e) => setNewAssignment({ ...newAssignment, fromDate: e.target.value })} className="assignment-controls__search-input" required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Date *</label>
                                <input type="date" value={newAssignment.dueDate} onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })} className="assignment-controls__search-input" required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Priority</label>
                                <select value={newAssignment.priority} onChange={(e) => setNewAssignment({ ...newAssignment, priority: e.target.value })} className="assignment-controls__filter-select" style={{ width: '100%' }}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Total Students</label>
                                <input type="number" value={newAssignment.totalStudents} onChange={(e) => setNewAssignment({ ...newAssignment, totalStudents: parseInt(e.target.value) || 30 })} className="assignment-controls__search-input" min="1" max="100" />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description</label>
                                <textarea value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} className="assignment-controls__search-input" rows="4" style={{ resize: 'vertical' }} placeholder="Provide detailed instructions for the assignment..." />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{pdfFileName || 'No file chosen'}</span>
                                    <input id="assignmentPdf" type="file" accept=".pdf,application/pdf" hidden onChange={(e) => setPdfFileName(e.target.files[0]?.name || '')} />
                                    <label htmlFor="assignmentPdf" className="assignment-controls__create-btn" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>📤 Upload File</label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowCreateForm(false)} style={{ flex: 1, padding: '0.875rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }} disabled={loading}>Cancel</button>
                                <button type="submit" className="assignment-submit-btn" style={{ flex: 1 }} disabled={loading}>{loading ? 'Creating...' : 'Create Assignment'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading && assignments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem' }}><p>Loading assignments...</p></div>
            )}

            {/* Assignment Cards */}
            <div className="assignment-grid">
                {filteredAssignments.length === 0 && !loading ? (
                    <div className="assignment-empty-state">
                        <p>No assignments found matching your criteria.</p>
                        {assignments.length === 0 && (
                            <button className="assignment-submit-btn" onClick={() => setShowCreateForm(true)} style={{ marginTop: '1rem' }}>
                                Create Your First Assignment
                            </button>
                        )}
                    </div>
                ) : (
                    filteredAssignments.map((assignment) => {
                        const daysUntilDue = getDaysUntilDue(assignment.dueDate);
                        const isOverdue = daysUntilDue < 0;
                        const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;
                        const submissionRate = Math.round((assignment.submissions.length / assignment.totalStudents) * 100);

                        return (
                            <div key={assignment._id} className={`assignment-card ${isOverdue ? 'assignment-card--overdue' : ''} ${isDueSoon ? 'assignment-card--due-soon' : ''}`}>
                                <div className="assignment-card__header">
                                    <div className="assignment-card__subject-badge">{assignment.subject}</div>
                                    <div className={getPriorityClass(assignment.priority)}>{assignment.priority}</div>
                                </div>
                                <div className="assignment-card__content">
                                    <h3 className="assignment-card__title">{assignment.title}</h3>
                                    <p className="assignment-card__description">{assignment.description}</p>
                                    <div className="assignment-card__meta">
                                        <div className="assignment-card__due-date">
                                            <strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}
                                            {isOverdue && <span className="assignment-card__overdue-text">({Math.abs(daysUntilDue)} days overdue)</span>}
                                            {isDueSoon && !isOverdue && <span className="assignment-card__due-soon-text">({daysUntilDue} days left)</span>}
                                        </div>
                                        <div className="assignment-card__due-date"><strong>Created:</strong> {new Date(assignment.createdAt).toLocaleDateString()}</div>
                                        <div className="assignment-card__due-date"><strong>Submissions:</strong> {assignment.submissions.length}/{assignment.totalStudents} ({submissionRate}%)</div>
                                    </div>
                                    <div className={`assignment-status-badge ${submissionRate === 100 ? 'assignment-status-badge--submitted' : submissionRate > 50 ? 'assignment-status-badge--progress' : 'assignment-status-badge--pending'}`}>
                                        {submissionRate === 100 ? 'All Submitted' : submissionRate > 0 ? 'Partially Submitted' : 'No Submissions'}
                                    </div>
                                </div>
                                {assignment.submissions.length > 0 && (
                                    <div className="assignment-card__submission">
                                        <h4 style={{ marginBottom: '1rem', color: '#1f2937', fontSize: '1rem' }}>Recent Submissions:</h4>
                                        {assignment.submissions.slice(0, 3).map((submission, idx) => (
                                            <div key={submission._id || idx} className="assignment-selected-file" style={{ marginBottom: '0.5rem' }}>
                                                <div>
                                                    <div className="assignment-selected-file__name">{submission.studentName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{submission.fileName} • {submission.fileSize} MB • {new Date(submission.submittedDate).toLocaleDateString()}</div>
                                                </div>
                                                <button onClick={() => handleDownloadSubmission(assignment, submission)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>Download</button>
                                            </div>
                                        ))}
                                        {assignment.submissions.length > 3 && (
                                            <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', margin: '0.5rem 0 0 0' }}>+{assignment.submissions.length - 3} more submissions</p>
                                        )}
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

export default FacultyAssignments;