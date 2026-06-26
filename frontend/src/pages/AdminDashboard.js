import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
import "../styles/adminDashboard.css";
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

const RejectModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [feedback, setFeedback] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    onSubmit(feedback);
    setFeedback("");
  };

  return (
    <div className="reject-modal-overlay">
      <div className="reject-modal">
        <h3>Rejection Feedback</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Enter feedback for rejection..."
          rows={4}
          disabled={loading}
        />
        <div className="reject-modal-actions">
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !feedback.trim()} className="submit-reject-btn">
            {loading ? "Processing..." : "Submit Rejection"}
          </button>
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
      const res = await fetch(`${API_BASE_URL}/api/admin/pending`);
      const data = await res.json();
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
    await fetch(`${API_BASE_URL}/api/employee/${selectedEmployee._id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Approved" })
    });
    setSelectedTeacher(null);
    fetchPending();
    setLoading(false);
  };

  const totalPending = pendingEmployees.length + pendingTeachers.length;

  return (
    <div className="admin-dashboard">

      {/* ── HEADER ── */}
      <div className="adm-header">
        <div className="adm-header-left">
          <div className="adm-header-icon"><FaTachometerAlt /></div>
          <div>
            <h1 className="adm-title">Admin Dashboard</h1>
            <p className="adm-subtitle">Manage approvals and monitor platform activity</p>
          </div>
        </div>
        <div className="adm-header-badge">
          <FaClock style={{ marginRight: 6 }} />
          {totalPending} Pending Approval{totalPending !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="adm-stats-row">
        <div className="adm-stat-card adm-stat-blue">
          <div className="adm-stat-icon"><FaUserTie /></div>
          <div className="adm-stat-info">
            <span className="adm-stat-num">{pendingEmployees.length}</span>
            <span className="adm-stat-lbl">Pending Participants</span>
          </div>
        </div>
        <div className="adm-stat-card adm-stat-purple">
          <div className="adm-stat-icon"><FaChalkboardTeacher /></div>
          <div className="adm-stat-info">
            <span className="adm-stat-num">{pendingTeachers.length}</span>
            <span className="adm-stat-lbl">Pending Faculty</span>
          </div>
        </div>
        <div className="adm-stat-card adm-stat-orange">
          <div className="adm-stat-icon"><FaClock /></div>
          <div className="adm-stat-info">
            <span className="adm-stat-num">{totalPending}</span>
            <span className="adm-stat-lbl">Total Pending</span>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="adm-grid">

        {/* ── EMPLOYEES SECTION ── */}
        <div className="adm-section">
          <div className="adm-section-header">
            <div className="adm-section-title">
              <FaUserTie className="adm-section-icon emp" />
              <span>Pending Participants</span>
            </div>
            <span className="adm-count-badge">{pendingEmployees.length}</span>
          </div>

          <div className="adm-list">
            {pendingEmployees.length === 0 ? (
              <div className="adm-empty">
                <FaCheckCircle className="adm-empty-icon" />
                <p>No pending participants</p>
              </div>
            ) : (
              pendingEmployees.map((emp) => (
                <div
                  key={emp._id}
                  className={`adm-user-card ${selectedEmployee?._id === emp._id ? "adm-selected" : ""}`}
                  onClick={() => { setSelectedEmployee(emp); setSelectedTeacher(null); }}
                >
                  <div className="adm-user-avatar emp">
                    {emp.firstName?.[0]?.toUpperCase() || "E"}
                  </div>
                  <div className="adm-user-info">
                    <strong>{emp.firstName} {emp.lastName}</strong>
                    <span><FaEnvelope style={{ marginRight: 4, fontSize: "0.75rem" }} />{emp.email}</span>
                  </div>
                  <FaChevronRight className="adm-card-arrow" />
                </div>
              ))
            )}
          </div>

          {/* Employee Detail Panel */}
          {selectedEmployee && (
            <div className="adm-detail-panel">
              <div className="adm-detail-header">
                <div className="adm-detail-avatar emp">
                  {selectedEmployee.firstName?.[0]?.toUpperCase() || "E"}
                </div>
                <div>
                  <h3>{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                  <span className="adm-detail-role">Participants</span>
                </div>
              </div>
              <div className="adm-detail-body">
                <div className="adm-detail-row">
                  <FaUser className="adm-detail-icon" />
                  <span><strong>First Name:</strong> {selectedEmployee.firstName}</span>
                </div>
                <div className="adm-detail-row">
                  <FaUser className="adm-detail-icon" />
                  <span><strong>Last Name:</strong> {selectedEmployee.lastName}</span>
                </div>
                <div className="adm-detail-row">
                  <FaEnvelope className="adm-detail-icon" />
                  <span><strong>Email:</strong> {selectedEmployee.email}</span>
                </div>
              </div>
              <div className="adm-detail-actions">
                 <button className="adm-approve-btn" onClick={approveEmployee} disabled={loading}>
                   <FaCheckCircle />
                   {loading ? "Processing..." : "Approve"}
                 </button>
                 <button className="adm-reject-btn" onClick={() => { setRejectType("employee"); setShowRejectModal(true);}} disabled={loading}>
                   <FaTimesCircle />
                   {loading ? "Processing..." : "Reject"}
                 </button>
               </div>
             </div>
           )}
         </div>

        {/* ── FACULTY SECTION ── */}
        <div className="adm-section">
          <div className="adm-section-header">
            <div className="adm-section-title">
              <FaChalkboardTeacher className="adm-section-icon fac" />
              <span>Pending Faculty</span>
            </div>
            <span className="adm-count-badge fac">{pendingTeachers.length}</span>
          </div>

          <div className="adm-list">
            {pendingTeachers.length === 0 ? (
              <div className="adm-empty">
                <FaCheckCircle className="adm-empty-icon" />
                <p>No pending faculty</p>
              </div>
            ) : (
              pendingTeachers.map((teacher) => (
                <div
                  key={teacher._id}
                  className={`adm-user-card ${selectedTeacher?._id === teacher._id ? "adm-selected" : ""}`}
                  onClick={() => { setSelectedTeacher(teacher); setSelectedEmployee(null); }}
                >
                  <div className="adm-user-avatar fac">
                    {teacher.firstName?.[0]?.toUpperCase() || "F"}
                  </div>
                  <div className="adm-user-info">
                    <strong>{teacher.firstName} {teacher.lastName}</strong>
                    <span><FaEnvelope style={{ marginRight: 4, fontSize: "0.75rem" }} />{teacher.email}</span>
                  </div>
                  <FaChevronRight className="adm-card-arrow" />
                </div>
              ))
            )}
          </div>

          {/* Faculty Detail Panel */}
          {selectedTeacher && (
            <div className="adm-detail-panel fac">
              <div className="adm-detail-header">
                <div className="adm-detail-avatar fac">
                  {selectedTeacher.firstName?.[0]?.toUpperCase() || "F"}
                </div>
                <div>
                  <h3>{selectedTeacher.firstName} {selectedTeacher.lastName}</h3>
                  <span className="adm-detail-role fac">Faculty</span>
                </div>
              </div>
              <div className="adm-detail-body">
                <div className="adm-detail-row">
                  <FaUser className="adm-detail-icon" />
                  <span><strong>First Name:</strong> {selectedTeacher.firstName}</span>
                </div>
                <div className="adm-detail-row">
                  <FaUser className="adm-detail-icon" />
                  <span><strong>Last Name:</strong> {selectedTeacher.lastName}</span>
                </div>
                <div className="adm-detail-row">
                  <FaEnvelope className="adm-detail-icon" />
                  <span><strong>Email:</strong> {selectedTeacher.email}</span>
                </div>
              </div>
              <div className="adm-detail-actions">
                 <button className="adm-approve-btn" onClick={approveTeacher} disabled={loading}>
                   <FaCheckCircle />
                   {loading ? "Processing..." : "Approve"}
                 </button>
                 <button className="adm-reject-btn" onClick={() => { setRejectType("teacher"); setShowRejectModal(true); }} disabled={loading}>
                   <FaTimesCircle />
                   {loading ? "Processing..." : "Reject"}
                 </button>
               </div>
             </div>
           )}
         </div>

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