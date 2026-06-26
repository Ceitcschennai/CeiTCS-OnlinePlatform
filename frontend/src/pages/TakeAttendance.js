import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaFilter,
  FaDownload,
  FaEye,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCalendarAlt,
  FaHistory
} from 'react-icons/fa';
import '../styles/takeAttendance.css';

const TakeAttendance = () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const [teacher, setTeacher] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeLiveClass, setActiveLiveClass] = useState(null);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const studentsPerPage = 10;

  const filterRef = useRef(null);
  const timerRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const liveClassCheckRef = useRef(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getTeacherData = () => {
    try {
      const teacherData = localStorage.getItem('teacher');
      if (teacherData) return JSON.parse(teacherData);

      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.teacher || parsed;
      }
      return null;
    } catch (error) {
      console.error('Error getting teacher data:', error);
      return null;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '-';
    }
  };

  const getSessionDuration = () => {
    if (!sessionStartTime) return '0m';
    const diff = Math.floor((new Date() - sessionStartTime) / 1000 / 60);
    return formatDuration(diff);
  };

  const getFilteredStudents = () => {
    if (filterStatus === 'Present') return students.filter(s => s.status === 'Present');
    if (filterStatus === 'Absent') return students.filter(s => s.status === 'Absent');
    return students;
  };

  const getStats = () => {
    const total = students.length;
    const present = students.filter(s => s.status === 'Present').length;
    const absent = total - present;
    const avgDuration =
      present > 0
        ? Math.floor(students.reduce((sum, s) => sum + (s.duration || 0), 0) / present)
        : 0;
    return {
      total,
      present,
      absent,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      avgDuration
    };
  };

  // ─── LAYER 1: leaf callbacks (no deps on other callbacks defined here) ────

  /**
   * CHANGE 1 – Converted to useCallback.
   * Was a plain async function.  Must be a stable callback so that
   * autoStartAttendanceSession (which calls it) can list it in its dep array
   * without triggering infinite re-renders.
   */
  const loadSessionAttendance = useCallback(async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/attendance/session/${sessionId}`);
      if (response.data.success) {
        setStudents(prevStudents =>
          prevStudents.map(student => {
            const record = response.data.records.find(r => r.studentId === student._id);
            if (record) {
              const duration = record.totalDuration || record.duration || 0;
              const status = duration >= 45 ? 'Present' : 'Absent';
              const isActiveInClass = record.firstJoinTime && !record.lastLeaveTime;
              return { ...student, status, duration, isPresent: isActiveInClass };
            }
            return student;
          })
        );
      }
    } catch (error) {
      console.error('Error loading session attendance:', error);
    }
  }, []); // no reactive deps – only stable setters and API_BASE_URL (module-level constant)

  /**
   * CHANGE 2 – Converted to useCallback.
   * Was a plain async function called inside autoTrackAttendance and markAttendance.
   * Needs liveSession from state so it is listed as a dep.
   */
  const autoEndSession = useCallback(async () => {
    if (!liveSession) return;
    try {
      await axios.post(`${API_BASE_URL}/api/attendance/end-session`, {
        sessionId: liveSession._id,
        endTime: new Date(),
        autoEnded: true
      });
      setLiveSession(null);
      setSessionStartTime(null);
      setIsAutoTracking(false);
      console.log('Attendance session auto-ended');
    } catch (error) {
      console.error('Error auto-ending session:', error);
    }
  }, [liveSession]);

  /**
   * CHANGE 3 – Converted to useCallback.
   * Was a plain async function.  Called inside autoTrackAttendance.
   * Depends on liveSession, selectedClass, selectedSubject (all from state).
   */
  const markAttendance = useCallback(async (student, action, isAuto = false) => {
    if (!liveSession) return;
    try {
      const timestamp = new Date();
      const response = await axios.post(`${API_BASE_URL}/api/attendance/mark`, {
        sessionId: liveSession._id,
        studentId: student._id,
        studentName: `${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim(),
        action,
        timestamp,
        class: selectedClass,
        subject: selectedSubject,
        isAutoTracked: isAuto
      });
      if (response.data.success) {
        loadSessionAttendance(liveSession._id);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  }, [liveSession, selectedClass, selectedSubject, loadSessionAttendance]);

  // ─── LAYER 2: callbacks that depend on LAYER 1 ───────────────────────────

  /**
   * CHANGE 4 – Converted to useCallback and MOVED UP before checkForActiveLiveClass.
   * Previously it was a plain async function declared AFTER checkForActiveLiveClass,
   * which caused the "Cannot access before initialization" ReferenceError because
   * checkForActiveLiveClass (a useCallback) captured autoStartAttendanceSession at
   * definition time, but the variable wasn't yet in scope.
   *
   * Deps: teacher, selectedClass, selectedSubject, selectedDate, loadSessionAttendance
   */
  const autoStartAttendanceSession = useCallback(async (liveClass) => {
    if (!teacher) return;
    try {
      const checkResponse = await axios.get(
        `${API_BASE_URL}/api/attendance/active-session`,
        {
          params: {
            teacherId: teacher.id,
            class: selectedClass,
            subject: selectedSubject,
            date: selectedDate
          }
        }
      );

      if (checkResponse.data.success && checkResponse.data.session) {
        setLiveSession(checkResponse.data.session);
        setSessionStartTime(new Date(checkResponse.data.session.startTime));
        setIsAutoTracking(true);
        loadSessionAttendance(checkResponse.data.session._id);
      } else {
        const teacherName =
          `${teacher.salutation || ''} ${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();

        const response = await axios.post(`${API_BASE_URL}/api/attendance/start-session`, {
          teacherId: teacher.id,
          teacherName: teacherName || 'Unknown Teacher',
          class: selectedClass,
          subject: selectedSubject,
          date: selectedDate,
          liveClassId: liveClass.id,
          autoStarted: true
        });

        if (response.data.success) {
          setLiveSession(response.data.session);
          setSessionStartTime(new Date());
          setIsAutoTracking(true);
        }
      }
    } catch (error) {
      console.error('Error auto-starting session:', error);
    }
  }, [teacher, selectedClass, selectedSubject, selectedDate, loadSessionAttendance]);

  // ─── LAYER 3: callbacks that depend on LAYER 2 ───────────────────────────

  /**
   * CHANGE 5 – checkForActiveLiveClass now correctly lists autoStartAttendanceSession
   * in its dep array (previously it caused the runtime error by referencing the not-yet-
   * initialised variable).  isAutoTracking is also listed because the branch that clears
   * it reads from state.
   */
  const checkForActiveLiveClass = useCallback(async () => {
    if (!teacher || !selectedClass || !selectedSubject) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/live-classes`);
      const liveClasses = response.data || [];

      const matchingClass = liveClasses.find(
        cls =>
          cls.subject === selectedSubject &&
          cls.class === selectedClass &&
          cls.teacherId === teacher.id &&
          cls.isLive
      );

      if (matchingClass) {
        setActiveLiveClass(matchingClass);
        await autoStartAttendanceSession(matchingClass);
      } else {
        if (isAutoTracking) {
          setIsAutoTracking(false);
          setActiveLiveClass(null);
        }
      }
    } catch (error) {
      console.error('Error checking live class:', error);
    }
  }, [teacher, selectedClass, selectedSubject, isAutoTracking, autoStartAttendanceSession]);

  /**
   * CHANGE 6 – autoTrackAttendance now lists autoEndSession and markAttendance in its
   * dep array (previously they were referenced before being declared as useCallback,
   * causing both the runtime error and stale-closure bugs).
   */
  const autoTrackAttendance = useCallback(async () => {
    if (!activeLiveClass || !liveSession) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/live-classes`);
      const liveClasses = response.data || [];
      const currentClass = liveClasses.find(cls => cls.id === activeLiveClass.id);

      if (!currentClass || !currentClass.isLive) {
        setIsAutoTracking(false);
        setActiveLiveClass(null);
        await autoEndSession();
        return;
      }

      const participants = currentClass.participants || [];
      setLastSyncTime(new Date());

      // Track joins
      for (const participant of participants) {
        const student = students.find(
          s =>
            s.email === participant.email ||
            `${s.firstName} ${s.lastName}`.trim().toLowerCase() ===
              participant.name.toLowerCase()
        );
        if (student && !student.isPresent) {
          await markAttendance(student, 'join', true);
        }
      }

      // Track leaves
      const activeStudents = students.filter(s => s.isPresent);
      for (const student of activeStudents) {
        const stillInClass = participants.some(
          p =>
            p.email === student.email ||
            p.name.toLowerCase() ===
              `${student.firstName} ${student.lastName}`.trim().toLowerCase()
        );
        if (!stillInClass) {
          await markAttendance(student, 'leave', true);
        }
      }
    } catch (error) {
      console.error('Error auto-tracking attendance:', error);
    }
  }, [activeLiveClass, liveSession, students, autoEndSession, markAttendance]);

  /**
   * CHANGE 7 – startDurationTimer now lists loadSessionAttendance and liveSession
   * in its dep array.  Previously liveSession was captured via a plain function
   * closure, causing stale reads.
   */
  const startDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (liveSession) {
        loadSessionAttendance(liveSession._id);
      }
    }, 60000);
  }, [liveSession, loadSessionAttendance]);

  // ─── Non-async event handlers ─────────────────────────────────────────────
  const handleClassChange = (className) => {
    setSelectedClass(className);
  };

  // ─── Fetch students ────────────────────────────────────────────────────────
  /**
   * CHANGE 8 – fetchStudents unchanged in logic, but kept as useCallback
   * to satisfy exhaustive-deps for the useEffect that calls it.
   */
  const fetchStudents = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/students/by-class/${selectedClass}`);
      let studentsData = [];
      if (response.data.success && response.data.students) {
        studentsData = response.data.students;
      } else if (Array.isArray(response.data.students)) {
        studentsData = response.data.students;
      } else if (Array.isArray(response.data)) {
        studentsData = response.data;
      }

      const mappedStudents = studentsData.map(student => ({
        ...student,
        status: 'Absent',
        duration: 0,
        isPresent: false
      }));
      setStudents(mappedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  // ─── Load teacher assignments ──────────────────────────────────────────────
  const loadTeacherAssignments = useCallback(() => {
    const teacherData = getTeacherData();
    if (!teacherData) {
      alert('Please login again to continue.');
      setLoading(false);
      return;
    }

    const teacherId = teacherData._id || teacherData.id;
    setTeacher({
      id: teacherId,
      _id: teacherId,
      salutation: teacherData.salutation || '',
      firstName: teacherData.firstName || '',
      lastName: teacherData.lastName || '',
      email: teacherData.email || '',
      ...teacherData
    });

    let classes = [];
    if (teacherData.classesAssigned && Array.isArray(teacherData.classesAssigned)) {
      classes = teacherData.classesAssigned;
    } else if (teacherData.classAssigned) {
      classes = Array.isArray(teacherData.classAssigned)
        ? teacherData.classAssigned
        : [teacherData.classAssigned];
    }

    let subjects = [];
    if (teacherData.subjects && Array.isArray(teacherData.subjects)) {
      subjects = teacherData.subjects;
    }

    if (classes.length === 0 || subjects.length === 0) {
      setLoading(false);
      return;
    }

    setAssignedClasses(classes);
    setAvailableSubjects(subjects);
    setSelectedClass(classes[0]);
    setSelectedSubject(subjects[0]);
    setLoading(false);
  }, []);

  // ─── Export handlers ───────────────────────────────────────────────────────
  const exportCurrentSession = async () => {
    if (!liveSession) {
      alert('No active session data available to export');
      return;
    }
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/attendance/export/${liveSession._id}`,
        { responseType: 'blob', headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.size === 0) {
        alert('No attendance data found for the current session.');
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `attendance_today_${selectedClass}_${selectedSubject}_${selectedDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting current session:', error);
      if (error.response?.status === 404) {
        alert('Current session export is not available. Please contact the administrator.');
      } else if (error.response) {
        alert(`Export failed with status ${error.response.status}. Please try again.`);
      } else {
        alert('Failed to export current session. Please check your connection and try again.');
      }
    }
  };

  const exportByDateRange = async () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Please select both start and end dates');
      return;
    }
    if (new Date(exportStartDate) > new Date(exportEndDate)) {
      alert('Start date cannot be later than end date');
      return;
    }
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/attendance/export-range`,
        {
          class: selectedClass,
          subject: selectedSubject,
          startDate: exportStartDate,
          endDate: exportEndDate,
          teacherId: teacher.id
        },
        { responseType: 'blob', headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.size === 0) {
        alert('No attendance records found for the selected date range.');
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `attendance_history_${selectedClass}_${selectedSubject}_${exportStartDate}_to_${exportEndDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting attendance range:', error);
      if (error.response?.status === 404) {
        alert('Export functionality is not available. Please contact the administrator.');
      } else if (error.response?.status === 400) {
        alert('Invalid request parameters. Please check your selections.');
      } else if (error.response) {
        alert(`Export failed with status ${error.response.status}. Please try again.`);
      } else if (error.request) {
        alert('Network error. Please check your internet connection and try again.');
      } else {
        alert('An unexpected error occurred. Please try again.');
      }
    }
  };

  // ─── Pagination ────────────────────────────────────────────────────────────
  const filteredStudents = getFilteredStudents();
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const stats = getStats();

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Mount / unmount
  useEffect(() => {
    loadTeacherAssignments();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      if (liveClassCheckRef.current) clearInterval(liveClassCheckRef.current);
    };
  }, [loadTeacherAssignments]);

  // Fetch students when class/subject changes
  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudents();
    }
  }, [selectedClass, selectedSubject, fetchStudents]);

  /**
   * CHANGE 9 – useEffect dep array now lists checkForActiveLiveClass (stable
   * useCallback reference) instead of the raw state vars, preventing the
   * "missing dependency" ESLint warning while still re-running when class,
   * subject, or teacher change (because those are in checkForActiveLiveClass's
   * own dep array).
   */
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !teacher) return;

    checkForActiveLiveClass();

    liveClassCheckRef.current = setInterval(() => {
      checkForActiveLiveClass();
    }, 10000);

    return () => {
      if (liveClassCheckRef.current) clearInterval(liveClassCheckRef.current);
    };
  }, [checkForActiveLiveClass, selectedClass, selectedSubject, teacher]);

  /**
   * CHANGE 10 – autoTrackAttendance and startDurationTimer are now stable
   * useCallback references, so they can be safely listed as deps here.
   */
  useEffect(() => {
    if (isAutoTracking && liveSession && activeLiveClass) {
      startDurationTimer();

      trackingIntervalRef.current = setInterval(() => {
        autoTrackAttendance();
      }, 15000);

      autoTrackAttendance();
    } else {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    }

    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, [isAutoTracking, liveSession, activeLiveClass, startDurationTimer, autoTrackAttendance]);

  // Re-check live class when date changes
  useEffect(() => {
    if (selectedDate && selectedClass && selectedSubject && teacher) {
      checkForActiveLiveClass();
    }
  }, [selectedDate, checkForActiveLiveClass, selectedClass, selectedSubject, teacher]);

  // Close filter menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="attendance-loading">
        <FaSpinner className="spinner" />
        <p>Loading attendance system...</p>
      </div>
    );
  }

  if (!teacher || assignedClasses.length === 0 || availableSubjects.length === 0) {
    return (
      <div className="attendance-loading">
        <FaExclamationTriangle
          className="no-data-icon"
          style={{ fontSize: '4rem', color: '#f59e0b' }}
        />
        <h3>No Classes Assigned</h3>
        <p>You don't have any classes or subjects assigned yet. Please contact the administrator.</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="take-attendance-container">
      {/* Header */}
      <div className="attendance-header">
        <div className="att-header-content">
          <h2>Attendance Tracking</h2>
          <p>Automatic real-time attendance tracking for live classes</p>
        </div>

        <div className="attendance-statistics-row">
          <div className="attendance-stat-card">
            <span className="attendance-stat-number">{stats.total}</span>
            <span className="attendance-stat-label">Total Students</span>
          </div>
          <div className="attendance-stat-card">
            <span className="attendance-stat-number">{stats.present}</span>
            <span className="attendance-stat-label">Present</span>
          </div>
          <div className="attendance-stat-card">
            <span className="attendance-stat-number">{stats.absent}</span>
            <span className="attendance-stat-label">Absent</span>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {isAutoTracking && activeLiveClass ? (
        <div className="auto-tracking-active-banner">
          <div className="banner-content">
            <div className="banner-info">
              <p>
                Live class is running • Attendance is being tracked automatically
                {lastSyncTime && ` • Last sync: ${formatTime(lastSyncTime)}`}
              </p>
            </div>
          </div>
          <div className="banner-meta">
            <span className="duration-badge-large">
              <FaClock />
              {getSessionDuration()}
            </span>
          </div>
        </div>
      ) : (
        <div className="auto-tracking-waiting-banner">
          <div className="banner-content">
            <FaInfoCircle className="banner-icon" />
            <div className="banner-info">
              <h4>Waiting for Live Class</h4>
              <p>Start a live class from the Subjects page to begin automatic attendance tracking</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="attendance-controls">
        <div className="controls-left">
          <div className="control-group">
            <label>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="control-select"
            >
              {assignedClasses.map((cls, index) => (
                <option key={index} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="control-select"
            >
              {availableSubjects.map((subject, index) => (
                <option key={index} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="control-input"
            />
          </div>
        </div>

        <div className="controls-right">
          <div className="filter-dropdown" ref={filterRef}>
            <button className="filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <FaFilter /> Filter
            </button>
            {showFilterMenu && (
              <div className="filter-menu">
                {['All', 'Present', 'Absent'].map(option => (
                  <div
                    key={option}
                    className={`filter-option ${filterStatus === option ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus(option);
                      setShowFilterMenu(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>

          {liveSession && (
            <button onClick={exportCurrentSession} className="export-btn">
              <FaDownload /> Export
            </button>
          )}

          <button
            onClick={() => setShowExportModal(true)}
            className="export-history-btn"
            title="Export attendance history"
          >
            <FaHistory /> Export History
          </button>
        </div>
      </div>

      {/* Attendance Rule Info */}
      <div className="attendance-rule-info">
        <div className="rule-content">
          <p>
            Students must stay in the live class for at least 45 minutes to be marked Present.
            Duration below 45 minutes will be marked as Absent.
          </p>
        </div>
      </div>

      {/* Students Table */}
      <div className="attendance-table-container">
        {currentStudents.length === 0 ? (
          <div className="no-students">
            <FaExclamationTriangle className="no-data-icon" />
            <p>No students found for this class</p>
          </div>
        ) : (
          <>
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Student Name</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.map((student, index) => (
                  <tr key={student._id} className={student.isPresent ? 'present-row' : ''}>
                    <td>{indexOfFirstStudent + index + 1}</td>
                    <td>
                      <div className="student-name-cell">
                        <span className="student-name">
                          {`${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim()}
                        </span>
                        <span className="student-email">{student.email}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`duration-badge ${
                          student.duration >= 45 ? 'sufficient' : 'insufficient'
                        }`}
                      >
                        <FaClock />
                        {formatDuration(student.duration)}
                        {student.duration >= 45 && (
                          <span className="sufficient-mark">✓</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${student.status.toLowerCase()}`}>
                        {student.status === 'Present' ? <FaCheckCircle /> : <FaTimesCircle />}
                        {student.status}
                        {student.duration > 0 && student.duration < 45 && (
                          <span className="threshold-info"> (&lt;45min)</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="att-action-buttons">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowDetailsModal(true);
                          }}
                          className="action-btn view-details"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <FaChevronLeft />
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export History Modal */}
      {showExportModal && (
        <div className="attendance-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div
            className="attendance-modal-content export-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attendance-modal-header">
              <h3>
                <FaHistory /> Export Attendance History
              </h3>
              <button className="attendance-modal-close" onClick={() => setShowExportModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="attendance-modal-body">
              <div className="export-info">
                <p>Export attendance records for a specific date range</p>
              </div>

              <div className="date-range-picker">
                <div className="date-input-group">
                  <label>
                    <FaCalendarAlt /> Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="date-input"
                  />
                </div>

                <div className="date-input-group">
                  <label>
                    <FaCalendarAlt /> End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    min={exportStartDate}
                    className="date-input"
                  />
                </div>
              </div>

              <div className="export-summary">
                <p>
                  <strong>Class:</strong> {selectedClass}
                </p>
                <p>
                  <strong>Subject:</strong> {selectedSubject}
                </p>
              </div>

              <button
                onClick={exportByDateRange}
                className="export-confirm-btn"
                disabled={
                  !exportStartDate ||
                  !exportEndDate ||
                  new Date(exportStartDate) > new Date(exportEndDate)
                }
              >
                <FaDownload /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="attendance-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="attendance-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <h3>Student Attendance Details</h3>
              <button
                className="attendance-modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="attendance-modal-body">
              <div className="detail-group">
                <label>Student Name</label>
                <p>
                  {`${selectedStudent.salutation || ''} ${selectedStudent.firstName} ${selectedStudent.lastName}`.trim()}
                </p>
              </div>

              <div className="detail-group">
                <label>Class</label>
                <p>{selectedStudent.class}</p>
              </div>

              <div className="detail-group">
                <label>Email</label>
                <p>{selectedStudent.email}</p>
              </div>

              <div className="detail-group">
                <label>Total Duration</label>
                <p
                  className={`duration-highlight ${
                    selectedStudent.duration >= 45 ? 'sufficient' : 'insufficient'
                  }`}
                >
                  {formatDuration(selectedStudent.duration)}
                  {selectedStudent.duration >= 45
                    ? ' ✓ (Sufficient)'
                    : ' (Below 45 min threshold)'}
                </p>
              </div>

              <div className="detail-group">
                <label>Status</label>
                <p>
                  <span className={`status-badge ${selectedStudent.status.toLowerCase()}`}>
                    {selectedStudent.status}
                  </span>
                  {selectedStudent.duration > 0 && selectedStudent.duration < 45 && (
                    <span className="threshold-warning"> - Duration below 45 minutes</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeAttendance;