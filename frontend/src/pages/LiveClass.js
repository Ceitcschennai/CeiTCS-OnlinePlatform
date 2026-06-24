import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaVideo, FaCalendarAlt, FaClock, FaTrash } from "react-icons/fa";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "-"
    : parsed.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const formatDays = (days) => {
  if (!days || days.length === 0) return "-";
  return days.map((d) => d.substring(0, 3)).join(", ");
};

const formatDuration = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start === "-" && end === "-") return "-";
  if (start === "-") return end;
  if (end === "-") return start;
  return `${start} - ${end}`;
};

const formatTime = (startTime, endTime) => {
  if (!startTime && !endTime) return "-";
  const formatT = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const min = m || "00";
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min} ${ampm}`;
  };
  const start = formatT(startTime);
  const end = formatT(endTime);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return "-";
};

const LiveClass = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
  try {
    const role = localStorage.getItem("userRole");
    const user = JSON.parse(localStorage.getItem("user"));
    const employeeId = user?.id;

    let url = `${API_BASE_URL}/api/schedules`;

    if (role === "employee") {
      url = `${API_BASE_URL}/api/schedules/employee/${employeeId}`;
    }

    if (role === "teacher" || role === "trainee") {
      url = `${API_BASE_URL}/api/schedules`;
      // OR:
      // url = `${API_BASE_URL}/api/schedules/teacher/${user._id}`;
    }

    const res = await axios.get(url);

    setSchedules(res.data || []);
  } catch (err) {
    if (err.response?.status === 403) {
      setSchedules([]);
      alert("Payment pending. Please complete payment to access live classes.");
      return;
    }

    console.error(err);
    setSchedules([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchSchedules();
  }, []);

  const removeScheduleFromStorage = (id) => {
    const stored = localStorage.getItem("facultySchedules");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      localStorage.setItem(
        "facultySchedules",
        JSON.stringify(parsed.filter((s) => s._id !== id))
      );
    } catch {
      localStorage.removeItem("facultySchedules");
    }
  };

  const handleJoinClass = (schedule) => {
    if (!schedule.meetLink) return;
    window.open(schedule.meetLink, "_blank");
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/schedules/${id}`);
      setSchedules((prev) => prev.filter((s) => s._id !== id));
      removeScheduleFromStorage(id);
    } catch {
      alert("Failed to delete the schedule. Please try again.");
    }
  };

  return (
    <>
      <style>
        {`
          .live-wrapper {
            min-height: 100vh;
            background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
          }

          .live-page-header {
            margin-bottom: 24px;
          }

          .live-page-title {
            margin: 0;
            color: #0f172a;
            font-size: clamp(1.65rem, 3vw, 2.25rem);
            font-weight: 850;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .live-page-subtitle {
            margin: 8px 0 0;
            color: #64748b;
            font-size: 0.98rem;
          }

          .live-schedule-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 20px;
          }

          .live-schedule-card {
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 16px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
            padding: 24px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .live-schedule-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 64px rgba(15, 23, 42, 0.12);
          }

          .live-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #f1f5f9;
          }

          .live-batch-name {
            margin: 0;
            color: #0f172a;
            font-size: 1.35rem;
            font-weight: 800;
          }

          .live-subject {
            margin: 4px 0 0;
            color: #3b82f6;
            font-size: 1rem;
            font-weight: 600;
          }

          .live-card-body {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .live-info-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .live-info-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.9rem;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .live-info-content {
            flex: 1;
          }

          .live-info-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .live-info-value {
            display: block;
            font-size: 0.98rem;
            font-weight: 600;
            color: #1e293b;
          }

          .live-card-actions {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #f1f5f9;
          }

          .live-btn {
            flex: 1;
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 0.92rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .live-btn:hover:not(:disabled) {
            transform: translateY(-2px);
          }

          .live-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .live-join-btn {
            background: linear-gradient(135deg, #16a34a, #15803d);
            color: white;
            box-shadow: 0 8px 18px rgba(22, 163, 74, 0.22);
          }

          .live-join-btn:hover:not(:disabled) {
            box-shadow: 0 12px 24px rgba(22, 163, 74, 0.28);
          }

          .live-delete-btn {
            background: transparent;
            color: #ef4444;
            border: 2px solid #ef4444;
          }

          .live-delete-btn:hover:not(:disabled) {
            background: #ef4444;
            color: white;
          }

          .live-empty-state {
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 22px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
            padding: 52px 24px;
            text-align: center;
          }

          .live-empty-state svg {
            color: #cbd5e1;
            font-size: 42px;
            margin-bottom: 14px;
          }

          .live-empty-state p {
            margin: 0;
            color: #6b7280;
            font-size: 1rem;
            font-weight: 650;
          }

          .live-loading-state {
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 22px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
            padding: 52px 24px;
            text-align: center;
            color: #64748b;
            font-size: 1rem;
            font-weight: 650;
          }

          /* Mobile Responsive */
          @media (max-width: 640px) {
            .live-wrapper {
              padding: 16px;
            }

            .live-schedule-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }

            .live-schedule-card {
              padding: 20px;
              border-radius: 14px;
            }

            .live-batch-name {
              font-size: 1.2rem;
            }

            .live-card-actions {
              flex-direction: column;
            }

            .live-btn {
              width: 100%;
            }
          }
        `}
      </style>

      <div className="live-wrapper">
        <div className="live-page-header">
          <h2 className="live-page-title">
            <FaVideo style={{ color: "#f97316" }} />
            Live Classes
          </h2>
          <p className="live-page-subtitle">View scheduled live classes.</p>
        </div>

        {loading ? (
          <div className="live-loading-state">Loading live classes...</div>
        ) : schedules.length === 0 ? (
          <div className="live-empty-state">
            <FaVideo style={{ fontSize: 36, color: "#d1d5db", marginBottom: 12 }} />
            <p>No live classes scheduled yet.</p>
          </div>
        ) : (
          <div className="live-schedule-grid">
            {schedules.map((schedule) => (
              <div key={schedule._id} className="live-schedule-card">
                <div className="live-card-header">
                  <div>
                    <h3 className="live-batch-name">{schedule.batchName}</h3>
                    <p className="live-subject">{schedule.subject}</p>
                  </div>
                </div>

                <div className="live-card-body">
                  <div className="live-info-row">
                    <div className="live-info-icon">
                      <FaCalendarAlt />
                    </div>
                    <div className="live-info-content">
                      <span className="live-info-label">Days</span>
                      <span className="live-info-value">
                        {formatDays(schedule.days)}
                      </span>
                    </div>
                  </div>

                  <div className="live-info-row">
                    <div className="live-info-icon">
                      <FaCalendarAlt />
                    </div>
                    <div className="live-info-content">
                      <span className="live-info-label">Duration</span>
                      <span className="live-info-value">
                        {formatDuration(schedule.startDate, schedule.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="live-info-row">
                    <div className="live-info-icon">
                      <FaClock />
                    </div>
                    <div className="live-info-content">
                      <span className="live-info-label">Time</span>
                      <span className="live-info-value">
                        {formatTime(schedule.startTime, schedule.endTime)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="live-card-actions">
                  <button
                    className="live-btn live-join-btn"
                    onClick={() => handleJoinClass(schedule)}
                    disabled={!schedule.meetLink}
                  >
                    Join Class
                  </button>
                  {(localStorage.getItem("userRole") === "teacher" ||
                    localStorage.getItem("userRole") === "trainee") && (
                    <button
                      className="live-btn live-delete-btn"
                      onClick={() => handleDeleteSchedule(schedule._id)}
                    >
                      <FaTrash />
                      Delete
                    </button>
                  )}  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
    );
};

export default LiveClass;