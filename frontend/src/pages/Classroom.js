import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/classroom.css';
import { FaPlay, FaCircle, FaSpinner, FaUsers, FaClock, FaChalkboardTeacher, FaVideo, FaExclamationTriangle, FaBookOpen } from 'react-icons/fa';
import { useLiveClass } from '../contexts/LiveClassContext';

// Image Imports
import Maths from '../assets/Maths.jpeg';
import Physics from '../assets/Physics.jpeg';
import Chemistry from '../assets/Chemistry.jpeg';
import English from '../assets/English.jpeg';
import Tamil from '../assets/Tamil.jpeg';
import Science from '../assets/Science.jpeg';
import Social from '../assets/Social.jpeg';
import Zoology from '../assets/Zoology.jpeg';
import Botany from '../assets/Botany.jpeg';
import Geography from '../assets/Geography.jpeg';
import History from '../assets/History.jpeg';
import Economics from '../assets/Economics.jpeg';
import Hindi from '../assets/Hindi.jpeg';
import ComputerScience from '../assets/ComputerScience.jpeg';
import Accounts from '../assets/Accounts.jpeg';

const Classroom = () => {
  const navigate = useNavigate();
  const { liveClasses, joinClass } = useLiveClass();
  const [joiningClass, setJoiningClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get student data from localStorage
  const getStudentData = () => {
    try {
      let studentData = localStorage.getItem('student');
      
      if (studentData) {
        return JSON.parse(studentData);
      }
      
      // Fallback: check if data is stored under 'user' key
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        
        if (parsedUserData.student) {
          localStorage.setItem('student', JSON.stringify(parsedUserData.student));
          return parsedUserData.student;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing student data from localStorage:', error);
      return null;
    }
  };

  const student = getStudentData();

  console.log('Student data:', student);
  console.log('All live classes:', liveClasses);

  // Image mapping
  const imageMap = {
    'Mathematics': Maths,
    'Physics': Physics,
    'Chemistry': Chemistry,
    'English': English,
    'Tamil': Tamil,
    'Science': Science,
    'Social': Social,
    'Zoology': Zoology,
    'Botany': Botany,
    'Geography': Geography,
    'History': History,
    'Economics': Economics,
    'Hindi': Hindi,
    'Computer Science': ComputerScience,
    'Accounts': Accounts
  };

  // Get live classes for student's class
  const getStudentLiveClasses = () => {
    if (!student || !student.class) return [];
    
    const studentLiveClasses = liveClasses.filter(liveClass => 
      liveClass.class === student.class && liveClass.isLive
    );

    console.log(`Live classes for class ${student.class}:`, studentLiveClasses);
    
    return studentLiveClasses;
  };

  // Handle joining live class
  const handleJoinLiveClass = async (liveClass) => {
    setJoiningClass(liveClass.id);
    
    try {
      await joinClass(liveClass);
      
      // Navigate to live class page after a brief delay
      setTimeout(() => {
        navigate('/live-class');
      }, 1000);
      
    } catch (error) {
      console.error('Error joining live class:', error);
      alert('Failed to join live class. Please try again.');
    } finally {
      setJoiningClass(null);
    }
  };

  // Handle login redirect
  const handleLoginRedirect = () => {
    localStorage.clear();
    navigate('/login');
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
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  useEffect(() => {
    // Check for student data
    if (!student || !student.class) {
      setError('Student information not found. Please login again.');
      setLoading(false);
      return;
    }
    
    setError(null);
    setLoading(false);
  }, [student]);

  const studentLiveClasses = getStudentLiveClasses();

  if (loading) {
    return (
      <div className="classroom-wrapper">
        <div className="classroom-loading">
          <FaSpinner className="classroom-loading-spinner" />
          <p className="classroom-loading-text">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="classroom-wrapper">
        <div className="classroom-error">
          <FaExclamationTriangle className="classroom-error-icon" />
          <h3 className="classroom-error-title">Unable to Load Classroom</h3>
          <p className="classroom-error-message">{error}</p>
          <div className="classroom-error-actions">
            <button onClick={() => window.location.reload()} className="classroom-btn-primary">
              Try Again
            </button>
            <button onClick={handleLoginRedirect} className="classroom-btn-secondary">
              Login Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="classroom-wrapper">
      <div className="classroom-header">
        <div className="classroom-title-section">
          <h1 className="classroom-title">
            <FaVideo className="classroom-title-icon" />
            Live Classroom
          </h1>
          <p className="classroom-subtitle">Join live classes happening right now</p>
        </div>

        {student && (
          <div className="classroom-student-info">
            <div className="classroom-student-card">
              <h4 className="classroom-student-name">Welcome, {student.name || 'Student'}</h4>
              <p className="classroom-student-class">Class {student.class}</p>
            </div>
          </div>
        )}
      </div>

      {studentLiveClasses.length > 0 ? (
        <div className="classroom-content">
          <div className="classroom-stats">
            <div className="classroom-stat">
              <FaVideo className="classroom-stat-icon" />
              <span className="classroom-stat-number">{studentLiveClasses.length}</span>
              <span className="classroom-stat-label">Live Classes</span>
            </div>
            <div className="classroom-stat">
              <FaChalkboardTeacher className="classroom-stat-icon" />
              <span className="classroom-stat-number">
                {new Set(studentLiveClasses.map(cls => cls.teacherId)).size}
              </span>
              <span className="classroom-stat-label">Teachers Online</span>
            </div>
            <div className="classroom-stat">
              <FaBookOpen className="classroom-stat-icon" />
              <span className="classroom-stat-number">
                {new Set(studentLiveClasses.map(cls => cls.subject)).size}
              </span>
              <span className="classroom-stat-label">Subjects Available</span>
            </div>
          </div>

          <div className="classroom-live-classes">
            <h3 className="classroom-section-title">
              <FaCircle className="classroom-live-dot" />
              Live Classes for Class {student.class}
            </h3>

            <div className="classroom-classes-grid">
              {studentLiveClasses.map((liveClass, index) => {
                const isJoining = joiningClass === liveClass.id;
                const subjectImage = imageMap[liveClass.subject] || imageMap['Science'];

                return (
                  <div key={liveClass.id} className="classroom-live-card">
                    <div className="classroom-card-header">
                      <div className="classroom-card-image">
                        <img src={subjectImage} alt={liveClass.subject} />
                        <div className="classroom-card-overlay">
                          <div className="classroom-live-indicator">
                            <FaCircle className="classroom-live-pulse" />
                            <span>LIVE</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="classroom-card-content">
                      <div className="classroom-card-info">
                        <h4 className="classroom-subject-name">{liveClass.subject}</h4>
                        <p className="classroom-teacher-name">
                          <FaChalkboardTeacher className="classroom-teacher-icon" />
                          {liveClass.teacher}
                        </p>
                      </div>

                      <div className="classroom-class-details">
                        <div className="classroom-detail-item">
                          <FaClock className="classroom-detail-icon" />
                          <span>Started: {getFormattedTime(liveClass.startTime)}</span>
                        </div>
                        <div className="classroom-detail-item">
                          <span className="classroom-duration-badge">
                            {getDurationSinceStart(liveClass.startTime)}
                          </span>
                        </div>
                        {liveClass.participants && liveClass.participants.length > 0 && (
                          <div className="classroom-detail-item">
                            <FaUsers className="classroom-detail-icon" />
                            <span>{liveClass.participants.length} students joined</span>
                          </div>
                        )}
                      </div>

                      <div className="classroom-card-actions">
                        <button
                          className="classroom-join-btn"
                          onClick={() => handleJoinLiveClass(liveClass)}
                          disabled={isJoining}
                        >
                          {isJoining ? (
                            <>
                              <FaSpinner className="classroom-spinning" />
                              Joining...
                            </>
                          ) : (
                            <>
                              <FaPlay className="classroom-play-icon" />
                              Join Class
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="classroom-card-glow"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="classroom-empty">
          <div className="classroom-empty-content">
            <FaVideo className="classroom-empty-icon" />
            <h3 className="classroom-empty-title">No Live Classes Right Now</h3>
            <p className="classroom-empty-message">
              No teachers are currently conducting live classes for Class {student.class}.
            </p>
            <div className="classroom-empty-suggestions">
              <h4>What you can do:</h4>
              <ul>
                <li>Check back in a few minutes</li>
                <li>Browse your subjects for recorded materials</li>
                <li>Contact your teachers for class schedule</li>
              </ul>
            </div>
            <button 
              className="classroom-btn-primary"
              onClick={() => navigate('/subjects')}
            >
              Go to My Subjects
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classroom;
