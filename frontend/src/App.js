import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";              // ← Unified register page
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminApprovals from "./pages/AdminApprovals";

import Subjects from "./pages/Subjects";
import Assignments from "./pages/Assignments";
import Payments from "./pages/Payments";
import LiveClass from "./pages/LiveClass";
import NotFound from "./pages/NotFound";
import RaiseQuery from "./pages/RaiseQuery";
import SystemAlerts from "./pages/SystemAlerts";
import SubjectDetails from "./pages/SubjectDetails";

import ParticipantRegister from "./pages/ParticipantRegister";  // kept for backward compat
import FacultyRegister from "./pages/FacultyRegister";          // kept for backward compat
import ManageParticipant from "./pages/ManageParticipant";
import ManageSubjects from "./pages/ManageSubjects";
import ManageFaculty from "./pages/ManageFaculty";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";

import FacultySubjects from "./pages/FacultySubjects";
import FacultyAssignments from "./pages/FacultyAssignments";
import FacultySchedulePage from "./pages/FacultySchedulePage";
import FacultyDetails from "./pages/FacultyDetails";

import TakeAttendance from "./pages/TakeAttendance";
import StudentQueries from "./pages/StudentQueries";
import ParticipantQueries from "./pages/ParticipantQueries";

import MentorsPage from "./pages/MentorsPage";
import CourseDetailPage from "./pages/CourseDetailPage";

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTE
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ element, requiredRole }) => {
  const role = localStorage.getItem("userRole");
  return role === requiredRole ? element : <Navigate to="/login" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = window.innerWidth <= 768;

  const SIDEBAR_OPEN_WIDTH   = 250;
  const SIDEBAR_CLOSED_WIDTH = 60;

  const contentMargin = isMobile
    ? 0
    : isOpen
    ? SIDEBAR_OPEN_WIDTH
    : SIDEBAR_CLOSED_WIDTH;

  const Layout = (Component) => (
    <div style={{ display: "flex" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} isMobile={isMobile} />
      <div
        style={{
          flex: 1,
          padding: "20px",
          marginLeft: contentMargin,
          transition: "margin-left 0.2s ease",
          minHeight: "calc(100vh - 70px)",
          boxSizing: "border-box",
        }}
      >
        <Component />
      </div>
    </div>
  );

  return (
    <Router>
      <Navbar />
      <Routes>

        {/* ── PUBLIC ──────────────────────────────────────────────────────── */}
        <Route path="/"              element={<Home />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── UNIFIED REGISTER PAGE (new) ─────────────────────────────────── */}
        <Route path="/register"      element={<Register />} />

        {/* ── LEGACY REGISTER ROUTES (kept for backward compatibility) ─────── */}
        <Route path="/register/employee" element={<ParticipantRegister />} />
        <Route path="/register/trainee"  element={<FacultyRegister />} />

        <Route path="/raise-query"   element={Layout(RaiseQuery)} />

        {/* ── COURSES & MENTORS ────────────────────────────────────────────── */}
        <Route path="/mentors"       element={<MentorsPage />} />
        <Route path="/courses"       element={<CourseDetailPage />} />

        {/* ── MANAGEMENT ──────────────────────────────────────────────────── */}
        <Route path="/manage-employee"    element={Layout(ManageParticipant)} />
        <Route path="/manage-teachers"    element={Layout(ManageFaculty)} />
        <Route path="/employee-dashboard" element={Layout(ParticipantDashboard)} />
        <Route path="/manage-subjects"    element={Layout(ManageSubjects)} />

        {/* ── FACULTY (TRAINEE) ROUTES ─────────────────────────────────────── */}
        <Route path="/teacher-dashboard"   element={Layout(FacultyDashboard)} />
        <Route path="/teacher-subjects"    element={Layout(FacultySubjects)} />
        <Route path="/teacher-assignments" element={Layout(FacultyAssignments)} />
        <Route path="/teacher-schedule"    element={Layout(FacultySchedulePage)} />
        <Route path="/teacher-details"     element={Layout(FacultyDetails)} />
        <Route path="/take-attendance"     element={Layout(TakeAttendance)} />
        <Route path="/student-queries"     element={Layout(StudentQueries)} />

        {/* ── ADMIN (PROTECTED) ────────────────────────────────────────────── */}
        <Route
          path="/admin-dashboard"
          element={<ProtectedRoute element={Layout(AdminDashboard)} requiredRole="admin" />}
        />
        <Route
          path="/admin-approvals"
          element={<ProtectedRoute element={Layout(AdminApprovals)} requiredRole="admin" />}
        />

        {/* ── SHARED ──────────────────────────────────────────────────────── */}
        <Route path="/subjects"        element={Layout(Subjects)} />
        <Route path="/subject-details" element={Layout(SubjectDetails)} />
        <Route path="/assignments"     element={Layout(Assignments)} />
        <Route path="/payments"        element={Layout(Payments)} />
        <Route path="/live-class"      element={Layout(LiveClass)} />
        <Route path="/queries"         element={Layout(ParticipantQueries)} />
        <Route path="/alerts"          element={Layout(SystemAlerts)} />

        {/* ── 404 ─────────────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
  );
}

export default App;