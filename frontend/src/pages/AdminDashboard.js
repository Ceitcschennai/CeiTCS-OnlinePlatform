import API_BASE_URL from "../config/api";
import React, { useEffect, useState } from "react";
import API_BASE, { apiFetch } from "../config/api";
import "../styles/adminDashboard.css";
import LMSCard from "../components/common/LMSCard";
import LMSButton from "../components/common/LMSButton";
import {
  FaUserTie,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaUser,
  FaClock,
  FaTachometerAlt,
  FaChevronRight
} from "react-icons/fa";

// Existing JWT token stored at login — sent on every protected API call
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const RejectModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [feedback, setFeedback] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    onSubmit(feedback);
    setFeedback("");
  };

  return (
    <div className="reject-modal-overlay" role="dialog" aria-modal="true" aria-label="Rejection feedback">
      <div className="reject-modal">
        <h3>Rejection Feedback</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Enter feedback for rejection..."
          rows={4}
          disabled={loading}
          className="input-lms"
        />
        <div className="reject-modal-actions">
          <LMSButton variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </LMSButton>
          <LMSButton
            variant="danger"
            onClick={handleSubmit}
            disabled={loading || !feedback.trim()}
            loading={loading}
          >
            Submit Rejection
          </LMSButton>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectType, setRejectType] = useState(null);
  const [feedback, setFeedback] = useState("");

  const fetchPending = async () => {
    try {
      const data = await apiFetch("/api/admin/pending", {
        headers: getAuthHeaders()
      });
      setPendingEmployees(data.employees || []);
      setPendingTeachers(data.teachers || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  // Approve Employee
  const approveEmployee = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    await apiFetch(`/api/employee/${selectedEmployee._id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "Approved" })
    });
    setSelectedEmployee(null);
    fetchPending();
    setLoading(false);
  };

  // Reject Employee
  const handleRejectEmployee = (feedback) => {
    if (!selectedEmployee) return;
    processEmployeeRejection(feedback);
  };

  const processEmployeeRejection = async (feedback) => {
    setLoading(true);
    await fetch(`${API_BASE_URL}/api/employee/${selectedEmployee._id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "Rejected",feedback: feedback})
    });
    setShowRejectModal(false);
    setSelectedEmployee(null);
    setFeedback("");
    setRejectType(null);
    fetchPending();
    setLoading(false);
  };

  // Reject Faculty
  const handleRejectTeacher = (feedback) => {
    if (!selectedTeacher) return;
    processTeacherRejection(feedback);
  };

  const processTeacherRejection = async (feedback) => {
    setLoading(true);
    await fetch(`${API_BASE_URL}/api/admin/trainees/${selectedTeacher._id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "Rejected", feedback: feedback })
    });
    setShowRejectModal(false);
    setSelectedTeacher(null);
    setFeedback("");
    setRejectType(null);
    fetchPending();
    setLoading(false);
  };

  // Approve Faculty
  const approveTeacher = async () => {
    if (!selectedTeacher) return;
    setLoading(true);
    await fetch(`${API_BASE_URL}/api/admin/trainees/${selectedTeacher._id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "Approved" })
    });
    setSelectedTeacher(null);
    fetchPending();
    setLoading(false);
  };

  const totalPending = pendingEmployees.length + pendingTeachers.length;

  return (
    <div className="admin-dashboard-modern">

      {/* ── HEADER ── */}
      <div className="adm-header-modern">
        <div className="adm-header-left">
          <div className="adm-header-icon-wrap">
            <FaTachometerAlt />
          </div>
          <div>
            <h1 className="adm-title-modern">Admin Dashboard</h1>
            <p className="adm-subtitle-modern">Manage approvals and monitor platform activity</p>
          </div>
        </div>
        <div className="adm-header-badge-modern">
          <FaClock />
          <span>{totalPending} Pending Approval{totalPending !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="adm-stats-grid">
        <LMSCard className="adm-stat-card adm-stat-card--blue" hover>
          <div className="adm-stat-card-inner">
            <div className="adm-stat-icon-wrap adm-stat-icon--blue">
              <FaUserTie />
            </div>
            <div className="adm-stat-info">
              <span className="adm-stat-value">{pendingEmployees.length}</span>
              <span className="adm-stat-label">Pending Participants</span>
            </div>
          </div>
        </LMSCard>
        <LMSCard className="adm-stat-card adm-stat-card--purple" hover>
          <div className="adm-stat-card-inner">
            <div className="adm-stat-icon-wrap adm-stat-icon--purple">
              <FaChalkboardTeacher />
            </div>
            <div className="adm-stat-info">
              <span className="adm-stat-value">{pendingTeachers.length}</span>
              <span className="adm-stat-label">Pending Faculty</span>
            </div>
          </div>
        </LMSCard>
        <LMSCard className="adm-stat-card adm-stat-card--orange" hover>
          <div className="adm-stat-card-inner">
            <div className="adm-stat-icon-wrap adm-stat-icon--orange">
              <FaClock />
            </div>
            <div className="adm-stat-info">
              <span className="adm-stat-value">{totalPending}</span>
              <span className="adm-stat-label">Total Pending</span>
            </div>
          </div>
        </LMSCard>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="adm-content-grid">

        {/* ── EMPLOYEES SECTION ── */}
        <LMSCard className="adm-section-card" padding="none">
          <div className="adm-section-header">
            <div className="adm-section-title">
              <FaUserTie className="adm-section-icon adm-section-icon--emp" />
              <span>Pending Participants</span>
            </div>
            <span className="adm-count-badge adm-count-badge--emp">{pendingEmployees.length}</span>
          </div>

          <div className="adm-list">
            {pendingEmployees.length === 0 ? (
              <div className="adm-empty">
                <FaCheckCircle className="adm-empty-icon" />
                <p>No pending participants</p>
              </div>
            ) : (
              pendingEmployees.map((emp) => (
                <div key={emp._id} className="adm-list-item-wrapper">
                  <div
                    className={`adm-user-item ${selectedEmployee?._id === emp._id ? "adm-user-item--selected" : ""}`}
                    onClick={() => { 
                      setSelectedEmployee(prev => prev?._id === emp._id ? null : emp); 
                      setSelectedTeacher(null); 
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { 
                      setSelectedEmployee(prev => prev?._id === emp._id ? null : emp); 
                      setSelectedTeacher(null); 
                    }}}
                  >
                    <div className="adm-user-avatar adm-user-avatar--emp">
                      {emp.firstName?.[0]?.toUpperCase() || "E"}
                    </div>
                    <div className="adm-user-details">
                      <span className="adm-user-name">{emp.firstName} {emp.lastName}</span>
                      <span className="adm-user-email">
                        <FaEnvelope /> {emp.email}
                      </span>
                    </div>
                    <FaChevronRight className="adm-user-arrow" />
                  </div>
                  {selectedEmployee?._id === emp._id && (
                    <div className="adm-detail-panel adm-detail-panel--emp">
                      <div className="adm-detail-header">
                        <div className="adm-detail-avatar adm-detail-avatar--emp">
                          {selectedEmployee.firstName?.[0]?.toUpperCase() || "E"}
                        </div>
                        <div>
                          <h3 className="adm-detail-name">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                          <span className="adm-detail-role adm-detail-role--emp">Participant</span>
                        </div>
                      </div>
                      <div className="adm-detail-body">
                        <div className="adm-detail-row">
                          <FaUser className="adm-detail-row-icon" />
                          <span><strong>First Name:</strong> {selectedEmployee.firstName}</span>
                        </div>
                        <div className="adm-detail-row">
                          <FaUser className="adm-detail-row-icon" />
                          <span><strong>Last Name:</strong> {selectedEmployee.lastName}</span>
                        </div>
                        <div className="adm-detail-row">
                          <FaEnvelope className="adm-detail-row-icon" />
                          <span><strong>Email:</strong> {selectedEmployee.email}</span>
                        </div>
                      </div>
                      <div className="adm-detail-actions">
                        <LMSButton variant="success" onClick={approveEmployee} disabled={loading} loading={loading} fullWidth>
                          <FaCheckCircle /> Approve
                        </LMSButton>
                        <LMSButton variant="danger" onClick={() => { setRejectType("employee"); setShowRejectModal(true);}} disabled={loading} fullWidth>
                          <FaTimesCircle /> Reject
                        </LMSButton>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </LMSCard>

        {/* ── FACULTY SECTION ── */}
        <LMSCard className="adm-section-card" padding="none">
          <div className="adm-section-header">
            <div className="adm-section-title">
              <FaChalkboardTeacher className="adm-section-icon adm-section-icon--fac" />
              <span>Pending Faculty</span>
            </div>
            <span className="adm-count-badge adm-count-badge--fac">{pendingTeachers.length}</span>
          </div>

          <div className="adm-list">
            {pendingTeachers.length === 0 ? (
              <div className="adm-empty">
                <FaCheckCircle className="adm-empty-icon" />
                <p>No pending faculty</p>
              </div>
            ) : (
              pendingTeachers.map((teacher) => (
                <div key={teacher._id} className="adm-list-item-wrapper">
                  <div
                    className={`adm-user-item ${selectedTeacher?._id === teacher._id ? "adm-user-item--selected" : ""}`}
                    onClick={() => { 
                      setSelectedTeacher(prev => prev?._id === teacher._id ? null : teacher); 
                      setSelectedEmployee(null); 
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { 
                      setSelectedTeacher(prev => prev?._id === teacher._id ? null : teacher); 
                      setSelectedEmployee(null); 
                    }}}
                  >
                    <div className="adm-user-avatar adm-user-avatar--fac">
                      {teacher.firstName?.[0]?.toUpperCase() || "F"}
                    </div>
                    <div className="adm-user-details">
                      <span className="adm-user-name">{teacher.firstName} {teacher.lastName}</span>
                      <span className="adm-user-email">
                        <FaEnvelope /> {teacher.email}
                      </span>
                    </div>
                    <FaChevronRight className="adm-user-arrow" />
                  </div>
                  {selectedTeacher?._id === teacher._id && (
                    <div className="adm-detail-panel adm-detail-panel--fac">
                      <div className="adm-detail-header">
                        <div className="adm-detail-avatar adm-detail-avatar--fac">
                          {selectedTeacher.firstName?.[0]?.toUpperCase() || "F"}
                        </div>
                        <div>
                          <h3 className="adm-detail-name">{selectedTeacher.firstName} {selectedTeacher.lastName}</h3>
                          <span className="adm-detail-role adm-detail-role--fac">Faculty</span>
                        </div>
                      </div>
                      <div className="adm-detail-body">
                        <div className="adm-detail-row">
                          <FaUser className="adm-detail-row-icon" />
                          <span><strong>First Name:</strong> {selectedTeacher.firstName}</span>
                        </div>
                        <div className="adm-detail-row">
                          <FaUser className="adm-detail-row-icon" />
                          <span><strong>Last Name:</strong> {selectedTeacher.lastName}</span>
                        </div>
                        <div className="adm-detail-row">
                          <FaEnvelope className="adm-detail-row-icon" />
                          <span><strong>Email:</strong> {selectedTeacher.email}</span>
                        </div>
                      </div>
                      <div className="adm-detail-actions">
                        <LMSButton variant="success" onClick={approveTeacher} disabled={loading} loading={loading} fullWidth>
                          <FaCheckCircle /> Approve
                        </LMSButton>
                        <LMSButton variant="danger" onClick={() => { setRejectType("teacher"); setShowRejectModal(true); }} disabled={loading} fullWidth>
                          <FaTimesCircle /> Reject
                        </LMSButton>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </LMSCard>

      </div>

      <RejectModal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectType(null); }}
        onSubmit={rejectType === "employee" ? handleRejectEmployee : handleRejectTeacher}
        loading={loading}
      />
    </div>
  );
};

export default AdminDashboard;