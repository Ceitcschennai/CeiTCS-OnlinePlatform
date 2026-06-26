import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "../styles/participantRegister.css";

function ParticipantRegister() {
  const [formData, setFormData] = useState({
    title: "Mr",
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    subject: "",
    startTime: "",
    endTime: "",
    password: "",
    confirmPassword: "",
    proof: null
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(600);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [errorOtp, setErrorOtp] = useState("");
  const [successOtp, setSuccessOtp] = useState("");
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    if (invalidEmail && validateEmail(value)) {
      setInvalidEmail(false);
      setErrorOtp("");
    }
    if (emailExists && validateEmail(value)) {
      setEmailExists(false);
      setErrorOtp("");
    }
  };

  const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setOtpSent(false);
      setErrorOtp("OTP has expired. Please request a new OTP.");
    }
    return () => clearTimeout(timer);
  }, [otpSent, countdown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, proof: e.target.files[0] });
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      setErrorOtp("Please enter an email address");
      return;
    }

    setLoadingOtp(true);
    setErrorOtp("");
    setSuccessOtp("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/employee/send-otp`, {
        email: formData.email
      }, {
        headers: { "Content-Type": "application/json" }
      });

      if (response.data.success) {
        setOtpSent(true);
        setCountdown(600);
        setSuccessOtp("Verification code sent successfully. Code expires in 10 minutes.");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      setErrorOtp(err.response?.data?.message || "Failed to send OTP. Please try again.");
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
      const response = await axios.post(`${API_BASE_URL}/api/employee/verify-email`, {
        email: formData.email,
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
    setError("");
    setSuccess("");

    if (!passwordRegex.test(formData.password)) {
      setError("Password must contain at least 8 characters, 1 number and 1 special character");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setError("Please select preferred class timing");
      return;
    }

    if (!emailVerified) {
      setError("Please verify your email before registration.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("firstName", formData.firstName);
      data.append("lastName", formData.lastName);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("mobile", formData.mobile);
      data.append("startTime", formData.startTime);
      data.append("endTime", formData.endTime);
      data.append("skills", formData.subject);
      data.append("salutation", formData.title);

      if (formData.proof) {
        data.append("proof", formData.proof);
      }

      const response = await axios.post(`${API_BASE_URL}/api/employee/register`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.success) {
        setSuccess("Registration successful! Waiting for admin approval.");

        setFormData({
          title: "Mr",
          firstName: "",
          lastName: "",
          mobile: "",
          email: "",
          subject: "",
          startTime: "",
          endTime: "",
          password: "",
          confirmPassword: "",
          proof: null
        });

        setEmailVerified(false);
        setOtpSent(false);
        setOtp("");
        setCountdown(600);
        setErrorOtp("");
        setSuccessOtp("");

        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
      }

    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-register-wrapper">
      <div className="employee-register-form">
        <h2>Participants Registration</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Name Fields */}
          <div className="form-group name-fields">
            <select name="title" value={formData.title} onChange={handleChange}>
              <option value="Mr">Mr</option>
              <option value="Ms">Ms</option>
              <option value="Mrs">Mrs</option>
            </select>
            <input
              name="firstName"
              placeholder="First Name"
              required
              onChange={handleChange}
              value={formData.firstName}
            />
            <input
              name="lastName"
              placeholder="Last Name"
              required
              onChange={handleChange}
              value={formData.lastName}
            />
          </div>

          {/* Mobile */}
          <div className="form-group">
            <input
              name="mobile"
              placeholder="Mobile Number"
              required
              onChange={handleChange}
              value={formData.mobile}
            />
          </div>

          {/* Email with OTP Verification */}
          <div className="form-group">
            <label>Email</label>
            <div className="email-verify-wrap">
              <div className="email-input-row">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  onChange={handleChange}
                  value={formData.email}
                  disabled={emailVerified}
                  className={emailVerified ? "email-verified" : ""}
                />
                {emailVerified && <span className="verify-status verified">✓ Email Verified</span>}
              </div>
              {!emailVerified && (
                <div className="otp-section">
                  <button
                    type="button"
                    className="verify-email-btn"
                    onClick={handleSendOtp}
                    disabled={loadingOtp || !formData.email}
                  >
                    {loadingOtp ? (
                      <span className="btn-spinner"></span>
                    ) : (
                      "Verify Email"
                    )}
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
                          {loadingVerify ? (
                            <span className="btn-spinner"></span>
                          ) : (
                            "Verify OTP"
                          )}
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
          </div>

          {/* Subject / Skills */}
          <div className="form-group">
            <input
              name="subject"
              placeholder="Subject"
              required
              onChange={handleChange}
              value={formData.subject}
            />
          </div>

          {/* Class Timing */}
          <div className="form-group">
            <label>Preferred Class Timing</label>
            <div className="time-fields">
              <input
                type="time"
                name="startTime"
                onChange={handleChange}
                value={formData.startTime}
              />
              <input
                type="time"
                name="endTime"
                onChange={handleChange}
                value={formData.endTime}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              onChange={handleChange}
              value={formData.password}
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              required
              onChange={handleChange}
              value={formData.confirmPassword}
            />
          </div>

          {/* File Upload */}
          <div className="form-group">
            <label>Upload ID / Certificate</label>
            <input type="file" name="proof" onChange={handleFileChange} />
          </div>

          {!emailVerified && (
            <div className="register-notice">
              Please verify your email before registration.
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" disabled={loading || !emailVerified}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ParticipantRegister;
