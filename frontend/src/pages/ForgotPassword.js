import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import '../styles/login.css';

function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') || 'employee';

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(600);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && otpSent) {
      setOtpSent(false);
      setError('OTP has expired. Please request a new code.');
    }
    return () => clearTimeout(timer);
  }, [otpSent, countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email) return setError('Please enter your email address');
    if (!validateEmail(email)) return setError('Please enter a valid email address');

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email, role });
      if (res.data.success) {
        setOtpSent(true);
        setCountdown(600);
        setSuccess('Verification code sent successfully. Code expires in 10 minutes.');
        setStep('verify-otp');
      } else {
        setError(res.data.message || 'Failed to send reset code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!otp) return setError('Please enter the verification code');

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/verify-reset-otp`, { email, role, otp });
      if (res.data.success) {
        setSuccess('OTP verified successfully!');
        setTimeout(() => {
          setStep('reset-password');
          setSuccess('');
        }, 1000);
      } else {
        setError(res.data.message || 'Invalid verification code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, { email, role, password: newPassword });
      if (res.data.success) {
        setSuccess('Password reset successfully. Please login with your new password.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(res.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const roleLabel = role === 'faculty' ? 'Faculty' : 'Participant';

  return (
    <div className="login-wrapper">
      {/* LEFT BRAND PANEL */}
      <div className="login-left">
        <div className="login-left-blob login-left-blob--1" />
        <div className="login-left-blob login-left-blob--2" />
        <div className="brand-content">
          <div className="brand-logo-box">
            <div style={{
              width: "80px", height: "44px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 900, fontSize: "16px",
              fontFamily: "'Nunito', sans-serif"
            }}>C</div>
          </div>
          <h1 className="brand-title">
            CEITCS<br />
            <span>Professional</span> Academy
          </h1>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2>{step === 'email' ? 'Forgot Password?' : step === 'verify-otp' ? 'Verify Code' : 'Reset Password'}</h2>
            <p>{step === 'email' ? `Enter your registered ${roleLabel} email to receive a reset code` : step === 'verify-otp' ? 'Enter the 6-digit code sent to your email' : 'Create a new password for your account'}</p>
          </div>

          {error && <div className="login-error"><span>⚠️</span> {error}</div>}
          {success && <div className="login-success"><span>✅</span> {success}</div>}

          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="login-form">
              <div className="login-field">
                <label>Email Address</label>
                <div className="login-input-wrap">
                  <span className="login-field-icon">✉️</span>
                  <input type="email" placeholder="Enter your registered email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? <span className="login-spinner" /> : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'verify-otp' && (
            <form onSubmit={handleVerifyOtp} className="login-form">
              <div className="login-field">
                <label>Verification Code</label>
                <div className="login-input-wrap">
                  <span className="login-field-icon">🔢</span>
                  <input type="text" placeholder="Enter 6-digit code" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
                {otpSent && <div className="otp-timer-text">Code expires in {formatTime(countdown)}</div>}
              </div>
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? <span className="login-spinner" /> : 'Verify Code'}
              </button>
            </form>
          )}

          {step === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="login-form">
              <div className="login-field">
                <label>New Password</label>
                <div className="login-input-wrap">
                  <span className="login-field-icon">🔒</span>
                  <input type="password" placeholder="Enter new password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <div className="login-field">
                <label>Confirm Password</label>
                <div className="login-input-wrap">
                  <span className="login-field-icon">🔒</span>
                  <input type="password" placeholder="Confirm new password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? <span className="login-spinner" /> : 'Reset Password'}
              </button>
            </form>
          )}

          <button type="button" className="login-back-btn" onClick={() => navigate('/login')}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
