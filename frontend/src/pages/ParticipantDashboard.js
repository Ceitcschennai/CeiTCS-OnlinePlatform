import React, { useEffect, useState } from "react";
import {
  FaBookOpen, FaTasks, FaQuestionCircle, FaVideo,
  FaUserCircle, FaClock, FaStar, FaCheckCircle,
  FaBell, FaTrophy, FaMedal, FaFire, FaChartLine,
  FaCalendarAlt, FaBullhorn, FaEdit, FaSave,
  FaUserTie, FaBriefcase, FaCheckCircle as FaCheckCircleSolid
} from "react-icons/fa";
import API_BASE_URL from "../config/api";
import "../styles/participantDashboard.css";

const ParticipantDashboard = () => {
  const [user, setUser] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // ░░ PROFILE MODAL ░░
  const [showProfile, setShowProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const blankForm = {
    salutation: "", firstName: "", lastName: "",
    email: "", mobile: "", role: "",
    skills: "", approvalStatus: "", paymentStatus: ""
  };
  const [formData, setFormData] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Derive approved user from localStorage once
  const [approvedUser, setApprovedUser] = useState(null);
  useEffect(() => {
    if (user && user.email) {
      fetch(`${API_BASE_URL}/api/employee`)
        .then(r => r.json())
        .then(list => {
          const found = list.find(e => e.email === user.email);
          if (found) setApprovedUser(found);
        })
        .catch(() => {});
    }
  }, [user]);

  // Derive participant from approvedUser or user
  const participant = approvedUser || user;

// ── Upcoming Live Classes (from API) ──
   const [upcomingClasses, setUpcomingClasses] = useState([]);
   const [loadingUpcoming, setLoadingUpcoming] = useState(true);

   useEffect(() => {
     const loadUpcomingClasses = async () => {
       const employeeId = approvedUser?._id || approvedUser?.id;
       if (!employeeId) return;
       setLoadingUpcoming(true);
       try {
         // Step 1: Get participant enrolled subjects
         const subjectsRes = await fetch(`${API_BASE_URL}/api/queries/participant/${employeeId}/subjects`);
         const subjectsData = await subjectsRes.json();

         // Step 2: Extract courseCode values from response.subjects
         const courseCodes = (subjectsData.subjects || []).map(s => s.courseCode).filter(Boolean);

         if (courseCodes.length === 0) {
           setUpcomingClasses([]);
           return;
         }

         // Step 3: Get schedules for enrolled courses
         const schedRes = await fetch(`${API_BASE_URL}/api/schedules/by-codes?codes=${courseCodes.join(",")}`);
         const schedules = await schedRes.json();

         // Step 4-5: Filter to upcoming schedules only and sort by startDate ascending
         const now = new Date();
         const upcoming = schedules
           .filter(s => s.startDate && new Date(s.startDate) >= now)
           .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

         setUpcomingClasses(upcoming);
       } catch (err) {
         console.error("Error loading upcoming classes:", err);
         setUpcomingClasses([]);
       } finally {
         setLoadingUpcoming(false);
       }
     };
     loadUpcomingClasses();
   }, [approvedUser]);

  // Open modal
  const openProfile = () => {
    const data = participant || blankForm;
    setFormData({
      salutation: data.salutation || "",
      firstName: data.firstName || "",
      lastName:  data.lastName  || "",
      email:     data.email     || "",
      mobile:    data.mobile    || "",
      role:      data.role      || "",
      skills:    data.skills    || "",
      approvalStatus: data.approvalStatus || "",
      paymentStatus:  data.paymentStatus  || ""
    });
    setErrors({});
    setSaveMsg("");
    setEditMode(false);
    setShowProfile(true);
  };

  // Close modal (always resets edit state)
  const closeProfile = () => {
    setShowProfile(false);
    setEditMode(false);
    setErrors({});
    setSaveMsg("");
    setFormData(blankForm);
  };

  // Input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  // Edit button
  const startEdit = () => {
    setEditMode(true);
    setErrors({});
    setSaveMsg("");
  };

  // Cancel edit
  const cancelEdit = () => {
    const data = participant || blankForm;
    setFormData({
      salutation: data.salutation || "",
      firstName:  data.firstName  || "",
      lastName:   data.lastName   || "",
      email:      data.email      || "",
      mobile:     data.mobile     || "",
      skills:     data.skills     || "",
      role:       data.role       || "",
      approvalStatus: data.approvalStatus || "",
      paymentStatus:  data.paymentStatus  || ""
    });
    setErrors({});
    setSaveMsg("");
    setEditMode(false);
  };

  // Save profile
  const saveProfile = async () => {
    if (!participant?._id) return;
    const newErr = {};
    if (!formData.firstName.trim()) newErr.firstName = "First name is required";
    if (!formData.lastName.trim())  newErr.lastName  = "Last name is required";
    if (!formData.email.trim())     newErr.email     = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
                                  newErr.email = "Invalid email format";
    if (!formData.mobile.trim())    newErr.mobile    = "Mobile is required";
    else if (!/^\d{10}$/.test(formData.mobile.replace(/\s/g, "")))
                                  newErr.mobile = "Mobile must be exactly 10 digits";

    if (Object.keys(newErr).length) {
      setErrors(newErr);
      return;
    }

    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee/${participant._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salutation: formData.salutation,
          firstName:  formData.firstName,
          lastName:   formData.lastName,
          email:      formData.email,
          mobile:     formData.mobile,
          skills:     formData.skills
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      // Refresh local user & approved user
      setApprovedUser(data);
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...parsed, ...data };
        localStorage.setItem("user", JSON.stringify(merged));
        setUser(merged);
      }
      setEditMode(false);
      setSaveMsg("✅ Profile updated successfully");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Status helpers
  const approvalColor = (s) => s === "Approved" ? "#059669" : s === "Rejected" ? "#dc2626" : "#d97706";
  const paymentColor  = (s) => s === "Paid" ? "#059669" : "#dc2626";

  // Initials
  const initials = `${participant?.firstName?.charAt(0) || ""}${participant?.lastName?.charAt(0) || ""}`.toUpperCase() || "?";

  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  // PROFILE MODAL JSX
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  const ProfileModal = () => {
    if (!showProfile) return null;

    const field = (label, name, value, editable = true, isSelect = false, options = []) => {
      const err = errors[name];
      const displayValue = value ?? "";
      return (
        <div style={pm.fieldGroup}>
          <label style={pm.label}>{label}</label>
          {isSelect ? (
            <select
              name={name}
              value={displayValue}
              onChange={handleChange}
              disabled={!editMode}
              style={{ ...pm.input, ...(err ? pm.inputError : {}), opacity: editMode ? 1 : 0.7 }}
            >
              <option value="">Select</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type="text"
              name={name}
              value={displayValue}
              onChange={handleChange}
              readOnly={!editable}
              style={{ ...pm.input, ...(err ? pm.inputError : {}), opacity: editMode ? 1 : 0.7, cursor: editMode && editable ? "text" : "not-allowed" }}
            />
          )}
          {err && <span style={pm.errorText}>{err}</span>}
        </div>
      );
    };

    return (
      <div style={pm.overlay} onClick={closeProfile}>
        <div style={pm.modal} onClick={(e) => e.stopPropagation()}>

          {/* ── HEADER ── */}
          <div style={pm.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "50px", height: "50px", borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: "700", fontSize: "1.2rem",
                border: "2px solid rgba(255,255,255,0.4)", flexShrink: 0
              }}>
                {initials}
              </div>
              <div>
                <h2 style={{ color: "white", margin: 0, fontSize: "1.15rem", fontWeight: "700" }}>
                  {participant?.salutation ? `${participant.salutation} ` : ""}{participant?.firstName} {participant?.lastName}
                </h2>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem" }}>
                  {participant?.role}
                </span>
              </div>
            </div>
            <button onClick={closeProfile} style={pm.closeBtn}>✕</button>
          </div>

          {/* ── SAVE MESSAGE ── */}
          {saveMsg && (
            <div style={{
              margin: "14px 22px 0",
              padding: "10px 14px",
              borderRadius: "8px",
              background: saveMsg.startsWith("✅") ? "#d1fae5" : "#fee2e2",
              color: saveMsg.startsWith("✅") ? "#065f46" : "#991b1b",
              fontSize: "0.85rem", fontWeight: "600"
            }}>
              {saveMsg}
            </div>
          )}

          {/* ── BODY ── */}
          <div style={pm.body}>

            {/* Personal Information */}
            <div style={pm.section}>
              <div style={pm.sectionHeader}>
                <FaUserTie style={{ color: "#2563eb", marginRight: "8px", fontSize: "0.9rem" }} />
                <span style={{ fontWeight: "700", color: "#1f2937", fontSize: "0.9rem" }}>Personal Information</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {field("Salutation", "salutation", formData.salutation, true, true, ["Mr", "Ms", "Mrs"])}
                {field("First Name *", "firstName", formData.firstName)}
                {field("Last Name *", "lastName", formData.lastName)}
                {field("Email *", "email", formData.email)}
                {field("Mobile *", "mobile", formData.mobile)}
              </div>
            </div>

            {/* Professional Information */}
            <div style={pm.section}>
              <div style={pm.sectionHeader}>
                <FaBriefcase style={{ color: "#7c3aed", marginRight: "8px", fontSize: "0.9rem" }} />
                <span style={{ fontWeight: "700", color: "#1f2937", fontSize: "0.9rem" }}>Professional Information</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {field("Role", "role", formData.role, false)}
                {field("Skills", "skills", formData.skills)}
              </div>
            </div>

            {/* Account Information */}
            <div style={pm.section}>
              <div style={pm.sectionHeader}>
                <FaCheckCircleSolid style={{ color: "#059669", marginRight: "8px", fontSize: "0.9rem" }} />
                <span style={{ fontWeight: "700", color: "#1f2937", fontSize: "0.9rem" }}>Account Information</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={pm.fieldGroup}>
                  <label style={pm.label}>Approval Status</label>
                  <div style={{ ...pm.badge, background: `${approvalColor(formData.approvalStatus)}18`, color: approvalColor(formData.approvalStatus), border: `1.5px solid ${approvalColor(formData.approvalStatus)}44` }}>
                    {formData.approvalStatus}
                  </div>
                </div>
                <div style={pm.fieldGroup}>
                  <label style={pm.label}>Payment Status</label>
                  <div style={{ ...pm.badge, background: `${paymentColor(formData.paymentStatus)}18`, color: paymentColor(formData.paymentStatus), border: `1.5px solid ${paymentColor(formData.paymentStatus)}44` }}>
                    {formData.paymentStatus}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── FOOTER ── */}
          <div style={pm.footer}>
            {!editMode ? (
              <button onClick={startEdit} style={pm.editBtn}>
                <FaEdit style={{ marginRight: "7px" }} /> Edit Profile
              </button>
            ) : (
              <>
                <button onClick={saveProfile} disabled={saving} style={{ ...pm.saveBtn, opacity: saving ? 0.7 : 1 }}>
                  <FaSave style={{ marginRight: "7px" }} /> {saving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={cancelEdit} disabled={saving} style={pm.cancelBtn}>
                  Cancel
                </button>
              </>
            )}
            <button onClick={closeProfile} style={pm.closeBtnSecondary}>Close</button>
          </div>

        </div>
      </div>
    );
  };

  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  // PROFILE MODAL STYLES
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  const pm = {
    overlay: {
      position: "fixed", inset: 0,
      background: "rgba(15, 23, 42, 0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "20px",
      backdropFilter: "blur(4px)"
    },
    modal: {
      background: "white",
      borderRadius: "18px",
      width: "100%", maxWidth: "640px",
      maxHeight: "90vh", overflowY: "auto",
      boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
      animation: "pmFadeIn 0.25s ease",
      position: "relative"
    },
    header: {
      background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #7c3aed 100%)",
      padding: "22px 24px",
      borderRadius: "18px 18px 0 0",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      position: "sticky", top: 0, zIndex: 10
    },
    closeBtn: {
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.3)",
      color: "white", width: "32px", height: "32px",
      borderRadius: "50%", cursor: "pointer",
      fontSize: "0.9rem", fontWeight: "700",
      display: "flex", alignItems: "center", justifyContent: "center"
    },
    body: { padding: "22px 24px 10px" },
    section: { marginBottom: "22px" },
    sectionHeader: {
      display: "flex", alignItems: "center",
      paddingBottom: "10px",
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "14px"
    },
    fieldGroup: { display: "flex", flexDirection: "column", gap: "5px" },
    label: { fontSize: "0.78rem", fontWeight: "600", color: "#4b5563" },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "8px",
      border: "1.5px solid #d1d5db",
      fontSize: "0.88rem",
      outline: "none",
      background: editMode ? "#fff" : "#f9fafb",
      transition: "border-color 0.2s ease",
      color: "#1f2937"
    },
    inputError: { borderColor: "#dc2626 !important", background: "#fff5f5 !important" },
    errorText: { fontSize: "0.75rem", color: "#dc2626", marginTop: "2px", fontWeight: "500" },
    badge: {
      display: "inline-flex", alignItems: "center",
      padding: "8px 16px", borderRadius: "20px",
      fontWeight: "700", fontSize: "0.82rem", textAlign: "center",
      justifyContent: "center"
    },
    footer: {
      padding: "14px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex", gap: "10px", justifyContent: "flex-end",
      alignItems: "center",
      flexWrap: "wrap",
      borderRadius: "0 0 18px 18px",
      background: "#f9fafb"
    },
    editBtn: {
      background: "linear-gradient(135deg, #2563eb, #4f46e5)",
      color: "white", border: "none",
      padding: "10px 20px", borderRadius: "10px",
      fontSize: "0.88rem", fontWeight: "700", cursor: "pointer",
      display: "flex", alignItems: "center",
      boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
      transition: "transform 0.15s ease"
    },
    saveBtn: {
      background: "linear-gradient(135deg, #059669, #10b981)",
      color: "white", border: "none",
      padding: "10px 20px", borderRadius: "10px",
      fontSize: "0.88rem", fontWeight: "700", cursor: "pointer",
      display: "flex", alignItems: "center",
      boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
      transition: "transform 0.15s ease"
    },
    cancelBtn: {
      background: "white",
      color: "#374151", border: "1.5px solid #d1d5db",
      padding: "10px 20px", borderRadius: "10px",
      fontSize: "0.88rem", fontWeight: "600", cursor: "pointer",
      transition: "background 0.2s ease"
    },
    closeBtnSecondary: {
      background: "transparent",
      color: "#6b7280", border: "none",
      padding: "10px 16px", borderRadius: "10px",
      fontSize: "0.85rem", fontWeight: "600", cursor: "pointer"
    },
  };

  const s = {
    wrapper: { padding: "24px", maxWidth: "960px", margin: "0 auto" },

    header: {
      background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #7c3aed 100%)",
      borderRadius: "16px", padding: "28px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: "24px", flexWrap: "wrap", gap: "16px",
      boxShadow: "0 4px 20px rgba(37,99,235,0.25)"
    },
    headerLeft: { display: "flex", alignItems: "center", gap: "18px" },
    avatar: {
      width: "56px", height: "56px", borderRadius: "50%",
      background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.3rem", fontWeight: "700", color: "white", flexShrink: 0
    },
    welcomeTitle: { fontSize: "1.5rem", fontWeight: "700", color: "white", margin: 0 },
    welcomeSub: { color: "rgba(255,255,255,0.8)", margin: "4px 0 0", fontSize: "0.88rem" },
    headerBadge: {
      background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
      color: "white", padding: "8px 18px", borderRadius: "20px",
      fontWeight: "600", fontSize: "0.9rem", display: "flex", alignItems: "center"
    },

    statsGrid: {
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "14px", marginBottom: "20px"
    },
    statCard: {
      borderRadius: "12px", padding: "18px",
      display: "flex", alignItems: "center", gap: "14px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
    },
    statIcon: {
      width: "42px", height: "42px", borderRadius: "10px",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.1rem", flexShrink: 0
    },
    statValue: { fontSize: "1.6rem", fontWeight: "800", lineHeight: 1 },
    statLabel: { fontSize: "0.76rem", color: "#6b7280", marginTop: "3px", fontWeight: "500" },

    twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },

    card: {
      background: "white", borderRadius: "14px", padding: "20px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #f3f4f6",
      marginBottom: "4px"
    },
    cardHeader: { display: "flex", alignItems: "center", marginBottom: "16px" },
    cardTitle: { fontSize: "1rem", fontWeight: "700", color: "#1f2937" },

    progressTrack: { background: "#f3f4f6", borderRadius: "999px", height: "8px", overflow: "hidden" },
    progressFill: { height: "8px", borderRadius: "999px", transition: "width 0.5s ease" },

    liveRow: {
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 12px", borderRadius: "10px", background: "#fafafa",
      border: "1px solid #f3f4f6"
    },
    liveDot: {
      width: "34px", height: "34px", borderRadius: "8px",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.85rem", flexShrink: 0
    },

    achieveCard: {
      borderRadius: "10px", padding: "12px 8px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "6px"
    },
    achieveIcon: {
      width: "36px", height: "36px", borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1rem"
    },
    earnedBadge: {
      fontSize: "0.68rem", fontWeight: "700", color: "#059669",
      background: "#d1fae5", padding: "2px 8px", borderRadius: "999px"
    },

    announcRow: {
      display: "flex", alignItems: "flex-start", gap: "10px",
      padding: "10px 12px", borderRadius: "8px", background: "#fafafa"
    },
    announcDot: {
      width: "28px", height: "28px", borderRadius: "6px",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: "1px"
    },

    activityRow: { display: "flex", alignItems: "center", gap: "14px", padding: "12px 4px" },
    activityIcon: {
      width: "30px", height: "30px", borderRadius: "50%",
      background: "#f9fafb", display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: "0.9rem", flexShrink: 0
    },
    activityText: { fontSize: "0.88rem", color: "#1f2937", fontWeight: "500" },
    activityTime: { fontSize: "0.75rem", color: "#9ca3af", marginTop: "2px" },
  };

  if (!user) {
    return (
      <div className="dashboard-content">
        <p>Please login to access the dashboard.</p>
      </div>
    );
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Participant";
  const initialsDash = `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "P";
  const enrolledCount = participant?.enrolledSubjects?.length || 0;

  const stats = [
    { label: "Courses Enrolled", value: enrolledCount.toString(), icon: <FaBookOpen />, color: "#0d9488", bg: "#f0fdfa" },
    { label: "Assignments", value: "5", icon: <FaTasks />, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Pending Queries", value: "2", icon: <FaQuestionCircle />, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Live Classes", value: "1", icon: <FaVideo />, color: "#ef4444", bg: "#fef2f2" },
  ];

  const progress = [
    { subject: "Python", pct: 75, color: "#0d9488" },
    { subject: "MERN Stack", pct: 50, color: "#7c3aed" },
    { subject: "Java", pct: 30, color: "#f59e0b" },
    { subject: "SQL", pct: 90, color: "#2563eb" },
  ];

  const achievements = [
    { icon: <FaTrophy />, label: "First Assignment", desc: "Submitted your first assignment", color: "#f59e0b", earned: true },
    { icon: <FaMedal />, label: "Quiz Master", desc: "Scored 90%+ on a practice test", color: "#7c3aed", earned: true },
    { icon: <FaFire />, label: "7-Day Streak", desc: "Logged in 7 days in a row", color: "#ef4444", earned: false },
    { icon: <FaStar />, label: "Top Learner", desc: "Completed 5 subjects", color: "#0d9488", earned: false },
  ];

  const announcements = [
    { title: "New Python module uploaded", time: "Today, 10:00 AM", type: "info", color: "#2563eb" },
    { title: "Live class scheduled: MERN Stack — Tomorrow 3 PM", time: "Today, 9:00 AM", type: "live", color: "#ef4444" },
    { title: "Payment due for next month", time: "Yesterday", type: "alert", color: "#f59e0b" },
  ];

  const activities = [
    { icon: <FaCheckCircle style={{ color: "#059669" }} />, text: "Assignment submitted: Python Basics", time: "2 hours ago" },
    { icon: <FaBell style={{ color: "#f59e0b" }} />, text: "New query reply from Faculty", time: "5 hours ago" },
    { icon: <FaVideo style={{ color: "#ef4444" }} />, text: "Live class joined: MERN Stack", time: "Yesterday" },
    { icon: <FaStar style={{ color: "#f59e0b" }} />, text: "Completed: JavaScript Practice Test", time: "2 days ago" },
  ];

  return (
    <main className="dashboard-content" style={s.wrapper}>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.avatar}>{initialsDash}</div>
          <div>
            <h1 style={s.welcomeTitle}>Welcome back, {fullName}!</h1>
            <p style={s.welcomeSub}>Track your learning progress and stay on top of your activities</p>
          </div>
        </div>
        <button
          onClick={openProfile}
          style={{
            ...s.headerBadge,
            cursor: "pointer",
            background: "rgba(255,255,255,0.2)",
            border: "1.5px solid rgba(255,255,255,0.4)",
            transition: "background 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
        >
          <FaUserCircle style={{ fontSize: 18, marginRight: 7 }} />
          Participant
        </button>
      </div>

      {/* STAT CARDS */}
      <div style={s.statsGrid}>
        {stats.map((st, i) => (
          <div key={i} style={{ ...s.statCard, background: st.bg, border: `1.5px solid ${st.color}22` }}>
            <div style={{ ...s.statIcon, color: st.color, background: `${st.color}18` }}>{st.icon}</div>
            <div>
              <div style={{ ...s.statValue, color: st.color }}>{st.value}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PROGRESS + UPCOMING */}
      <div style={s.twoCol}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <FaChartLine style={{ color: "#0d9488", marginRight: 8 }} />
            <span style={s.cardTitle}>My Progress</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {progress.map((p, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "#374151" }}>{p.subject}</span>
                  <span style={{ fontSize: "0.82rem", color: p.color, fontWeight: "700" }}>{p.pct}%</span>
                </div>
                <div style={s.progressTrack}>
                  <div style={{ ...s.progressFill, width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <FaCalendarAlt style={{ color: "#ef4444", marginRight: 8 }} />
            <span style={s.cardTitle}>Upcoming Live Classes</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loadingUpcoming ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                Loading Upcoming Live Classes...
              </div>
            ) : upcomingClasses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                No Upcoming Live Classes
              </div>
            ) : (
              upcomingClasses.map((cls, i) => {
                const colors = ["#7c3aed", "#0d9488", "#2563eb"];
                return (
                  <div key={cls._id || i} style={{ ...s.liveRow, borderLeft: `4px solid ${colors[i % colors.length]}` }}>
                    <div style={{ ...s.liveDot, background: `${colors[i % colors.length]}18`, color: colors[i % colors.length] }}>
                      <FaVideo />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "700", color: "#1f2937", fontSize: "0.92rem" }}>{cls.subject}</div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>by {cls.batchName || "Faculty"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: "700", color: colors[i % colors.length] }}>
                        {cls.startDate ? new Date(cls.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{cls.time || ""}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS + ANNOUNCEMENTS */}
      <div style={s.twoCol}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <FaTrophy style={{ color: "#f59e0b", marginRight: 8 }} />
            <span style={s.cardTitle}>Achievements</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {achievements.map((a, i) => (
              <div key={i} style={{
                ...s.achieveCard,
                background: a.earned ? `${a.color}12` : "#f9fafb",
                border: `1.5px solid ${a.earned ? a.color + "44" : "#e5e7eb"}`,
                opacity: a.earned ? 1 : 0.55
              }}>
                <div style={{ ...s.achieveIcon, color: a.earned ? a.color : "#9ca3af", background: a.earned ? `${a.color}18` : "#f3f4f6" }}>
                  {a.icon}
                </div>
                <div style={{ fontWeight: "700", fontSize: "0.8rem", color: a.earned ? "#1f2937" : "#9ca3af" }}>{a.label}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", textAlign: "center", lineHeight: 1.3 }}>{a.desc}</div>
                {a.earned && <span style={s.earnedBadge}>✓ Earned</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <FaBullhorn style={{ color: "#2563eb", marginRight: 8 }} />
            <span style={s.cardTitle}>Announcements</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {announcements.map((a, i) => (
              <div key={i} style={{ ...s.announcRow, borderLeft: `4px solid ${a.color}` }}>
                <div style={{ ...s.announcDot, background: `${a.color}15`, color: a.color }}>
                  <FaBullhorn style={{ fontSize: "0.8rem" }} />
                </div>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "0.88rem", color: "#1f2937" }}>{a.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <FaClock style={{ color: "#6b7280", marginRight: 8 }} />
          <span style={s.cardTitle}>Recent Activity</span>
        </div>
        <div>
          {activities.map((a, i) => (
            <div key={i} style={{
              ...s.activityRow,
              borderBottom: i < activities.length - 1 ? "1px solid #f3f4f6" : "none"
            }}>
              <div style={s.activityIcon}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={s.activityText}>{a.text}</div>
                <div style={s.activityTime}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProfileModal />

    </main>
  );
};

export default ParticipantDashboard;