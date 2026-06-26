import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/register.css";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { isValidPhoneNumber } from "libphonenumber-js";
import moment from "moment-timezone";


/* ─────────────────────────────────────────────
   PASSWORD STRENGTH HELPER
───────────────────────────────────────────── */
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[@$!%*?&#^().,]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#0E7490"];
  return { score, label: labels[score] || "", color: colors[score] || "#E5E7EB" };
}

const FACULTY_REGEX     = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PARTICIPANT_REGEX = /^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

const TIMEZONE_OPTIONS = moment.tz.names().map((zone) => ({
  value: zone,
  label: zone.replace(/_/g, " "),
}));

/* ─────────────────────────────────────────────
   TIMEZONE SELECT (searchable dropdown)
───────────────────────────────────────────── */
function TimezoneSelect({ id, value, onChange, error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);

  const selectedLabel  = TIMEZONE_OPTIONS.find((o) => o.value === value)?.label || "";
  const displayValue   = query || selectedLabel;
  const filteredOptions = TIMEZONE_OPTIONS.filter((o) =>
    `${o.value} ${o.label}`.toLowerCase().includes(query.toLowerCase())
  );

  const selectTimezone = (option) => {
    onChange(option.value);
    setQuery(option.value);
    setOpen(false);
  };

  return (
    <div className="timezone-select-wrapper">
      <div className={`reg-input-wrap timezone-input-wrap ${error ? "reg-input-wrap--invalid" : ""}`}>
        <input
          id={id}
          type="text"
          value={displayValue}
          placeholder="Search timezone"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-controls={`${id}-options`}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const nextValue  = e.target.value.trim();
            const exactMatch = TIMEZONE_OPTIONS.find((o) => o.value === nextValue);
            setQuery(nextValue);
            onChange(exactMatch ? exactMatch.value : "");
          }}
        />
        {value && (
          <button type="button" className="timezone-clear-btn" onClick={() => { setQuery(""); onChange(""); }}>
            Clear
          </button>
        )}
      </div>

      {open && (
        <div id={`${id}-options`} className="timezone-options" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`timezone-option ${option.value === value ? "timezone-option--selected" : ""}`}
                onClick={() => selectTimezone(option)}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="timezone-empty">No timezone found</div>
          )}
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   OTP SECTION (shared UI)
───────────────────────────────────────────── */
function OtpSection({
  otpSent, otp, setOtp, countdown, loadingOtp, loadingVerify,
  errorOtp, successOtp, onSendOtp, onVerifyOtp, onResendOtp, formatTime,
}) {
  return (
    <div className="otp-section">
      <button
        type="button"
        className="verify-email-btn"
        onClick={onSendOtp}
        disabled={loadingOtp}
      >
        {loadingOtp ? <span className="btn-spinner" /> : "Verify Email"}
      </button>

      {otpSent && (
        <div className="otp-input-section">
          <div className="otp-input-row">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="otp-input"
            />
            <button
              type="button"
              className="verify-otp-btn"
              onClick={onVerifyOtp}
              disabled={loadingVerify || !otp}
            >
              {loadingVerify ? <span className="btn-spinner" /> : "Verify OTP"}
            </button>
          </div>
          <div className="otp-timer-row">
            <span className="otp-timer">OTP expires in {formatTime(countdown)}</span>
            <button
              type="button"
              className="resend-otp-btn"
              onClick={onResendOtp}
              disabled={loadingOtp || countdown > 0}
            >
              Resend OTP
            </button>
          </div>
        </div>
      )}

      {errorOtp  && !successOtp && <div className="otp-error">{errorOtp}</div>}
      {successOtp && <div className="otp-success">{successOtp}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FACULTY FORM
───────────────────────────────────────────── */
function FacultyForm() {
  const [form, setForm] = useState({
    salutation:        "",
    firstName:         "",
    lastName:          "",
    mobile:            "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    email:             "",
    password:          "",
    confirmPassword:   "",
    preferredSubject:  "",
    otherAchievements: "",
  });

  const [degreeFile,      setDegreeFile]      = useState(null);
  const [achievementFile, setAchievementFile] = useState(null);
  const [badgeFile,       setBadgeFile]       = useState(null);   // ← from Doc 1

  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const strength = getStrength(form.password);

  const [emailVerified,  setEmailVerified]  = useState(false);
  const [otpSent,        setOtpSent]        = useState(false);
  const [otp,            setOtp]            = useState("");
  const [countdown,      setCountdown]      = useState(600);
  const [loadingOtp,     setLoadingOtp]     = useState(false);
  const [loadingVerify,  setLoadingVerify]  = useState(false);
  const [errorOtp,       setErrorOtp]       = useState("");
  const [successOtp,     setSuccessOtp]     = useState("");
  const [timezoneError,  setTimezoneError]  = useState("");

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0 && otpSent) {
      setOtpSent(false);
      setErrorOtp("OTP has expired. Please request a new OTP.");
    }
    return () => clearTimeout(timer);
  }, [otpSent, countdown]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOtp = async () => {
    if (!form.email)              { setErrorOtp("Please enter an email address");       return; }
    if (!validateEmail(form.email)) { setErrorOtp("Please enter a valid email address"); return; }
    setLoadingOtp(true); setErrorOtp(""); setSuccessOtp("");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/teacher/send-otp`,
        { email: form.email },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data.success) {
        setOtpSent(true);
        setCountdown(600);
        setSuccessOtp("Verification code sent successfully. Code expires in 10 minutes.");
      } else {
        setErrorOtp(res.data.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      setErrorOtp(err.response?.data?.message || "Failed to send verification email");
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setErrorOtp("Please enter the OTP"); return; }
    setLoadingVerify(true); setErrorOtp(""); setSuccessOtp("");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/teacher/verify-email`,
        { email: form.email, otp },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data.success) {
        setEmailVerified(true);
        setOtpSent(false);
        setSuccessOtp("Email verified successfully!");
      }
    } catch (err) {
      setErrorOtp(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp(""); setErrorOtp(""); setSuccessOtp("");
    await handleSendOtp();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!FACULTY_REGEX.test(form.password)) {
      setError("Password must be 8+ chars with 1 uppercase, 1 number & 1 special character.");
      return;
    }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match.");                       return; }
    if (!emailVerified)                         { setError("Please verify your email before registration."); return; }
    if (!isValidPhoneNumber("+" + form.mobile)) { setError("Please enter a valid phone number.");            return; }
    if (!form.timezone) {
      setError("Please select a timezone.");
      setTimezoneError("Please select a timezone.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.keys(form).forEach((k) => formData.append(k, form[k]));
    formData.set("mobile", "+" + form.mobile);           // overwrite with + prefix
    if (degreeFile)      formData.append("degreeCertificate",  degreeFile);
    if (badgeFile)       formData.append("badgeCertificate",   badgeFile);  // ← from Doc 1
    if (form.otherAchievements.toLowerCase() === "yes" && achievementFile)
      formData.append("achievementDocument", achievementFile);

    try {
      const res  = await fetch(`${API_BASE_URL}/api/teacher/register`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Faculty registered successfully! Waiting for admin approval.");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch {
      setError("Server error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="reg-form" encType="multipart/form-data">

      {/* Name Row */}
      <div className="reg-name-row">
        <div className="reg-field">
          <label>Salutation</label>
          <div className="reg-input-wrap">
            <select name="salutation" value={form.salutation} onChange={handleChange} className="reg-select">
              <option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Dr.</option>
            </select>
          </div>
        </div>
        <div className="reg-field">
          <label>First Name</label>
          <div className="reg-input-wrap">
            <span className="reg-field-icon">👤</span>
            <input type="text" name="firstName" placeholder="First Name" required onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="reg-field">
        <label>Last Name</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">👤</span>
          <input type="text" name="lastName" placeholder="Last Name" required onChange={handleChange} />
        </div>
      </div>

      {/* Mobile — PhoneInput (Doc 2) */}
      <div className="reg-field">
        <label>Mobile Number</label>
        <PhoneInput
          country={"in"}
          enableSearch={true}
          value={form.mobile}
          onChange={(value) => setForm({ ...form, mobile: value })}
        />
      </div>

      {/* Email + OTP */}
      <div className="reg-field">
        <label>Email Address</label>
        <div className="email-verify-wrap">
          <div className="email-input-row">
            <div className="reg-input-wrap" style={{ flex: 1 }}>
              <span className="reg-field-icon">✉️</span>
              <input
                type="email" name="email" placeholder="Email address" required
                value={form.email} onChange={handleChange}
                disabled={emailVerified}
                className={emailVerified ? "email-verified" : ""}
              />
              {emailVerified && <span className="verify-status verified">✓ Email Verified</span>}
            </div>
          </div>
          {!emailVerified && (
            <OtpSection
              otpSent={otpSent} otp={otp} setOtp={setOtp}
              countdown={countdown} loadingOtp={loadingOtp} loadingVerify={loadingVerify}
              errorOtp={errorOtp} successOtp={successOtp}
              onSendOtp={handleSendOtp} onVerifyOtp={handleVerifyOtp} onResendOtp={handleResendOtp}
              formatTime={formatTime}
            />
          )}
        </div>
      </div>

      {/* Timezone — searchable (Doc 2) */}
      <div className="reg-field">
        <label htmlFor="faculty-register-timezone">Timezone</label>
        <TimezoneSelect
          id="faculty-register-timezone"
          value={form.timezone}
          error={timezoneError}
          onChange={(timezone) => { setForm({ ...form, timezone }); setTimezoneError(""); }}
        />
      </div>

      <div className="reg-field">
        <label>Subject / Skills</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">📚</span>
          <input type="text" name="preferredSubject" placeholder="e.g., Data Science, Web Development" required onChange={handleChange} />
        </div>
      </div>

      {/* Password */}
      <div className="reg-field">
        <label>Password</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">🔒</span>
          <input type="password" name="password" placeholder="Create password" required onChange={handleChange} />
        </div>
        {form.password && (
          <div className="pw-strength-wrap">
            <div className="pw-strength-bar">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="pw-strength-segment"
                  style={{ background: n <= strength.score ? strength.color : "#E5E7EB" }} />
              ))}
            </div>
            <span className="pw-strength-label" style={{ color: strength.color }}>{strength.label}</span>
          </div>
        )}
      </div>

      <div className="reg-field">
        <label>Confirm Password</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">🔒</span>
          <input type="password" name="confirmPassword" placeholder="Confirm password" required onChange={handleChange} />
          {form.confirmPassword && (
            <span className="reg-pw-match-icon">
              {form.password === form.confirmPassword ? "✅" : "❌"}
            </span>
          )}
        </div>
      </div>

      {/* File Uploads */}
      <div className="reg-field">
        <label>Experience Certificate <span className="reg-optional">(PDF/JPG/PNG)</span></label>
        <div className="reg-file-wrap">
          <label className="reg-file-label">
            📎 Choose File
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDegreeFile(e.target.files[0])} hidden />
          </label>
          {degreeFile && <span className="reg-file-name">{degreeFile.name}</span>}
        </div>
      </div>

      <div className="reg-field">
        <label>Badge Certificate <span className="reg-optional">(PDF/JPG/PNG)</span></label>
        <div className="reg-file-wrap">
          <label className="reg-file-label">
            📎 Choose File
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setBadgeFile(e.target.files[0])} hidden />
          </label>
          {badgeFile && <span className="reg-file-name">{badgeFile.name}</span>}
        </div>
      </div>

      <div className="reg-field">
        <label>Achievement Certificate</label>
        <div className="reg-radio-group">
          {["Yes", "No"].map((v) => (
            <label key={v} className="reg-radio-label">
              <input type="radio" name="otherAchievements" value={v.toLowerCase()}
                checked={form.otherAchievements.toLowerCase() === v.toLowerCase()}
                onChange={handleChange} />
              {v}
            </label>
          ))}
        </div>
      </div>

      {form.otherAchievements.toLowerCase() === "yes" && (
        <div className="reg-field">
          <label>Upload Achievement Document <span className="reg-optional">(PDF/JPG/PNG)</span></label>
          <div className="reg-file-wrap">
            <label className="reg-file-label">
              📎 Choose File
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setAchievementFile(e.target.files[0])} hidden />
            </label>
            {achievementFile && <span className="reg-file-name">{achievementFile.name}</span>}
          </div>
        </div>
      )}

      {!emailVerified && <div className="register-notice">Please verify your email before registration.</div>}
      {error   && <div className="reg-alert reg-alert--error">⚠️ {error}</div>}
      {success && <div className="reg-alert reg-alert--success">✅ {success}</div>}

      <button type="submit" className="reg-submit-btn" disabled={loading || !emailVerified}>
        {loading ? <span className="reg-spinner" /> : "Register as Faculty →"}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────
   PARTICIPANT FORM
───────────────────────────────────────────── */
function ParticipantForm() {
  const [formData, setFormData] = useState({
    title:           "",
    firstName:       "",
    lastName:        "",
    mobile:          "",
    email:           "",
    subject:         "",
    startTime:       "",
    endTime:         "",
    password:        "",
    confirmPassword: "",
    proof:           null,
  });

  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const strength = getStrength(formData.password);

  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent,       setOtpSent]       = useState(false);
  const [otp,           setOtp]           = useState("");
  const [countdown,     setCountdown]     = useState(600);
  const [loadingOtp,    setLoadingOtp]    = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [errorOtp,      setErrorOtp]      = useState("");
  const [successOtp,    setSuccessOtp]    = useState("");

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0 && otpSent) {
      setOtpSent(false);
      setErrorOtp("OTP has expired. Please request a new OTP.");
    }
    return () => clearTimeout(timer);
  }, [otpSent, countdown]);

  const handleChange     = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setFormData({ ...formData, proof: e.target.files[0] });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOtp = async () => {
    if (!formData.email)               { setErrorOtp("Please enter an email address");       return; }
    if (!validateEmail(formData.email)) { setErrorOtp("Please enter a valid email address"); return; }
    setLoadingOtp(true); setErrorOtp(""); setSuccessOtp("");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/employee/send-otp`,
        { email: formData.email },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data.success) {
        setOtpSent(true);
        setCountdown(600);
        setSuccessOtp("Verification code sent successfully. Code expires in 10 minutes.");
      } else {
        setErrorOtp(res.data.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      setErrorOtp(err.response?.data?.message || "Failed to send verification email");
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setErrorOtp("Please enter the OTP"); return; }
    setLoadingVerify(true); setErrorOtp(""); setSuccessOtp("");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/employee/verify-email`,
        { email: formData.email, otp },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data.success) {
        setEmailVerified(true);
        setOtpSent(false);
        setSuccessOtp("Email verified successfully!");
      }
    } catch (err) {
      setErrorOtp(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp(""); setErrorOtp(""); setSuccessOtp("");
    await handleSendOtp();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!PARTICIPANT_REGEX.test(formData.password)) {
      setError("Password must be 8+ characters with at least 1 number and 1 special character.");
      return;
    }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match.");                       return; }
    if (!formData.startTime || !formData.endTime)       { setError("Please select preferred class timing.");         return; }
    if (!emailVerified)                                 { setError("Please verify your email before registration."); return; }
    if (!isValidPhoneNumber("+" + formData.mobile))     { setError("Please enter a valid phone number.");            return; }

    setLoading(true);
    const data = new FormData();
    data.append("firstName",  formData.firstName);
    data.append("lastName",   formData.lastName);
    data.append("email",      formData.email);
    data.append("password",   formData.password);
    data.append("mobile",     "+" + formData.mobile);
    data.append("startTime",  formData.startTime);
    data.append("endTime",    formData.endTime);
    data.append("skills",     formData.subject);
    data.append("salutation", formData.title);
    if (formData.proof) data.append("proof", formData.proof);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/employee/register`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setSuccess("Registration successful! Waiting for admin approval.");
        setFormData({
          title: "Mr", firstName: "", lastName: "", mobile: "", email: "",
          subject: "", startTime: "", endTime: "", password: "", confirmPassword: "", proof: null,
        });
        setEmailVerified(false); setOtpSent(false); setOtp("");
        setCountdown(600); setErrorOtp(""); setSuccessOtp("");
        const fi = document.querySelector('input[type="file"]');
        if (fi) fi.value = "";
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="reg-form">
      

      {/* Name Row */}
      <div className="reg-name-row">
        <div className="reg-field">
          <label>Title</label>
          <div className="reg-input-wrap">
            <select name="title" value={formData.title} onChange={handleChange} className="reg-select">
              <option value="Mr">Mr</option>
              <option value="Ms">Ms</option>
              <option value="Mrs">Mrs</option>
            </select>
          </div>
        </div>
        <div className="reg-field">
          <label>First Name</label>
          <div className="reg-input-wrap">
            <span className="reg-field-icon">👤</span>
            <input type="text" name="firstName" placeholder="First Name" required
              value={formData.firstName} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="reg-field">
        <label>Last Name</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">👤</span>
          <input type="text" name="lastName" placeholder="Last Name" required
            value={formData.lastName} onChange={handleChange} />
        </div>
      </div>

      {/* Mobile — PhoneInput (Doc 2) */}
      <div className="reg-field">
        <label>Mobile Number</label>
        <PhoneInput
          country={"in"}
          enableSearch={true}
          value={formData.mobile}
          onChange={(value) => setFormData({ ...formData, mobile: value })}
        />
      </div>

      {/* Email + OTP */}
      <div className="reg-field">
        <label>Email Address</label>
        <div className="email-verify-wrap">
          <div className="email-input-row">
            <div className="reg-input-wrap" style={{ flex: 1 }}>
              <span className="reg-field-icon">✉️</span>
              <input
                type="email" name="email" placeholder="Email address" required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={emailVerified}
                className={emailVerified ? "email-verified" : ""}
              />
              {emailVerified && <span className="verify-status verified">✓ Email Verified</span>}
            </div>
          </div>
          {!emailVerified && (
            <OtpSection
              otpSent={otpSent} otp={otp} setOtp={setOtp}
              countdown={countdown} loadingOtp={loadingOtp} loadingVerify={loadingVerify}
              errorOtp={errorOtp} successOtp={successOtp}
              onSendOtp={handleSendOtp} onVerifyOtp={handleVerifyOtp} onResendOtp={handleResendOtp}
              formatTime={formatTime}
            />
          )}
        </div>
      </div>

      <div className="reg-field">
        <label>Subject / Skills</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">📚</span>
          <input type="text" name="subject" placeholder="e.g., Python, Full Stack, Java" required
            value={formData.subject} onChange={handleChange} />
        </div>
      </div>

      <div className="reg-field">
        <label>Preferred Class Timing</label>
        <div className="reg-time-row">
          <div className="reg-input-wrap">
            <span className="reg-field-icon">🕐</span>
            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} />
          </div>
          <span className="reg-time-sep">to</span>
          <div className="reg-input-wrap">
            <span className="reg-field-icon">🕐</span>
            <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} />
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="reg-field">
        <label>Password</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">🔒</span>
          <input type="password" name="password" placeholder="Create password" required
            value={formData.password} onChange={handleChange} />
        </div>
        {formData.password && (
          <div className="pw-strength-wrap">
            <div className="pw-strength-bar">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="pw-strength-segment"
                  style={{ background: n <= strength.score ? strength.color : "#E5E7EB" }} />
              ))}
            </div>
            <span className="pw-strength-label" style={{ color: strength.color }}>{strength.label}</span>
          </div>
        )}
      </div>

      <div className="reg-field">
        <label>Confirm Password</label>
        <div className="reg-input-wrap">
          <span className="reg-field-icon">🔒</span>
          <input type="password" name="confirmPassword" placeholder="Confirm password" required
            value={formData.confirmPassword} onChange={handleChange} />
          {formData.confirmPassword && (
            <span className="reg-pw-match-icon">
              {formData.password === formData.confirmPassword ? "✅" : "❌"}
            </span>
          )}
        </div>
      </div>

      <div className="reg-field">
        <label>Upload ID / Certificate <span className="reg-optional">(Optional)</span></label>
        <div className="reg-file-wrap">
          <label className="reg-file-label">
            📎 Choose File
            <input type="file" name="proof" onChange={handleFileChange} hidden />
          </label>
          {formData.proof && <span className="reg-file-name">{formData.proof.name}</span>}
        </div>
      </div>

      {!emailVerified && <div className="register-notice">Please verify your email before registration.</div>}
      {error   && <div className="reg-alert reg-alert--error">⚠️ {error}</div>}
      {success && <div className="reg-alert reg-alert--success">✅ {success}</div>}
      <button type="submit" className="reg-submit-btn" disabled={loading || !emailVerified}>
        {loading ? <span className="reg-spinner" /> : "Register as Participant →"}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────
   MAIN REGISTER PAGE
───────────────────────────────────────────── */
function Register() {
  const [activeTab, setActiveTab] = useState("participant");

  return (
    <div className="reg-wrapper">

      {/* ════════ LEFT PANEL ════════ */}
      <div className="reg-left">
        <div className="reg-left-blob reg-left-blob--1" />
        <div className="reg-left-blob reg-left-blob--2" />

        <div className="reg-brand">
          <div className="reg-brand-logo">
            <div style={{
              width: "80px", height: "44px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 900, fontSize: "16px",
              fontFamily: "'Nunito', sans-serif",
            }}>C</div>
          </div>

          <h1 className="reg-brand-title">
            Join <span>CEITCS</span><br />Professional Academy
          </h1>

          <p className="reg-brand-desc">
            Create your account and take the first step towards your career transformation with expert-led, industry-focused training.
          </p>

          <div className="reg-brand-perks">
            {[
              { icon: "🎓", title: "Expert Faculty",      sub: "Learn from industry professionals" },
              { icon: "📱", title: "Learn Anywhere",      sub: "Live & recorded sessions available 24/7" },
              { icon: "🏆", title: "Certifications",      sub: "Industry-recognised certificates" },
              { icon: "💼", title: "Placement Support",   sub: "Resume reviews & mock interviews" },
              { icon: "🤝", title: "Community Access",    sub: "Join a thriving global learner network" },
            ].map((p, i) => (
              <div key={i} className="reg-perk-item">
                <div className="reg-perk-icon">{p.icon}</div>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ RIGHT PANEL ════════ */}
      <div className="reg-right">
        <div className="reg-card">

          <div className="reg-card-header">
            <h2>Create Your Account</h2>
            <p>Choose your role and fill in your details to get started</p>
          </div>

          {/* ── Role Toggle Tabs ── */}
          <div className="reg-role-tabs">
            <button
              type="button"
              className={`reg-role-tab${activeTab === "participant" ? " reg-role-tab--active" : ""}`}
              onClick={() => setActiveTab("participant")}
            >
              <span className="reg-role-tab-icon">🎓</span>
              Participant
              <span className="reg-role-tab-sub">Student / Learner</span>
            </button>
            <button
              type="button"
              className={`reg-role-tab${activeTab === "faculty" ? " reg-role-tab--active" : ""}`}
              onClick={() => setActiveTab("faculty")}
            >
              <span className="reg-role-tab-icon">👨‍🏫</span>
              Faculty
              <span className="reg-role-tab-sub">Educator / Mentor</span>
            </button>
          </div>

          {/* ── Scrollable Form Area ── */}
          <div className="reg-form-scroll">
            {activeTab === "participant" ? <ParticipantForm /> : <FacultyForm />}
          </div>

          <p className="reg-login-link">
            Already have an account?{" "}
            <Link to="/login">Sign in here →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
