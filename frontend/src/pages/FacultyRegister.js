import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE, { apiFetch } from "../config/api";
import "../styles/facultyregister.css";
import moment from "moment-timezone";


const TIMEZONE_OPTIONS = moment.tz.names().map((zone) => ({
  value: zone,
  label: zone.replace(/_/g, " "),
}));

function TimezoneSelect({ id, value, onChange, error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedLabel = TIMEZONE_OPTIONS.find((option) => option.value === value)?.label || "";
  const displayValue = query || selectedLabel;
  const filteredOptions = TIMEZONE_OPTIONS.filter((option) =>
    `${option.value} ${option.label}`.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectTimezone = (option) => {
    onChange(option.value);
    setQuery(option.value);
    setOpen(false);
  };

  return (
    <div className="timezone-select-wrapper" ref={wrapperRef}>
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
            const nextValue = e.target.value.trim();
            const exactMatch = TIMEZONE_OPTIONS.find((option) => option.value === nextValue);
            setQuery(nextValue);
            onChange(exactMatch ? exactMatch.value : "");
          }}
        />
        {value && (
          <button type="button" className="timezone-clear-btn" onClick={() => {
            setQuery("");
            onChange("");
          }}>
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

const FacultyRegister = () => {
  const [form, setForm] = useState({
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    mobile: "",
    countryCode: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    email: "",
    password: "",
    confirmPassword: "",
    preferredSubject: "",
    otherAchievements: ""
  });

  const [degreeFile, setDegreeFile] = useState(null);
  const [achievementFile, setAchievementFile] = useState(null);

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(600);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [errorOtp, setErrorOtp] = useState("");
  const [successOtp, setSuccessOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [timezoneError, setTimezoneError] = useState("");

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && otpSent) {
      setOtpSent(false);
      setErrorOtp("OTP has expired. Please request a new OTP.");
    }
    return () => clearTimeout(timer);
  }, [otpSent, countdown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === "email" && invalidEmail && validateEmail(value)) {
      setInvalidEmail(false);
      setErrorOtp("");
    }
  };

  const handleFileChange = (e) => {
    setDegreeFile(e.target.files[0]);
  };

  const handleAchievementFileChange = (e) => {
    setAchievementFile(e.target.files[0]);
  };

  const handleSendOtp = async () => {
    if (!form.email) {
      setErrorOtp("Please enter an email address");
      setInvalidEmail(true);
      return;
    }
    if (!validateEmail(form.email)) {
      setErrorOtp("Please enter a valid email address");
      setInvalidEmail(true);
      return;
    }
    setInvalidEmail(false);
    setLoadingOtp(true);
    setErrorOtp("");
    setSuccessOtp("");
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teacher/send-otp`, {
        email: form.email
      }, {
        headers: { "Content-Type": "application/json" }
      });
      if (response.data.success) {
        setOtpSent(true);
        setCountdown(600);
        setSuccessOtp("Verification code sent successfully. Code expires in 10 minutes.");
      } else {
        setErrorOtp(response.data.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      setErrorOtp(err.response?.data?.message || "Failed to send verification email");
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setErrorOtp("Please enter the OTP");
      return;
    }
    setLoadingVerify(true);
    setErrorOtp("");
    setSuccessOtp("");
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teacher/verify-email`, {
        email: form.email,
        otp: otp
      }, {
        headers: { "Content-Type": "application/json" }
      });
      if (response.data.success) {
        setEmailVerified(true);
        setOtpSent(false);
        setSuccessOtp("Email verified successfully!");
        setErrorOtp("");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setErrorOtp(err.response?.data?.message || "Invalid OTP. Please try again.");
      setSuccessOtp("");
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp("");
    setErrorOtp("");
    setSuccessOtp("");
    await handleSendOtp();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate mandatory fields
    if (!form.firstName || form.firstName.trim() === "") {
      setError("First Name is required.");
      return;
    }

    if (!form.lastName || form.lastName.trim() === "") {
      setError("Last Name is required.");
      return;
    }

    if (!form.mobile || form.mobile.trim() === "") {
      setError("Mobile Number is required.");
      return;
    }

    if (!form.preferredSubject || form.preferredSubject.trim() === "") {
      setError("Preferred Subject is required.");
      return;
    }

    if (!passwordRegex.test(form.password)) {
      setError("Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!emailVerified) {
      setError("Please verify your email before registration.");
      return;
    }

    if (!form.countryCode) {
      setError("Please select a country code.");
      return;
    }

    if (!form.timezone) {
      setError("Please select a timezone.");
      setTimezoneError("Please select a timezone.");
      return;
    }

    // Conditional validation: Achievement Document required when Other Achievements is "Yes"
    const hasAchievements = form.otherAchievements && form.otherAchievements.toLowerCase() === "yes";
    if (hasAchievements && !achievementFile) {
      setError("Achievement Document is required when Other Achievements is provided.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    Object.keys(form).forEach((key) => {
      formData.append(key, form[key]);
    });
    formData.append("fullMobile", `${form.countryCode}${form.mobile}`);

    if (degreeFile) {
      formData.append("degreeCertificate", degreeFile);
    }

    if (form.otherAchievements.toLowerCase() === "yes" && achievementFile) {
      formData.append("achievementDocument", achievementFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/register`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Faculty registered successfully! Waiting for admin approval.");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (error) {
      setError("Server error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-form">
        <h2>Register as Faculty</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="name-fields">
            <input
              type="text"
              name="salutation"
              value={form.salutation}
              onChange={handleChange}
              required
            />
            <div className="reg-field">
              <label htmlFor="faculty-firstname">First Name<span className="reg-required">*</span></label>
              <input
                type="text"
                name="firstName"
                id="faculty-firstname"
                placeholder="First Name"
                onChange={handleChange}
                required
                value={form.firstName}
              />
            </div>
            <div className="reg-field">
              <label htmlFor="faculty-lastname">Last Name<span className="reg-required">*</span></label>
              <input
                type="text"
                name="lastName"
                id="faculty-lastname"
                placeholder="Last Name"
                onChange={handleChange}
                required
                value={form.lastName}
              />
            </div>
          </div>

          <div className="form-group mobile-field-row">
            <div className="reg-field">
              <label htmlFor="faculty-countrycode">Country Code<span className="reg-required">*</span></label>
              <select name="countryCode" value={form.countryCode} onChange={handleChange} required id="faculty-countrycode">
                <option value="">+ Code</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+1">🇨🇦 +1</option>
                <option value="+65">🇸🇬 +65</option>
              </select>
            </div>
            <div className="reg-field mobile-number-field">
              <label htmlFor="faculty-mobile">Mobile Number<span className="reg-required">*</span></label>
              <input
                type="tel"
                name="mobile"
                id="faculty-mobile"
                placeholder="Mobile Number"
                onChange={handleChange}
                required
                value={form.mobile}
              />
            </div>
          </div>

          <div className="reg-field">
            <label htmlFor="faculty-timezone">Timezone<span className="reg-required">*</span></label>
            <TimezoneSelect
              id="faculty-timezone"
              value={form.timezone}
              error={timezoneError}
              onChange={(timezone) => {
                setForm({ ...form, timezone });
                setTimezoneError("");
              }}
            />
          </div>

          <div className="email-verify-wrap">
            <div className="reg-field">
              <label htmlFor="faculty-email">Email<span className="reg-required">*</span></label>
              <input
                type="email"
                name="email"
                id="faculty-email"
                placeholder="Email ID"
                onChange={handleChange}
                required
                value={form.email}
                disabled={emailVerified}
                className={emailVerified ? "email-verified" : ""}
              />
            </div>
            {emailVerified && <span className="verify-status verified">✓ Email Verified</span>}

            {!emailVerified && (
              <div className="otp-section">
                <button
                  type="button"
                  className="verify-email-btn"
                  onClick={handleSendOtp}
                  disabled={loadingOtp || !form.email}
                >
                  {loadingOtp ? <span className="btn-spinner"></span> : "Verify Email"}
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
                        onClick={handleVerifyOtp}
                        disabled={loadingVerify || !otp}
                      >
                        {loadingVerify ? <span className="btn-spinner"></span> : "Verify OTP"}
                      </button>
                    </div>
                    <div className="otp-timer-row">
                      <span className="otp-timer">OTP expires in {formatTime(countdown)}</span>
                      <button
                        type="button"
                        className="resend-otp-btn"
                        onClick={handleResendOtp}
                        disabled={loadingOtp || countdown > 0}
                      >
                        Resend OTP
                      </button>
                    </div>
                  </div>
                )}
                {errorOtp && !successOtp && <div className="otp-error">{errorOtp}</div>}
                {successOtp && <div className="otp-success">{successOtp}</div>}
              </div>
            )}
          </div>

          <div className="reg-field">
            <label htmlFor="faculty-password">Password<span className="reg-required">*</span></label>
            <input
              type="password"
              name="password"
              id="faculty-password"
              placeholder="Password"
              onChange={handleChange}
              required
              value={form.password}
            />
          </div>

          <div className="reg-field">
            <label htmlFor="faculty-confirmPassword">Confirm Password<span className="reg-required">*</span></label>
            <input
              type="password"
              name="confirmPassword"
              id="faculty-confirmPassword"
              placeholder="Confirm Password"
              onChange={handleChange}
              required
              value={form.confirmPassword}
            />
          </div>

          <div className="reg-field">
            <label htmlFor="faculty-preferredSubject">Preferred Subject<span className="reg-required">*</span></label>
            <input
              type="text"
              name="preferredSubject"
              id="faculty-preferredSubject"
              placeholder="Preferred Subject (e.g., Data Science, Web Development)"
              onChange={handleChange}
              required
              value={form.preferredSubject}
            />
          </div>

          <div className="reg-field">
            <label htmlFor="faculty-degreeCertificate">Degree Certificate<span className="reg-required">*</span></label>
            <input
              type="file"
              id="faculty-degreeCertificate"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
          </div>

          <div className="reg-field">
            <label htmlFor="faculty-otherAchievements">Do you have other achievements? (Yes/No)</label>
            <input
              type="text"
              name="otherAchievements"
              id="faculty-otherAchievements"
              placeholder="Type Yes or No"
              onChange={handleChange}
              value={form.otherAchievements}
            />
          </div>

          {form.otherAchievements.toLowerCase() === "yes" && (
            <div className="reg-field">
              <label htmlFor="faculty-achievementDocument">Achievement Document<span className="reg-required">*</span></label>
              <input
                type="file"
                id="faculty-achievementDocument"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleAchievementFileChange}
              />
            </div>
          )}

          {!emailVerified && (
            <div className="register-notice">
              Please verify your email before registration.
            </div>
          )}

          <button type="submit" disabled={loading || !emailVerified}>
            {loading ? "Registering..." : "Register"}
          </button>

          <div className="register-footer">
            <a href="/login">Already a User? Continue Here</a>
          </div>  
        </form>
      </div>
    </div>
  );
};

export default FacultyRegister;