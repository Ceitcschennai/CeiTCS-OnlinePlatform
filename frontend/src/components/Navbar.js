import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";

import companylogo from "../assets/companylogo.jpeg";

function Navbar() {

  const navigate = useNavigate();
  const location = useLocation();

  const userRole = localStorage.getItem("userRole");

  const [mobileOpen, setMobileOpen] = useState(false);

  const goToDashboard = () => {
    switch (userRole) {
      case "admin":
        navigate("/admin-dashboard");
        break;

      case "trainee":
        navigate("/teacher-dashboard");
        break;

      case "employee":
        navigate("employee-dashboard");
        break;

      default:
        navigate("/");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (

    <nav className="navbar">

      {/* LEFT LOGO */}
      <Link to="/" className="navbar-brand">

        <img
          src={companylogo}
          alt="CEITCS Logo"
          className="logo"
        />

        <div className="brand-text">
          <h1>CeiTCS</h1>
          <p>PROFESSIONAL ACADEMY</p>
        </div>

      </Link>

      {/* CENTER NAV */}
      <div className="navbar-links">

        <Link
          to="/"
          className={isActive("/") ? "nav-link active-link" : "nav-link"}
        >
          Home
        </Link>

        <Link
          to="/mentors"
          className={isActive("/mentors") ? "nav-link active-link" : "nav-link"}
        >
          Mentors
        </Link>

        <Link
          to="/courses"
          className={isActive("/courses") ? "nav-link active-link" : "nav-link"}
        >
          Courses
        </Link>

      </div>

      {/* RIGHT SIDE */}
      <div className="navbar-right">

        {!userRole ? (
          <>
            <Link
              to="/login"
              className={isActive("/login") ? "nav-link active-link" : "nav-link"}
            >
              Login
            </Link>

            <Link
              to="/register"
              className="register-btn"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            <button
              className="dashboard-btn"
              onClick={goToDashboard}
            >
              Dashboard
            </button>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* MOBILE MENU BUTTON */}
      <button
        className="menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        ☰
      </button>

      {/* MOBILE MENU */}
      {mobileOpen && (

        <div className="mobile-menu">

          <Link to="/" className="mobile-link">
            Home
          </Link>

          <Link to="/mentors" className="mobile-link">
            Mentors
          </Link>

          <Link to="/courses" className="mobile-link">
            Courses
          </Link>

          {!userRole ? (
            <>
              <Link to="/login" className="mobile-link">
                Login
              </Link>

              <Link to="/register" className="mobile-register">
                Register
              </Link>
            </>
          ) : (
            <>
              <button
                className="mobile-dashboard"
                onClick={goToDashboard}
              >
                Dashboard
              </button>

              <button
                className="mobile-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}

        </div>

      )}

    </nav>

  );
}

export default Navbar;