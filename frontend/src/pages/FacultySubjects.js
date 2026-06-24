import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { FaBook, FaArrowRight } from 'react-icons/fa';
import '../styles/facultySubjects.css';

import brochureUrl from "../assets/Brochures/WhatsApp Image 2026-06-17 at 2.16.39 PM.pdf";

const FacultySubjects = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // const [showBrochure,setShowBrochure] = useState(false);


  const getTeacherData = () => {
    try {
      const t = localStorage.getItem('teacher');
      if (t) return JSON.parse(t);
      const u = localStorage.getItem('user');
      if (u) { const p = JSON.parse(u); return { ...p, id: p._id || p.id }; }
      return null;
    } catch { return null; }
  };

  const teacher = getTeacherData();
  const teacherId = teacher?._id || teacher?.id;

  useEffect(() => {
    const fetchAssignedCourses = async () => {
      if (!teacherId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/courses/teacher/${teacherId}`);
        if (response.status === 200) {
          setCourses(response.data.courses || []);
        }
      } catch (error) {
        console.error('Failed to fetch assigned courses:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedCourses();
  }, [teacherId]);

  const handleViewDetails = (course) => {
    navigate('/subject-details', { state: { subjectName: course.courseName, course } });
  };

  if (loading) {
    return (
      <div className="student-subjects-wrapper">
        <div className="student-subjects-header">
          <h2 className="student-subjects-title">My Subjects</h2>
          <p className="student-subjects-description">Loading your assigned courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-subjects-wrapper">
      <div className="student-subjects-header">
        <h2 className="student-subjects-title">My Subjects</h2>
        <p className="student-subjects-description">View subject details and manage study materials</p>
      </div>

      <div className="career-banner">
        <div className="career-banner-content">
          <h3>🚀 Career Development Program</h3>
          <p>
            Interview Coaching, SDLC Real-Time Experience,
            Mock Interviews, Resume Building and Career Guidance.
          </p>
        </div>

        <div className="career-banner-actions">
          <button
            className="brochure-btn"
            onClick={() => window.open(brochureUrl, "_blank")}
            // onClick={() => setShowBrochure(true)}
          >
            📄 View Brochure
          </button>

          <a href={brochureUrl} download>
            <button className="download-btn">
              📥 Download Brochure
            </button>
          </a>
        </div>
      </div>

      <div className="student-subjects-info-card">
        <div className="student-subjects-info">
          <p className="student-subjects-count">{courses.length} Subjects Assigned</p>
        </div>
      </div>

      <div className="student-subjects-list">
        {courses.length === 0 ? (
          <div className="student-subjects-no-data">
            <p>No courses assigned yet. Contact admin to assign courses.</p>
          </div>
        ) : (
          courses.map((course, idx) => (
            <div className="student-subjects-card-horizontal" key={course.courseCode || idx}>

              <div className="student-subjects-content-section">
                <div className="student-subjects-content-header">
                  <div className="student-subjects-title-section">
                    <h3 className="student-subjects-name-horizontal">{course.courseName}</h3>
                    <span className="course-code-display">{course.courseCode}</span>
                  </div>
                </div>

                <div className="student-subjects-normal-info">
                  <p className="subject-description">
                    {course.description || 'No description available.'}
                  </p>
                  <div className="course-details-row">
                    {course.duration && (
                      <div className="course-detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">{course.duration}</span>
                      </div>
                    )}
                    {course.level && (
                      <div className="course-detail-item">
                        <span className="detail-label">Level:</span>
                        <span className="detail-value">{course.level}</span>
                      </div>
                    )}
                    {course.courseType && (
                      <div className="course-detail-item">
                        <span className="detail-label">Course Type:</span>
                        <span className="detail-value">{course.courseType}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="student-subjects-actions-horizontal">
                  <button
                    className="student-subjects-join-btn-horizontal"
                    onClick={() => handleViewDetails(course)}
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
                  >
                    <FaBook className="btn-icon" />
                    <span>View Details</span>
                    <FaArrowRight className="btn-arrow" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FacultySubjects;