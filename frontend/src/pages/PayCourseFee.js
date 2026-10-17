import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import '../styles/payCourseFee.css';

/* MANUAL UPI ONLY — QR renders only after JWT + enrolled course
   confirmed + course resolved from backend (Course.price).
   Display only. POST /api/payments creates PENDING. No auto-PAID. */

const QR_SRC = `${process.env.PUBLIC_URL || ''}/phonepe-qr.jpg`;

// Frontend UPI-ID format check mirrors the backend pattern:
// "<handle>@<bank>" — never a PIN, password, OTP, or credential.
const isUpiIdFormatValid = (value) => /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(String(value || '').trim());

const getQueryCourseCode = (search) => {
  try {
    const params = new URLSearchParams(search || '');
    return (params.get('courseCode') || '').trim();
  } catch {
    return '';
  }
};

const PayCourseFee = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedCode = useMemo(
    () => getQueryCourseCode(location.search),
    [location.search]
  );

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [course, setCourse] = useState(null);
  const [enrollmentOk, setEnrollmentOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrError, setQrError] = useState(false);
  // Participant's own UPI ID (VPA) — entered inside the single QR payment
  // flow and submitted as informational payment data. Never a credential
  // (no PIN/OTP) and never treated as proof that a transfer happened.
  const [payerUpiId, setPayerUpiId] = useState('');
  // Mandatory UPI Transaction ID / UTR, entered in the QR popup after the
  // participant pays externally. A supporting reference for the admin's
  // independent funds verification — never proof of payment by itself.
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Step 37 — UI-only QR presentation states (no payment API involvement)
  const [showQr, setShowQr] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null); // { payerUpiId, paymentMethod, status }
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setAuthChecked(true);
    if (!token) setLoading(false);
  }, []);

  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;
    if (!requestedCode) {
      setError('No course selected. Open this page from your enrolled course link.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const courseRes = await fetch(
          `${API_BASE_URL}/api/courses?search=${encodeURIComponent(requestedCode)}&limit=10`
        );
        if (!courseRes.ok) throw new Error('course load failed');
        const courseData = await courseRes.json();
        const list = Array.isArray(courseData.courses)
          ? courseData.courses
          : Array.isArray(courseData) ? courseData : [];
        const match = list.find(
          (c) => String(c.courseCode || '').toLowerCase() === requestedCode.toLowerCase()
        );
        if (!match) {
          if (!cancelled) {
            setError('Course not found. QR is hidden for invalid courses.');
            setLoading(false);
          }
          return;
        }
        let enrolled = false;
        try {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          const ownId = localStorage.getItem('userId') || storedUser._id || storedUser.id || '';
          if (ownId) {
            const empRes = await fetch(`${API_BASE_URL}/api/employee/${ownId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (empRes.ok) {
              const emp = await empRes.json();
              const mainCode = String(emp.courseCode || '').toLowerCase();
              const subs = Array.isArray(emp.enrolledSubjects) ? emp.enrolledSubjects : [];
              enrolled =
                mainCode === String(match.courseCode || '').toLowerCase() ||
                subs.some(
                  (s) => String(s.courseCode || '').toLowerCase() ===
                    String(match.courseCode || '').toLowerCase()
                );
            }
          }
        } catch { enrolled = false; }
        if (!cancelled) {
          if (!enrolled) {
            setError('You are not enrolled in this course. QR shown only for enrolled course.');
            setLoading(false);
            return;
          }
          setCourse(match);
          setEnrollmentOk(true);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load course details. Please try again.');
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [authChecked, isAuthenticated, requestedCode]);


  /* Single entry point to the EXISTING QR popup. The participant must first
     provide a valid UPI ID; only then does an explicit click open the popup.
     Opening the popup is display-only — it never calls a payment API, never
     submits anything automatically, and preserves the entered UPI ID. */
  const handleOpenQr = (e) => {
    e.preventDefault();
    setSubmitError('');
    const upiId = payerUpiId.trim().toLowerCase();
    if (!upiId || !isUpiIdFormatValid(upiId)) {
      setSubmitError('Please enter your valid UPI ID (e.g. name@bank). Never share your UPI PIN or OTP.');
      return;
    }
    setShowQr(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!course) return;

    // Single payment method (QR flow): the participant's own UPI ID, plus
    // the mandatory transaction reference entered after paying. The UPI ID
    // is validated with the same pattern the backend uses.
    const upiId = payerUpiId.trim().toLowerCase();
    if (!upiId || !isUpiIdFormatValid(upiId)) {
      setSubmitError('Please enter your valid UPI ID (e.g. name@bank). Never share your UPI PIN or OTP.');
      return;
    }

    // Mandatory Transaction ID / UTR — trimmed, deliberately permissive so
    // every bank's reference format is accepted; only a sane length is
    // enforced (the backend independently re-checks both rules).
    const txn = transactionId.trim();
    if (!txn || txn.length > 64) {
      setSubmitError('Please enter your UPI Transaction ID / UTR after paying.');
      return;
    }

    const payload = {
      courseCode: course.courseCode,
      payerUpiId: upiId,
      paymentMethod: 'UPI_ID',
      transactionId: txn
    };

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        // Only the participant-supplied fields. amount, participantId
        // and status are always derived server-side (Course.price,
        // JWT, "PENDING").
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setSubmitError(data.message || 'Payment submission failed. Please try again.');
        return;
      }
      // Success ONLY when res.ok && data.success (checked above). This means the
      // submission was received by our system — status stays PENDING until an
      // admin verifies it. It does NOT mean the payment has been verified/PAID.
      // Entering a UPI ID does not transfer money by itself.
      setSuccessInfo({
        payerUpiId: data.payment?.payerUpiId || payload.payerUpiId,
        paymentMethod: data.payment?.paymentMethod || payload.paymentMethod,
        status: data.payment?.status || 'PENDING'
      });
      // The entered UPI ID is intentionally preserved (never erased when the
      // popup opens or submits); the success panel below replaces the form.
      setShowQr(false);
    } catch {
      setSubmitError('Unable to reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecked && !isAuthenticated) {
    return (
      <div className="pcf-page">
        <div className="pcf-card">
          <h1>Pay Course Fee</h1>
          <p>Please log in as a participant to view the payment instructions.</p>
          <button className="pcf-btn" onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pcf-page">
        <div className="pcf-card">
          <h1>Pay Course Fee</h1>
          <p>Verifying your enrollment and loading course details.</p>
        </div>
      </div>
    );
  }

  if (error || !course || !enrollmentOk) {
    return (
      <div className="pcf-page">
        <div className="pcf-card">
          <h1>Pay Course Fee</h1>
          <p className="pcf-error">{error || 'Course could not be verified.'}</p>
          <button className="pcf-btn pcf-btn-secondary" onClick={() => navigate('/subjects')}>
            Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  const amount = Number(course.price) || 0;

  // Step 37 — dedicated success panel replaces the form after a successful
  // submission, so the same request cannot be resubmitted from the UI.
  if (successInfo) {
    return (
      <div className="pcf-page">
        <div className="pcf-card">
          <h1>Pay Course Fee</h1>
          <div className="pcf-course">
            <p><strong>Course name:</strong> {course.courseName}</p>
            <p><strong>Course code:</strong> {course.courseCode}</p>
            <p><strong>Amount:</strong> &#8377;{amount.toLocaleString('en-IN')}</p>
            <p className="pcf-hint">Amount shown is the institute-configured course fee.</p>
          </div>
          <hr className="pcf-divider" />
          <div className="pcf-success-panel" role="status">
            <p className="pcf-success-title">&#10003; Payment Submitted Successfully</p>
            <p>Payment submitted successfully. Your payment is awaiting admin verification.</p>
            <p><strong>Submitted UPI ID:</strong> {successInfo.payerUpiId}</p>
            <p><strong>Status:</strong> {successInfo.status}</p>
            <p>Course access and the payment-confirmation email with receipt are available only after the admin approves your verified payment.</p>
            <p className="pcf-hint">
              Admin verification is required before your payment becomes PAID.
            </p>
          </div>
          <p className="pcf-note">
            Manual verification only: your request stays PENDING until an admin
            verifies and approves it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pcf-page">
      <div className="pcf-card">
        <h1>Pay Course Fee</h1>
        <div className="pcf-course">
          <p><strong>Course name:</strong> {course.courseName}</p>
          <p><strong>Course code:</strong> {course.courseCode}</p>
          <p><strong>Amount:</strong> &#8377;{amount.toLocaleString('en-IN')}</p>
          <p className="pcf-hint">Amount shown is the institute-configured course fee.</p>
        </div>
        <hr className="pcf-divider" />
        <h2>Pay using QR</h2>
        <form className="pcf-form" onSubmit={handleOpenQr}>
          <p className="pcf-hint">
            Enter your UPI ID below, then open the QR popup, scan the QR code
            with your UPI app and pay the course fee. Finally submit the
            payment request from inside the popup for admin verification.
          </p>
          <label htmlFor="pcf-upiid">Your UPI ID</label>
          <input
            id="pcf-upiid"
            type="text"
            value={payerUpiId}
            onChange={(e) => setPayerUpiId(e.target.value)}
            placeholder="e.g. yourname@okhdfc"
            autoComplete="off"
            inputMode="email"
          />
          <button className="pcf-btn" type="submit" disabled={submitting}>
            Show QR Code
          </button>
          <p className="pcf-hint">
            Never share your UPI PIN, password, or OTP. Only your UPI ID is
            needed. Entering your UPI ID does not transfer money by itself —
            your request stays PENDING until an admin verifies the actual
            incoming payment.
          </p>
        </form>
        {submitError && !showQr && <p className="pcf-error">{submitError}</p>}
        <p className="pcf-note">
          Manual verification only: showing this QR does not mark your fee as paid.
          Your request stays PENDING until an admin verifies and approves it.
        </p>
      </div>

      {/* QR POPUP — displays the EXISTING QR image and course details. Nothing
          is submitted until the participant explicitly clicks the button in
          the form below; the popup never calls any payment API on its own. */}
      {showQr && (
        <div className="pcf-modal-overlay" onClick={() => setShowQr(false)}>
          <div
            className="pcf-modal"
            role="dialog"
            aria-modal="true"
            aria-label="UPI Payment"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pcf-modal-header">
              <h3>UPI Payment</h3>
              <button
                type="button"
                className="pcf-modal-close"
                aria-label="Close"
                onClick={() => setShowQr(false)}
              >
                &times;
              </button>
            </div>
            <p className="pcf-hint">
              Scan the QR code using your UPI app and complete the payment.
            </p>
            {!qrError ? (
              <img
                className="pcf-qr"
                src={QR_SRC}
                alt="PhonePe UPI QR - scan to pay course fee"
                onError={() => setQrError(true)}
              />
            ) : (
              <p className="pcf-error">
                QR image not found. Owner: place the provided PhonePe QR at frontend/public/phonepe-qr.jpg
              </p>
            )}
            {!qrError && (
              <p className="pcf-hint pcf-fullsize-link">
                QR not scanning?{' '}
                <a href={QR_SRC} target="_blank" rel="noopener noreferrer">
                  Open QR in Full Size
                </a>
              </p>
            )}
            <div className="pcf-modal-course">
              <p><strong>Course:</strong> {course.courseName} ({course.courseCode})</p>
              <p><strong>Amount:</strong> &#8377;{amount.toLocaleString('en-IN')}</p>
              <p><strong>Your UPI ID:</strong> {payerUpiId}</p>
            </div>
            <hr className="pcf-divider" />
            <form className="pcf-form pcf-modal-form" onSubmit={handleSubmit}>
              <p className="pcf-hint">
                Paid via the QR above? Enter your UPI Transaction ID / UTR
                below, then submit your payment request. The request stays
                PENDING until an admin verifies the actual incoming payment.
              </p>
              <label htmlFor="pcf-txn">Transaction ID / UTR</label>
              <input
                id="pcf-txn"
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 415234567890"
                autoComplete="off"
                maxLength={64}
              />
              <button className="pcf-btn" type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Payment Request'}
              </button>
            </form>
            {submitError && showQr && <p className="pcf-error">{submitError}</p>}
            <p className="pcf-hint" style={{ textAlign: 'center', marginTop: '10px' }}>
              Submission is PENDING admin verification — it does not mark your fee as paid.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayCourseFee;