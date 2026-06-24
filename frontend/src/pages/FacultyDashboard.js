import React, { useState, useEffect } from "react";
import API_BASE_URL from "../config/api";
import {
  FaTasks,
  FaUserCheck,
  FaQuestionCircle,
  FaChartLine,
  FaClock,
  FaClipboardList,
  FaGraduationCap,
  FaBook,
} from "react-icons/fa";
import "../styles/facultyDashboard.css";

const FacultyDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    assignmentsToReview: 0,
    pendingQueries: 0,
    upcomingClasses: 0,
    attendanceRate: 0,
    activeClasses: 0,
    assignedSubjects: 0,
  });
  const [traineeInfo, setTraineeInfo] = useState({
    name: "",
    classes: [],
    subjects: [],
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageAssignmentScore: 0,
    classParticipation: 0,
    assignmentSubmissionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const fetchDashboardData = async (traineeId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/${traineeId}/dashboard`
      );

      if (!response.ok) throw new Error("Failed to fetch dashboard data");

      const data = await response.json();
      setStats(data.stats || {});
      setTraineeInfo(data.teacherInfo || {});
      setRecentActivities(data.recentActivities || []);
      setPerformanceMetrics(data.performanceMetrics || {});
      setError("");
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchDashboardData(user._id);
      const interval = setInterval(() => fetchDashboardData(user._id), 300000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="teacher-dashboard">
        <div className="teacher-loading-container">
          <div className="teacher-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard">
        <div className="teacher-error-container">
          <p className="teacher-error-message">{error}</p>
          <button onClick={() => fetchDashboardData(user?._id)} className="teacher-retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      {/* Header */}
      <div className="teacher-dashboard-header">
        <div className="teacher-welcome-section">
          <div className="teacher-welcome-text">
            <h1>Welcome back, Faculty!</h1>
            <p>Manage your classes and help students succeed</p>

            {traineeInfo.classes?.length > 0 && (
              <div className="teacher-assignment-info">
                <span className="teacher-assignment-detail">
                  <FaGraduationCap /> Classes: {traineeInfo.classes.join(", ")}
                </span>
                <span className="teacher-assignment-detail">
                  <FaBook /> Subjects: {traineeInfo.subjects.join(", ")}
                </span>
              </div>
            )}
          </div>

          <div className="teacher-header-stats">
            <div className="teacher-stat-item">
              <span className="teacher-stat-number">{stats.totalStudents}</span>
              <span className="teacher-stat-label">Students</span>
            </div>
            <div className="teacher-stat-item">
              <span className="teacher-stat-number">{stats.attendanceRate}%</span>
              <span className="teacher-stat-label">Attendance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="teacher-stats-grid">
        <div className="teacher-stat-card teacher-primary">
          <div className="teacher-stat-content">
            <div className="teacher-stat-info">
              <h4>{stats.assignmentsToReview}</h4>
              <p>Assignments to Review</p>
            </div>
          </div>
          <div className="teacher-stat-footer">
            <span className="teacher-stat-change teacher-negative">
              {stats.assignmentsToReview > 0 ? "Pending review" : "All caught up!"}
            </span>
          </div>
        </div>

        <div className="teacher-stat-card teacher-warning">
          <div className="teacher-stat-content">
            <div className="teacher-stat-info">
              <h4>{stats.pendingQueries}</h4>
              <p>Student Queries</p>
            </div>
          </div>
          <div className="teacher-stat-footer">
            <span className="teacher-stat-change">
              {stats.pendingQueries > 0 ? "Awaiting response" : "No pending queries"}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="teacher-dashboard-section">
        <h3 className="teacher-section-title">
          <FaClock className="teacher-section-icon" />
          Recent Activities
        </h3>
        <div className="teacher-activities-list">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="teacher-activity-item">
                <div className={`teacher-activity-icon teacher-${activity.type}`}>
                  {activity.type === "assignment" && <FaTasks />}
                  {activity.type === "attendance" && <FaUserCheck />}
                  {activity.type === "student" && <FaQuestionCircle />}
                  {activity.type === "class" && <FaClipboardList />}
                </div>
                <div className="teacher-activity-content">
                  <p className="teacher-activity-text">{activity.activity}</p>
                  <span className="teacher-activity-time">{activity.time}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="teacher-no-activities">
              <p>No recent activities</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Overview */}
      <div className="teacher-dashboard-section">
        <h3 className="teacher-section-title">
          <FaChartLine className="teacher-section-icon" />
          Class Performance
        </h3>
        <div className="teacher-performance-grid">
          <div className="teacher-performance-item">
            <h4>Average Assignment Score</h4>
            <div className="teacher-performance-value">
              {performanceMetrics.averageAssignmentScore}%
            </div>
            <div className="teacher-performance-bar">
              <div
                className="teacher-performance-fill"
                style={{ width: `${performanceMetrics.averageAssignmentScore}%` }}
              ></div>
            </div>
          </div>

          <div className="teacher-performance-item">
            <h4>Class Participation</h4>
            <div className="teacher-performance-value">
              {performanceMetrics.classParticipation}%
            </div>
            <div className="teacher-performance-bar">
              <div
                className="teacher-performance-fill"
                style={{ width: `${performanceMetrics.classParticipation}%` }}
              ></div>
            </div>
          </div>

          <div className="teacher-performance-item">
            <h4>Assignment Submission Rate</h4>
            <div className="teacher-performance-value">
              {performanceMetrics.assignmentSubmissionRate}%
            </div>
            <div className="teacher-performance-bar">
              <div
                className="teacher-performance-fill"
                style={{ width: `${performanceMetrics.assignmentSubmissionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;