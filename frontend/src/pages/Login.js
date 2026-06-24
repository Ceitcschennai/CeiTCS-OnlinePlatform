import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/login.css";

function Login() {
  const [role, setRole] = useState("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (role === "admin") {
      if (email === "admin@onlinetuition.com" && password === "admin123") {
        localStorage.clear();
        localStorage.setItem("user", JSON.stringify({ email, role: "admin" }));
        localStorage.setItem("userRole", "admin");
        localStorage.setItem("role", "admin");
        navigate("/admin-dashboard");
      } else {
        setError("Invalid admin credentials. Please try again.");
      }
      setLoading(false);
      return;
    }

    try {
      const apiRole = role === "trainee" ? "teacher" : role;
      const res = await axios.post(`${API_BASE_URL}/api/auth/${apiRole}/login`, {
        email,
        password,
      });

      if (res.data.success) {
        localStorage.clear();
        const userData = res.data.user;
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("userRole", role);
        localStorage.setItem("role", role);

        if (role === "trainee") {
          const traineeData = {
            ...userData,
            id: userData._id || userData.id,
            name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
          };
          localStorage.setItem("teacher", JSON.stringify(traineeData));
          navigate("/teacher-dashboard");
        }

        if (role === "employee") {
          navigate("/employee-dashboard");
        }
      } else {
        setError(res.data.message || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    }

    setLoading(false);
  };

  const roleLabels = { employee: "Participant", trainee: "Faculty", admin: "Admin" };

  return (
    <div className="login-wrapper">

      {/* ════════ LEFT — BRAND PANEL ════════ */}
      <div className="login-left">
        <div className="login-left-blob login-left-blob--1" />
        <div className="login-left-blob login-left-blob--2" />

        <div className="brand-content">
          <div className="brand-logo-box">
            <img
              src="https://via.placeholder.com/150x50?text=CEITCS+Logo"
              alt="CEITCS Professional Academy Logo"
              style={{
              width: "80px", height: "44px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 900, fontSize: "16px",
              fontFamily: "'Nunito', sans-serif"}}
              />
          </div>

          <h1 className="brand-title">
            CEITCS<br />
            <span>Professional</span> Academy
          </h1>

          <p className="brand-desc">
            A premier online learning platform empowering learners, educators,
            and professionals to master new skills and advance their careers.
          </p>

          <div className="brand-stats">
            <div className="brand-stat">
              <span className="brand-stat-num">500+</span>
              <span className="brand-stat-lbl">Learners</span>
            </div>
            <div className="brand-stat">
              <span className="brand-stat-num">50+</span>
              <span className="brand-stat-lbl">Courses</span>
            </div>
            <div className="brand-stat">
              <span className="brand-stat-num">30+</span>
              <span className="brand-stat-lbl">Faculty</span>
            </div>
          </div>

          <div className="brand-features">
            {[
              { icon: "🚀", text: "Upskill with industry-driven courses" },
              { icon: "🌐", text: "Access classes anytime, anywhere" },
              { icon: "🤝", text: "Learn from expert mentors" },
              { icon: "📈", text: "Track progress with smart analytics" },
            ].map((f, i) => (
              <div key={i} className="brand-feature-row">
                <span className="brand-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ RIGHT — LOGIN FORM ════════ */}
      <div className="login-right">
        <div className="login-card">

          <div className="login-card-header">
            <h2>Welcome Back 👋</h2>
            <p>Sign in to continue your learning journey</p>
          </div>

          {/* Role Tabs */}
          <div className="role-tabs">
            {["employee", "trainee", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                className={`role-tab${role === r ? " role-tab--active" : ""}`}
                onClick={() => { setRole(r); setError(""); }}
              >
                {roleLabels[r]}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="login-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="login-field">
              <label>Email Address</label>
              <div className="login-input-wrap">
                <span className="login-field-icon">✉️</span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <span className="login-field-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              <button type="button" className="forgot-link" onClick={() => navigate(`/forgot-password?role=${role}`)}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : (
                `Login as ${roleLabels[role]}`
              )}
            </button>

            {role === "admin" && (
              <p className="login-hint">
                Default: admin@onlinetuition.com / admin123
              </p>
            )}
          </form>

          {/* ── Register Link ── */}
          <p className="login-register-link">
            Don't have an account?{" "}
            <Link to="/register">Register here →</Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;