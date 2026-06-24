import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/schedule.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const isValidUrl = (value) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getDefaultDays = (scheduleType) => {
  const normalized = String(scheduleType || '').trim().toLowerCase();
  if (normalized === 'weekday') {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }
  if (normalized === 'weekend') {
    return ['Saturday', 'Sunday'];
  }
  return [];
};

const formatDays = (days) => {
  if (!days || days.length === 0) return '-';
  return days.map((d) => d.substring(0, 3)).join(', ');
};

const formatDateColumn = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  const day = String(parsed.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[parsed.getMonth()];
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatTimeColumn = (time) => {
  if (!time) return '-';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const min = m || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${min} ${ampm}`;
};

const copyToClipboard = (text, setCopiedId) => {
  navigator.clipboard.writeText(text).then(() => {
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }).catch(() => {
    alert('Failed to copy link');
  });
};

const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DaysDropdown = ({ days, scheduleType, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedType = String(scheduleType || '').trim().toLowerCase();
  const defaultDays = normalizedType === 'weekday'
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    : normalizedType === 'weekend'
      ? ['Saturday', 'Sunday']
      : [];

  const toggleDay = (day) => {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    onChange(next);
  };

  const selectAll = () => {
    onChange([...DAYS_LIST]);
  };

  const clearAll = () => {
    onChange([...defaultDays]);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          borderRadius: '12px',
          border: `1px solid ${days && days.length > 0 ? '#10b981' : '#d8e0ec'}`,
          background: '#f8fafc',
          color: days && days.length > 0 ? '#0f172a' : '#64748b',
          fontWeight: days && days.length > 0 ? 600 : 400,
          fontSize: '0.95rem',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
      >
        <span>{days && days.length > 0 ? formatDays(days) : 'Select Days'}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            marginTop: '6px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
            maxHeight: '280px',
            overflowY: 'auto'
          }}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={selectAll}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#334155',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#334155',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset Defaults
            </button>
          </div>

          {DAYS_LIST.map((day) => {
            const isChecked = days.includes(day);

            return (
              <label
                key={day}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: isChecked ? '#eff6ff' : 'transparent',
                  color: isChecked ? '#1d4ed8' : '#334155',
                  fontWeight: isChecked ? 700 : 500,
                  fontSize: '0.92rem',
                  userSelect: 'none',
                  borderBottom: '1px solid #f8fafc'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleDay(day)}
                  style={{ cursor: 'pointer', accentColor: '#2563eb', width: '16px', height: '16px' }}
                />
                {day}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <label style={styles.fieldWrapper}>
    <span style={styles.label}>{label}</span>
    {children}
    {error && <span style={styles.errorText}>{error}</span>}
  </label>
);

const FacultySchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [form, setForm] = useState({
    batchName: '',
    scheduleType: '',
    subject: '',
    courseCode: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    meetLink: '',
    days: []
  });
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [assignedCoursesLoading, setAssignedCoursesLoading] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/schedules`);
        setSchedule(res.data);
      } catch (err) {
        const stored = localStorage.getItem('facultySchedules');
        if (stored) {
          try {
            setSchedule(JSON.parse(stored));
          } catch (e) {
            setSchedule([]);
          }
        }
      }
    };
    fetchSchedules();
  }, []);

  useEffect(() => {
    localStorage.setItem('facultySchedules', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    if (!notificationMessage) return;

    const timer = setTimeout(() => {
      setNotificationMessage('');
    }, 5000);

    return () => clearTimeout(timer);
  }, [notificationMessage]);

  const getStoredFaculty = () => {
    try {
      const teacher = localStorage.getItem('teacher');
      if (teacher) {
        const parsedTeacher = JSON.parse(teacher);
        if (parsedTeacher?.id || parsedTeacher?._id) return parsedTeacher;
      }

      const user = localStorage.getItem('user');
      if (user) {
        const parsedUser = JSON.parse(user);
        if (parsedUser?.role === 'teacher' || parsedUser?.role === 'trainee') return parsedUser;
      }
    } catch (error) {
      console.error('Error reading stored faculty data:', error);
    }

    return null;
  };

  useEffect(() => {
    const normalizeCourses = (courses) => {
      const uniqueCourses = [];
      const seenCourseNames = new Set();

      courses.forEach((course) => {
        const courseName = String(course?.courseName || '').trim();
        const normalizedCourseCode = String(course?.courseCode || '').trim();
        const courseType = String(course?.courseType || '').trim();

        if (!courseName || !normalizedCourseCode || seenCourseNames.has(courseName)) return;

        seenCourseNames.add(courseName);
        uniqueCourses.push({ courseName, courseCode: normalizedCourseCode, courseType });
      });

      return uniqueCourses;
    };

    const fetchAssignedCourses = async () => {
      const faculty = getStoredFaculty();
      const teacherId = faculty?.id || faculty?._id;

      if (!teacherId) {
        setAssignedCourses([]);
        setForm((prev) => ({ ...prev, subject: '', courseCode: '', scheduleType: '' }));
        return;
      }

      setAssignedCoursesLoading(true);

      try {
        const res = await axios.get(`${API_BASE_URL}/api/courses/teacher/${teacherId}`);
        const courses = normalizeCourses(Array.isArray(res.data?.courses) ? res.data.courses : []);

        console.log('Teacher Assigned Courses:', courses);
        console.log('Active Courses:', courses);

        setAssignedCourses(courses);
        setForm((prev) => {
          const selectedCourse = courses.find((course) => course.courseName === prev.subject);
          return selectedCourse
            ? {
                ...prev,
                subject: selectedCourse.courseName,
                courseCode: selectedCourse.courseCode,
                scheduleType: selectedCourse.courseType || prev.scheduleType
              }
            : { ...prev, subject: '', courseCode: '', scheduleType: '' };
        });
      } catch (error) {
        console.error('Failed to fetch assigned courses:', error);
        setAssignedCourses([]);
        setForm((prev) => ({ ...prev, subject: '', courseCode: '', scheduleType: '' }));
      } finally {
        setAssignedCoursesLoading(false);
      }
    };

    fetchAssignedCourses();
  }, []);

  const trimmedBatchName = form.batchName.trim();
  const isBatchNameValid = trimmedBatchName.length >= 3 && trimmedBatchName.length <= 50;
  const hasInvalidMeetLink = form.meetLink.trim() && !isValidUrl(form.meetLink.trim());
  const isAddDisabled = !isBatchNameValid || !form.subject || !form.courseCode || !form.startDate || !form.endDate || !form.startTime || !form.endTime || !form.days || form.days.length === 0 || new Date(form.endDate) < new Date(form.startDate) || hasInvalidMeetLink;

  const markTouched = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'subject') {
      const selectedCourse = assignedCourses.find((course) => course.courseName === value);
      console.log('Teacher Assigned Courses:', assignedCourses);
      console.log('Matched Active Courses:', assignedCourses);
      console.log('Selected Subject:', selectedCourse?.courseName);
      console.log('Selected Course Code:', selectedCourse?.courseCode);
      console.log('Selected Course Type:', selectedCourse?.courseType);
      console.log('Auto Schedule Type:', selectedCourse?.courseType);
      const nextScheduleType = selectedCourse?.courseType || '';
      const nextDays = getDefaultDays(nextScheduleType);
      setForm((prev) => ({
        ...prev,
        subject: value,
        courseCode: selectedCourse?.courseCode || '',
        scheduleType: nextScheduleType,
        days: nextDays
      }));
      setError('');
      setNotificationMessage('');
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setNotificationMessage('');
  };

  const getFieldError = (name) => {
    if (!touched[name]) return '';

    if (name === 'batchName' && !isBatchNameValid) {
      return 'Batch Name must be 3 to 50 characters.';
    }

    if (name === 'subject' && !form.subject) {
      return 'Select a subject.';
    }

    if (name === 'startDate' && !form.startDate) {
      return 'Select a start date.';
    }

    if (name === 'endDate' && !form.endDate) {
      return 'Select an end date.';
    }

    if (name === 'endDate' && form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      return 'End Date must be greater than or equal to Start Date.';
    }

    if (name === 'startTime' && !form.startTime) {
      return 'Select a start time.';
    }

    if (name === 'endTime' && !form.endTime) {
      return 'Select an end time.';
    }

    if (name === 'endTime' && form.startTime && form.endTime && form.endTime <= form.startTime) {
      return 'End Time must be later than Start Time.';
    }

    if (name === 'meetLink' && hasInvalidMeetLink) {
      return 'Enter a valid Meeting Link URL.';
    }

    if (name === 'days' && (!form.days || form.days.length === 0)) {
      return 'Please select at least one day.';
    }

    return '';
  };

  const isFieldComplete = (name) => {
    if (!touched[name]) return false;

    if (name === 'batchName') return isBatchNameValid;
    if (name === 'subject') return Boolean(form.subject);
    if (name === 'startDate') return Boolean(form.startDate);
    if (name === 'endDate') return Boolean(form.endDate) && (!form.startDate || new Date(form.endDate) >= new Date(form.startDate));
    if (name === 'startTime') return Boolean(form.startTime);
    if (name === 'endTime') return Boolean(form.endTime) && (!form.startTime || form.endTime > form.startTime);
    if (name === 'days') return Boolean(form.days && form.days.length > 0);
    if (name === 'meetLink') return Boolean(form.meetLink.trim()) && !hasInvalidMeetLink;

    return false;
  };

  const getInputClass = (name, isSelect = false) => {
    const baseClass = isSelect ? 'schedule-select' : 'schedule-input';
    const invalidClass = getFieldError(name) ? ' is-invalid' : '';
    const validClass = isFieldComplete(name) ? ' is-valid' : '';
    return `${baseClass}${invalidClass}${validClass}`;
  };

  const handleAddSchedule = async () => {
    if (!isBatchNameValid) {
      setError('Please enter a valid Batch Name.');
      return;
    }
    if (!form.scheduleType || !form.subject || !form.courseCode || !form.startDate || !form.endDate || !form.startTime || !form.endTime || !form.days || form.days.length === 0) {
      setError('Please fill all required fields.');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError('End Date must be greater than or equal to Start Date.');
      return;
    }
    if (form.endTime && form.startTime && form.endTime <= form.startTime) {
      setError('End Time must be later than Start Time.');
      return;
    }
    if (hasInvalidMeetLink) {
      setError('Please enter a valid Meeting Link URL.');
      return;
    }

    const faculty = getStoredFaculty();
    const teacherId = faculty?.id || faculty?._id;

    if (!teacherId) {
      setError('Faculty ID not found. Please log in again.');
      return;
    }

    const payload = {
      batchName: form.batchName,
      scheduleType: form.scheduleType,
      subject: form.subject,
      courseCode: form.courseCode,
      teacherId,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.startTime,
      endTime: form.endTime,
      meetLink: form.meetLink,
      days: form.days
    };

    console.log('=== FRONTEND DEBUG ===');
    console.log('Teacher Assigned Courses:', assignedCourses);
    console.log('Active Courses:', assignedCourses);
    console.log('Selected Subject:', form.subject);
    console.log('Selected Course Code:', form.courseCode);
    console.log('Selected Course Type:', assignedCourses.find(c => c.courseName === form.subject)?.courseType);
    console.log('Auto Schedule Type:', form.scheduleType);
    console.log('Schedule Save Payload:', payload);

    setSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/schedules`, payload);
      setSchedule((prev) => [...prev, res.data.schedule]);

      console.log('GET /api/schedules Response:', res.data);

      if (res.data.notificationFailed) {
        setNotificationMessage('Schedule created but email sending failed.');
      } else if (res.data.message === 'Schedule created and notification emails sent successfully') {
        setNotificationMessage('Successfully sent the mail.');
      }
    } catch (err) {
      console.error('Error creating schedule:', err.response?.data || err.message);
      const updated = [...schedule, form];
      setSchedule(updated);
      localStorage.setItem('facultySchedules', JSON.stringify(updated));
      setNotificationMessage('Schedule created but email sending failed.');
    } finally {
      setSaving(false);
    }
    setForm({ batchName: '', scheduleType: '', subject: '', courseCode: '', startDate: '', endDate: '', startTime: '', endTime: '', meetLink: '', days: [] });
    setTouched({});
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/schedules/${id}`);
      setSchedule((prev) => prev.filter((s) => s._id !== id));
    } catch {
      setSchedule((prev) => prev.filter((s) => s._id !== id));
    }
  };

  return (
    <div className="schedule-page">

      <h2>Set Your Class Schedule</h2>
      <p className="schedule-page-subtitle">Create and manage upcoming class sessions from a clean faculty dashboard.</p>

      {notificationMessage && (
        <div style={{
          position: 'fixed',
          top: 88,
          right: 24,
          zIndex: 50,
          maxWidth: 360,
          padding: '14px 16px',
          borderRadius: 12,
          background: notificationMessage === 'Successfully sent the mail.' ? '#ecfdf5' : '#fef2f2',
          color: notificationMessage === 'Successfully sent the mail.' ? '#047857' : '#b91c1c',
          border: `1px solid ${notificationMessage === 'Successfully sent the mail.' ? '#a7f3d0' : '#fecaca'}`,
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
          fontWeight: 700,
          fontSize: '0.94rem'
        }}>
          {notificationMessage}
        </div>
      )}

      <div className="schedule-card">
        <h3 className="schedule-card-title">Create Schedule</h3>

        <div className="schedule-form-grid">
          <Field label="Batch Name" error={getFieldError('batchName')}>
            <input
              className={getInputClass('batchName')}
              type="text"
              name="batchName"
              value={form.batchName}
              onChange={handleChange}
              onBlur={() => markTouched('batchName')}
              placeholder="Enter Batch Name"
              maxLength={50}
              required
              aria-invalid={Boolean(getFieldError('batchName'))}
            />
          </Field>

          <Field label="Subject" error={getFieldError('subject')}>
            <select
              className={getInputClass('subject', true)}
              name="subject"
              value={form.subject}
              onChange={handleChange}
              onBlur={() => markTouched('subject')}
              required
              disabled={assignedCoursesLoading || assignedCourses.length === 0}
              aria-invalid={Boolean(getFieldError('subject'))}
            >
              <option value="">
                {assignedCoursesLoading
                  ? 'Loading subjects...'
                  : assignedCourses.length === 0
                    ? 'No assigned courses available'
                    : 'Select Subject'}
              </option>
              {assignedCourses.map((course) => (
                <option key={`${course.courseCode}-${course.courseName}`} value={course.courseName}>{course.courseName} ({course.courseType})</option>
              ))}
            </select>
            {!assignedCoursesLoading && assignedCourses.length === 0 && (
              <span style={styles.noCoursesText}>No assigned courses available</span>
            )}
          </Field>

          <Field label="Schedule Type">
            <div
              className={getInputClass('scheduleType')}
              style={{
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                color: form.scheduleType ? '#0f172a' : '#64748b',
                fontWeight: form.scheduleType ? 600 : 400,
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0 14px',
                border: `1px solid ${form.scheduleType ? '#10b981' : '#d8e0ec'}`,
                boxSizing: 'border-box'
              }}
            >
              {form.scheduleType || 'Auto-filled from subject'}
            </div>
          </Field>

          <Field label="Days" error={getFieldError('days')}>
            <DaysDropdown
              days={form.days}
              scheduleType={form.scheduleType}
              onChange={(nextDays) => setForm((prev) => ({ ...prev, days: nextDays }))}
            />
          </Field>

          <Field label="Start Date" error={getFieldError('startDate')}>
            <input
              className={getInputClass('startDate')}
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              onBlur={() => markTouched('startDate')}
              required
              aria-invalid={Boolean(getFieldError('startDate'))}
            />
          </Field>

          <Field label="End Date" error={getFieldError('endDate')}>
            <input
              className={getInputClass('endDate')}
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              onBlur={() => markTouched('endDate')}
              required
              aria-invalid={Boolean(getFieldError('endDate'))}
            />
          </Field>

          <Field label="Start Time" error={getFieldError('startTime')}>
            <input
              className={getInputClass('startTime')}
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              onBlur={() => markTouched('startTime')}
              required
              aria-invalid={Boolean(getFieldError('startTime'))}
            />
          </Field>

          <Field label="End Time" error={getFieldError('endTime')}>
            <input
              className={getInputClass('endTime')}
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              onBlur={() => markTouched('endTime')}
              required
              aria-invalid={Boolean(getFieldError('endTime'))}
            />
          </Field>

          <Field label="Meet Link" error={getFieldError('meetLink')}>
            <input
              className={getInputClass('meetLink')}
              type="url"
              name="meetLink"
              value={form.meetLink}
              onChange={handleChange}
              onBlur={() => markTouched('meetLink')}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              aria-invalid={Boolean(getFieldError('meetLink'))}
            />
          </Field>

          <div className="schedule-submit-row">
            <button
              className="schedule-submit-btn"
              onClick={handleAddSchedule}
              disabled={isAddDisabled || saving}
            >
              {saving ? (
                <>
                  <span className="schedule-spinner" />
                  Saving...
                </>
              ) : (
                'Add Schedule'
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="schedule-global-error">
          {error}
        </p>
      )}

      <div className="schedule-table-card">
        <div className="schedule-table-header">
          <h3>Scheduled Classes</h3>
          <p>Upcoming sessions are shown below.</p>
        </div>

        <div className="schedule-table-scroll">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Days</th>
                <th>Start</th>
                <th>End</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Meet Link</th>

              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan="9" className="sched-empty">
                    <span className="sched-empty-icon">📅</span>
                    No scheduled classes available yet.
                  </td>
                </tr>
              ) : (
                schedule.map((s) => (
                  <tr key={s._id}>
                    <td className="sched-td-batch">{s.batchName}</td>
                    <td>
                      <span className={`sched-type-badge ${s.scheduleType?.toLowerCase() === 'weekend' ? 'weekend' : ''}`}>
                        {s.scheduleType || '-'}
                      </span>
                    </td>
                    <td className="sched-td-days">{s.subject}</td>
                    <td className="sched-td-days">{formatDays(s.days)}</td>
                    <td className="sched-td-date">{formatDateColumn(s.startDate)}</td>
                    <td className="sched-td-date">{formatDateColumn(s.endDate)}</td>
                    <td className="sched-td-time">{formatTimeColumn(s.startTime)}</td>
                    <td className="sched-td-time">{formatTimeColumn(s.endTime)}</td>
                    <td>
                      {s.meetLink ? (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(s.meetLink, setCopiedLinkId)}
                          className={`sched-copy-btn${copiedLinkId === s.meetLink ? ' copied' : ''}`}
                        >
                          {copiedLinkId === s.meetLink ? 'Copied!' : 'Copy Link'}
                        </button>
                      ) : '-'}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteId && (
        <div className="sched-modal-overlay">
          <div className="sched-modal">
            <h3>Delete Schedule</h3>
            <p>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </p>
            <div className="sched-modal-actions">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="sched-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDelete(deleteId);
                  setDeleteId(null);
                }}
                className="sched-modal-confirm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  fieldWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#334155'
  },
  errorText: {
    color: '#dc2626',
    fontSize: '0.78rem',
    fontWeight: 600,
    minHeight: '16px'
  },
  noCoursesText: {
    color: '#64748b',
    fontSize: '0.78rem',
    fontWeight: 600,
    minHeight: '16px'
  }
};

export default FacultySchedulePage;