import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/subjects.css'; 
import { useNavigate } from 'react-router-dom';
import { FaBook, FaLaptopCode, FaCalculator, FaCircle, FaUsers, FaClock, FaArrowRight, FaVideo, FaBell } from 'react-icons/fa';
import { useLiveClass } from '../contexts/LiveClassContext';
import { joinJitsiMeeting } from '../utils/jitsiUtils';

// Image Imports
import PYTHON from '../assets/Python.webp';
import CSS from '../assets/Css.jpg';
import MERNSTACK from '../assets/MERN.webp';
import JAVA from '../assets/Java.jpg';
import SQL from '../assets/SQL.png';
import JAVASCRIPT from '../assets/Javascript.png';
import HTML from '../assets/HTML.png';
import Artificialintelligence from '../assets/AI.jpg';
import Cloudcomputing from '../assets/Cloudcomputing.jpg';
import Automationtesting from '../assets/Automation.jpg';
import DSA from '../assets/DSA.avif';
import Datascience from '../assets/DS.webp';

const subjects = [
  { name: 'PYTHON', image: PYTHON, icon: <FaBook /> },
  { name: 'CSS', image: CSS, icon: <FaBook /> },
  { name: 'MERN STACK', image: MERNSTACK, icon: <FaCalculator /> },
  { name: 'JAVA', image: JAVA, icon: <FaBook /> },
  { name: 'SQL', image: SQL, icon: <FaBook /> },
  { name: 'JAVASCRIPT', image: JAVASCRIPT, icon: <FaBook /> },
  { name: 'HTML', image: HTML, icon: <FaBook /> },
  { name: 'Artificialintelligence', image: Artificialintelligence, icon: <FaBook /> },
  { name: 'Cloudcomputing', image: Cloudcomputing, icon: <FaBook /> },
  { name: 'Automationtesting', image: Automationtesting, icon: <FaBook /> },
  { name: 'DSA', image: DSA, icon: <FaLaptopCode /> },
  { name: 'Datascience', image: Datascience, icon: <FaBook /> },
];

const Subjects = () => {
  const navigate = useNavigate();
  const { liveClasses, joinClass } = useLiveClass();
  const [joiningClass, setJoiningClass] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const student = JSON.parse(localStorage.getItem('student') || '{}');

  // Get student data
  const getStudentData = () => {
    try {
      const studentData = localStorage.getItem('student');
      if (studentData) {
        return JSON.parse(studentData);
      }
      return null;
    } catch (error) {
      console.error('Error getting student data:', error);
      return null;
    }
  };

  const getCurrentEmployeeId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user._id || user.id || null;
    } catch {
      return null;
    }
  };

  const getLiveClassForSubject = (subjectName) => {
    return liveClasses.find(liveClass => 
      liveClass.subject === subjectName && 
      liveClass.class === student.class &&
      liveClass.isLive
    );
  };

  // Notify backend when student joins
  const notifyJoinClass = async (liveClass, studentData) => {
    try {
      console.log('Notifying backend of student join:', {
        classId: liveClass.id,
        studentId: studentData._id || studentData.id,
        studentName: `${studentData.firstName} ${studentData.lastName}`.trim(),
        studentEmail: studentData.email
      });

      const response = await axios.post(`${API_BASE_URL}/api/live-classes/join`, {
        classId: liveClass.id,
        studentId: studentData._id || studentData.id,
        studentName: `${studentData.firstName} ${studentData.lastName}`.trim(),
        studentEmail: studentData.email
      });

      if (response.data.success) {
        console.log('✅ Backend notified successfully:', response.data);
        
        // Store the classId and studentId in localStorage
        localStorage.setItem('currentLiveClassId', liveClass.id);
        localStorage.setItem('currentStudentId', studentData._id || studentData.id);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error notifying backend of join:', error);
      return false;
    }
  };

  // Notify backend when student leaves
  const notifyLeaveClass = async (classId, studentId) => {
    try {
      console.log('Notifying backend of student leave:', { classId, studentId });

      const response = await axios.post(`${API_BASE_URL}/api/live-classes/leave`, {
        classId,
        studentId
      });

      if (response.data.success) {
        console.log('✅ Leave notification sent successfully');
        
        // Clean up localStorage
        localStorage.removeItem('currentLiveClassId');
        localStorage.removeItem('currentStudentId');
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error notifying backend of leave:', error);
      return false;
    }
  };

  // Handle joining live class
  const handleJoinLiveClass = async (subject) => {
    const liveClass = getLiveClassForSubject(subject.name);
    const studentData = getStudentData();
    
    if (!liveClass || !liveClass.roomName) {
      alert('Unable to join class. Meeting room not available.');
      return;
    }

    if (!studentData) {
      alert('Student information not found. Please login again.');
      return;
    }

    // Show confirmation
    const confirmJoin = window.confirm(
      `Join live class for ${subject.name}?\nTeacher: ${liveClass.teacher}\n\nThis will open the meeting in a new window.`
    );
    
    if (!confirmJoin) return;

    setJoiningClass(true);

    try {
      // 1. Notify backend that student is joining
      const joinSuccess = await notifyJoinClass(liveClass, studentData);
      
      if (!joinSuccess) {
        alert('Failed to join class. Please try again.');
        setJoiningClass(false);
        return;
      }

      // 2. Update context
      joinClass(liveClass);

      // 3. Open Jitsi in NEW WINDOW (with classId)
      const displayName = `${studentData.firstName} ${studentData.lastName} (Student)`;
      const success = joinJitsiMeeting(liveClass.roomName, displayName, liveClass.id);
      
      if (!success) {
        alert('Failed to open meeting window. Please enable popups.');
      } else {
        console.log('✅ Jitsi meeting window opened successfully');
      }
      
    } catch (error) {
      console.error('Error joining class:', error);
      alert('An error occurred while joining the class.');
    } finally {
      setJoiningClass(false);
    }
  };

  // Listen for Jitsi window close event
  useEffect(() => {
    const handleJitsiWindowClosed = async (event) => {
      const classId = localStorage.getItem('currentLiveClassId');
      const studentId = localStorage.getItem('currentStudentId');
      
      if (classId && studentId) {
        await notifyLeaveClass(classId, studentId);
      }
    };

    window.addEventListener('jitsiWindowClosed', handleJitsiWindowClosed);

    return () => {
      window.removeEventListener('jitsiWindowClosed', handleJitsiWindowClosed);
    };
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleViewDetails = (subject) => {
    navigate('/subject-details', {
      state: {
        subjectName: subject.name, 
        teachers: [],
      },
    });
  };

  // Get live classes for student's class
  const getStudentLiveClasses = () => {
    if (!student || !student.class) return [];
    
    return liveClasses.filter(liveClass => 
      liveClass.class === student.class && liveClass.isLive
    );
  };

  const fetchNotifications = async () => {
    try {
      const employeeId = getCurrentEmployeeId();
      if (!employeeId) return;

      const [countRes, notificationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/notifications/courses/unread-count?employeeId=${employeeId}`),
        fetch(`${API_BASE_URL}/api/notifications/courses?employeeId=${employeeId}`)
      ]);

      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.count || 0);
      }

      if (notificationsRes.ok) {
        const notifData = await notificationsRes.json();
        setNotifications(notifData.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsViewed = async (notificationId) => {
    try {
      const employeeId = getCurrentEmployeeId();
      if (!employeeId) return;

      await fetch(`${API_BASE_URL}/api/notifications/courses/${notificationId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      });

      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, viewed: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  };

  const markAllAsViewed = async () => {
    try {
      const employeeId = getCurrentEmployeeId();
      if (!employeeId) return;

      await fetch(`${API_BASE_URL}/api/notifications/courses/view-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      });

      setNotifications(prev => prev.map(n => ({ ...n, viewed: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as viewed:', error);
    }
  };

  // Get formatted time
  const getFormattedTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get duration since start
  const getDurationSinceStart = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  const studentLiveClasses = getStudentLiveClasses();

  return (
    <div className="student-subjects-wrapper">
      <div className="student-subjects-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 className="student-subjects-title">Courses Available</h2>
            <p className="student-subjects-description">Join live classes or explore subject materials</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: '#fff',
                border: '1.5px solid #e5e7eb',
                borderRadius: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                position: 'relative',
                fontSize: '0.9rem',
                color: '#1f2937',
                fontWeight: '600'
              }}
            >
              <FaBell style={{ color: '#6b7280' }} />
              <span>Courses</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  marginLeft: '4px'
                }}>
                  +{unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                background: '#fff',
                border: '1.5px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                zIndex: 1000
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1f2937' }}>
                    New Courses Added
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsViewed}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}
                    >
                      Mark all as viewed
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                    No new courses
                  </div>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.viewed) {
                            markAsViewed(notification._id);
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'pointer',
                          background: notification.viewed ? '#fff' : '#f0f9ff',
                          borderLeft: notification.viewed ? '3px solid transparent' : '3px solid #2563eb',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '1rem', marginTop: '1px' }}>•</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1f2937' }}>
                            {notification.subjectName} course has been added
                          </span>
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        {!notification.viewed && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#2563eb',
                            marginTop: '6px'
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="student-subjects-info-card">
        <div className="student-subjects-info">
          <p className="student-subjects-count">{student?.class || 'N/A'} • {subjects.length} Courses Available</p>
        </div>
        
        {studentLiveClasses.length > 0 && (
          <div className="student-subjects-live-banner">
            <h3 className="student-subjects-live-title">🔴 Live Classes Available - 
              <span className="student-subjects-live-count">
                {studentLiveClasses.length} class(es) are currently live!
              </span>
            </h3>
          </div>
        )}
      </div>

      <div className="student-subjects-list">
        {subjects.map((subject, idx) => {
          const liveClass = getLiveClassForSubject(subject.name);
          const isLive = !!liveClass;
          
          return (
            <div className={`student-subjects-card-horizontal ${isLive ? 'student-subjects-live-card-horizontal' : ''}`} key={idx}>
              {/* Left Side - Image */}
              <div className="student-subjects-image-section">
                <div className="student-subjects-image-container-horizontal">
                  <img src={subject.image} alt={subject.name} className="student-subjects-image-horizontal" />
                  
                  {/* Live Indicator */}
                  {isLive && (
                    <div className="student-subjects-live-indicator-horizontal">
                      <FaCircle className="student-subjects-live-dot" />
                      <span className="student-subjects-live-text">LIVE</span>
                    </div>
                  )}
                  
                  {/* Subject Icon Overlay */}
                  <div className="student-subjects-icon-overlay">
                    <div className="student-subjects-icon-horizontal">{subject.icon}</div>
                  </div>
                </div>
              </div>

              {/* Right Side - Content */}
              <div className="student-subjects-content-section">
                <div className="student-subjects-content-header">
                  <div className="student-subjects-title-section">
                    <h3 className="student-subjects-name-horizontal">{subject.name}</h3>
                    {isLive && (
                      <div className="student-subjects-live-badge">
                        <FaCircle className="live-pulse-dot" />
                        <span>Live Now</span>
                      </div>
                    )}
                  </div>
                  
                  {!isLive && (
                    <div className="student-subjects-status-normal">
                      <span className="status-text">Available for Study</span>
                    </div>
                  )}
                </div>

                {/* Live Class Details */}
                {isLive && liveClass && (
                  <div className="student-subjects-live-info-horizontal">
                    <div className="student-subjects-live-meta">
                      <div className="live-meta-item">
                        <FaUsers className="live-meta-icon" />
                        <span><strong>Teacher:</strong> {liveClass.teacher}</span>
                      </div>
                      <div className="live-meta-item">
                        <FaClock className="live-meta-icon" />
                        <span><strong>Started:</strong> {getFormattedTime(liveClass.startTime)}</span>
                      </div>
                      <div className="live-meta-item">
                        <FaCircle className="live-meta-icon live-duration" />
                        <span><strong>Duration:</strong> {getDurationSinceStart(liveClass.startTime)}</span>
                      </div>
                      {liveClass.participants && liveClass.participants.length > 0 && (
                        <div className="live-meta-item">
                          <FaUsers className="live-meta-icon" />
                          <span><strong>Students Joined:</strong> {liveClass.participants.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Normal Subject Info for non-live classes */}
                {!isLive && (
                  <div className="student-subjects-normal-info">
                    <p className="subject-description">
                      Explore comprehensive study materials, practice exercises, and recorded lessons for {subject.name}.
                    </p>
                    <div className="subject-features">
                      <span className="feature-tag">Study Materials</span>
                      <span className="feature-tag">Practice Tests</span>
                      <span className="feature-tag">Video Lessons</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="student-subjects-actions-horizontal">
                  {isLive ? (
                    <button
                      className="student-subjects-join-btn-horizontal"
                      onClick={() => handleJoinLiveClass(subject)}
                      disabled={joiningClass}
                    >
                      <FaVideo className="btn-icon" />
                      <span>{joiningClass ? 'Joining...' : 'Join Live Class'}</span>
                      <FaArrowRight className="btn-arrow" />
                    </button>
                  ) : (
                    <button
                      className="student-subjects-details-btn-horizontal"
                      onClick={() => handleViewDetails(subject)}
                    >
                      <FaBook className="btn-icon" />
                      <span>View Details</span>
                      <FaArrowRight className="btn-arrow" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Subjects;
