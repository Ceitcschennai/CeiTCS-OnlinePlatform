import React, { useEffect, useMemo, useState } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/managePayments.css';
import LMSCard from '../components/common/LMSCard';
import LMSButton from '../components/common/LMSButton';

/* ============================================
   ADMIN PAYMENT VERIFICATION (manual review)

   Source: GET /api/payments/admin/pending (admin JWT)
   Actions:
     PUT /api/payments/admin/:id/approve  PENDING -> PAID
     PUT /api/payments/admin/:id/reject   PENDING -> REJECTED

   The admin can only send `adminRemarks`. amount,
   participantId, courseCode, transactionId, paymentDate,
   status, verifiedBy and verifiedAt are historical facts
   owned by the server and are never editable here.
   Employee.paymentStatus is NOT touched by this flow.
   ============================================ */

// Existing JWT token stored at login — sent on every protected API call
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

/* Approved-payments table: participant, course, amount, visible UPI
   transaction ID, approval date, bill number, and a Download Bill
   (PDF) button ONLY for PAID rows with a persisted bill number. */
const ApprovedPaymentsTable = ({
  payments,
  billLoadingId,
  onDownload,
  page,
  totalPages,
  loading,
  onPage
}) => (
  <>
    <div className="mp-table-wrap" style={{ marginTop: 'var(--lms-space-4)' }}>
      <table className="mp-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Course</th>
            <th>Amount</th>
            <th>Transaction ID</th>
            <th>Approved At</th>
            <th>Bill Number</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const pid = payment._id || payment.id;
            const participant = payment.participantId;
            const participantName = participant && typeof participant === 'object'
              ? `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || '—'
              : '—';
            return (
              <tr key={pid}>
                <td data-label="Participant">
                  {participantName}
                  {participant && participant.email && (
                    <span className="mp-sub"> {participant.email}</span>
                  )}
                </td>
                <td data-label="Course">
                  {payment.courseName || payment.courseCode || '—'}
                </td>
                <td data-label="Amount">₹{(Number(payment.amount) || 0).toLocaleString()}</td>
                <td data-label="Transaction ID" className="mp-txn-cell">
                  {payment.transactionId || 'Not provided'}
                </td>
                <td data-label="Approved At">{formatDate(payment.verifiedAt)}</td>
                <td data-label="Bill Number" className="mp-bill-cell">
                  {payment.billNumber || '—'}
                </td>
                <td data-label="Actions">
                  {payment.status === 'PAID' && payment.billNumber ? (
                    <LMSButton
                      variant="primary"
                      onClick={() => onDownload(payment)}
                      disabled={billLoadingId === pid}
                    >
                      {billLoadingId === pid ? 'Loading…' : 'Download Bill (PDF)'}
                    </LMSButton>
                  ) : (
                    <span className="receipt-unavailable">Bill unavailable</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="mp-approved-pager">
      <LMSButton
        variant="secondary"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={loading || page <= 1}
      >
        Previous
      </LMSButton>
      <span className="mp-approved-page-label">
        Page {page} of {totalPages}
      </span>
      <LMSButton
        variant="secondary"
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={loading || page >= totalPages}
      >
        Next
      </LMSButton>
    </div>
  </>
);

const ManagePayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Active decision: { payment, action: 'approve' | 'reject' }
  const [decision, setDecision] = useState(null);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Step 5B — which proof is currently being resolved (prevents duplicate clicks)
  const [proofLoadingId, setProofLoadingId] = useState('');
  // Official bill-PDF download state (approved bills only)
  const [billLoadingId, setBillLoadingId] = useState('');

  // ── APPROVED PAYMENTS LIST (automatic bill download) ──
  // Fed ONLY by GET /api/payments/admin/approved (admin JWT).
  // Default page size 20, max 50 — enforced by the backend.
  const APPROVED_PAGE_SIZE = 20;
  const [approvedPayments, setApprovedPayments] = useState([]);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [approvedError, setApprovedError] = useState('');
  const [approvedPage, setApprovedPage] = useState(1);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedTotalPages, setApprovedTotalPages] = useState(1);
  // Step 5B — explicit fund-verification confirmation, required before Approve
  const [fundsVerified, setFundsVerified] = useState(false);

  const getAuthError = (status) =>
    status === 401
      ? 'Your session has expired. Please log in again.'
      : status === 403
      ? 'You are not authorised to manage payments. Admin access is required.'
      : '';

  // Step 5B — human-readable proof file size (metadata only, never file bytes)
  const formatFileSize = (bytes) => {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };

  const loadPayments = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/admin/pending`, {
        headers: getAuthHeaders()
      });

      const authError = getAuthError(res.status);
      if (authError) {
        setError(authError);
        return;
      }

      if (!res.ok) {
        setError('Unable to load pending payments. Please try again.');
        return;
      }

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Unable to load pending payments.');
        return;
      }

      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return payments;

    return payments.filter((payment) => {
      const participant = payment.participantId;
      const participantName = participant
        ? `${participant.firstName || ''} ${participant.lastName || ''}`.trim()
        : '';
      const courseLabel = `${payment.courseName || ''} ${payment.courseCode || ''}`;

      return (
        participantName.toLowerCase().includes(term) ||
        (participant && (participant.email || '').toLowerCase().includes(term)) ||
        courseLabel.toLowerCase().includes(term) ||
        String(payment.transactionId || '').toLowerCase().includes(term)
      );
    });
  }, [payments, searchTerm]);

  const pendingCount = payments.length;
  const pendingAmount = payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );

  /* Approved PAID + billNumber payments for the automatic bill list.
     Read-only fetch via GET /api/payments/admin/approved (admin JWT);
     never mutates payment records. Backend decides eligibility; the
     UI only renders rows it was given. */
  const loadApprovedPayments = async (page = 1) => {
    setApprovedLoading(true);
    setApprovedError('');

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/payments/admin/approved?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(APPROVED_PAGE_SIZE)}`,
        { headers: getAuthHeaders() }
      );

      const authError = getAuthError(res.status);
      if (authError) {
        setApprovedError(authError);
        return;
      }

      if (!res.ok) {
        setApprovedError('Unable to load approved payments. Please try again.');
        return;
      }

      const data = await res.json();

      if (!data.success) {
        setApprovedError(data.message || 'Unable to load approved payments.');
        return;
      }

      setApprovedPayments(Array.isArray(data.payments) ? data.payments : []);
      setApprovedTotal(Number(data.total) || 0);
      setApprovedTotalPages(Number(data.totalPages) || 1);
      setApprovedPage(Number(data.page) || page);
    } catch (err) {
      setApprovedError('Unable to reach the server. Please try again.');
    } finally {
      setApprovedLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedPayments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDecision = (payment, action) => {
    setError('');
    setNotice('');
    setRemark('');
    setDecision({ payment, action });
    // Step 5B — approval safeguard always starts unchecked for each dialog
    setFundsVerified(false);
  };

  const cancelDecision = () => {
    setDecision(null);
    setRemark('');
    // Step 5B — reset so a reopened dialog never inherits a prior confirmation
    setFundsVerified(false);
  };

  /* Step 5B — open the payment screenshot through the authorized backend
     endpoint only (GET /api/payments/:id/proof). Never render proofPublicId /
     proofUrl from the payment object and never build a Cloudinary URL here.
     fetch() follows the backend 302 to response.url; we open that URL in a
     new tab only after the backend check succeeded (res.ok). */
  const openProof = async (payment) => {
    const paymentId = payment && (payment._id || payment.id);
    if (!paymentId || proofLoadingId) return;
    // Open the tab synchronously on click so popup blockers allow it.
    // It is navigated to the verified URL only after backend auth succeeds,
    // and closed again if opening fails — no blank tab is left behind.
    const proofTab = window.open('', '_blank', 'noopener,noreferrer');
    if (!proofTab) {
      setNotice('Please allow popups for this site to view the payment screenshot.');
      return;
    }
    try { proofTab.opener = null; } catch { /* noop */ }
    setProofLoadingId(paymentId);
    setNotice('');
    const closeTab = () => { try { proofTab.close(); } catch { /* noop */ } };
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/proof`, {
        headers: getAuthHeaders()
      });

      const authError = getAuthError(res.status);
      if (authError) {
        closeTab();
        setNotice(authError);
        return;
      }

      if (res.status === 404) {
        closeTab();
        setNotice('Payment screenshot is not available for this payment.');
        return;
      }

      if (!res.ok) {
        closeTab();
        setNotice('Unable to open the payment screenshot. Please try again.');
        return;
      }

      // Authorized: backend redirected to a short-lived private delivery URL.
      if (res.url) {
        proofTab.location.href = res.url;
      } else {
        closeTab();
        setNotice('Unable to open the payment screenshot. Please try again.');
      }
    } catch (err) {
      // No tab is left open on failure.
      closeTab();
      setNotice('Unable to reach the server. Please try again.');
    } finally {
      setProofLoadingId('');
    }
  };

  /* Official bill PDF for an APPROVED (PAID + persisted billNumber)
     payment only. Calls the secure backend endpoint with the admin's
     JWT and downloads the actual PDF bytes with a safe filename.
     Never shown for pending/rejected payments. */
  const downloadBill = async (payment) => {
    const paymentId = payment && (payment._id || payment.id);
    if (!paymentId || billLoadingId) return;
    // Table rows always carry status + billNumber; the backend (not the
    // client) is the final eligibility judge. Requests are sent only
    // for PAID rows with a persisted bill number.
    if (payment.status !== 'PAID' || !payment.billNumber) return;
    setBillLoadingId(paymentId);
    setNotice('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/bill-pdf`, {
        headers: getAuthHeaders()
      });

      const authError = getAuthError(res.status);
      if (authError) {
        setNotice(authError);
        return;
      }

      if (res.status === 404) {
        setNotice('Approved bill not found for this payment.');
        return;
      }

      if (!res.ok) {
        let detail = '';
        try {
          const errData = await res.clone().json();
          detail = errData && errData.message ? `: ${errData.message}` : '';
        } catch { /* binary body — keep generic message */ }
        setNotice(`Unable to download the approved bill${detail}. Please try again.`);
        return;
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        setNotice('Unable to download the approved bill. Please try again.');
        return;
      }

      const safeBill = String(payment.billNumber || 'bill').replace(/[^A-Za-z0-9-_]/g, '-');
      const contentDisp = res.headers.get('content-disposition') || '';
      const matchName = /filename="?([^";]+)"?/i.exec(contentDisp);
      const downloadName = matchName && matchName[1] ? matchName[1] : `${safeBill}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setNotice('Unable to reach the server. Please try again.');
    } finally {
      setBillLoadingId('');
    }
  };

  const submitDecision = async () => {
    if (!decision) return;

    // Step 5B — only the two backend-supported decision actions are allowed
    if (decision.action !== 'approve' && decision.action !== 'reject') {
      setError('Invalid payment action. Please try again.');
      return;
    }

    // Step 5B — approval requires explicit fund-verification confirmation
    if (decision.action === 'approve' && !fundsVerified) {
      setError('Please confirm you checked the receiving bank/UPI account before approving.');
      return;
    }

    // A rejection must always carry a reason
    if (decision.action === 'reject' && !remark.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { payment, action } = decision;

      const res = await fetch(
        `${API_BASE_URL}/api/payments/admin/${payment._id}/${action}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          // Only the admin's own inputs are sent — system fields are server
          // controlled. fundsVerified mirrors the existing checkbox state;
          // the backend requires boolean true on approve (an attestation
          // made after checking the actual funds received).
          body: JSON.stringify({
            adminRemarks: remark.trim(),
            fundsVerified: fundsVerified === true
          })
        }
      );

      const authError = getAuthError(res.status);
      if (authError) {
        setError(authError);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'The payment could not be processed.');
        return;
      }

      // Legacy records without a transaction ID must not render
      // "Payment undefined …" in the admin's confirmation notice.
      const paymentRef = payment.transactionId ? `Payment ${payment.transactionId}` : 'Payment';
      setNotice(
        action === 'approve'
          ? `${paymentRef} approved (PAID).${
              data && data.payment && data.payment.billNumber
                ? ` Bill number: ${data.payment.billNumber}.`
                : ''
            }`
          : `${paymentRef} rejected.`
      );
      setDecision(null);
      setRemark('');
      // Step 5B — reset so the next dialog starts unchecked
      setFundsVerified(false);
      await loadPayments();
      // Refresh the automatic approved-bill list after a successful
      // decision (approval adds a row; rejection adds nothing). A
      // refresh failure must never hide the success notice above,
      // so it runs in its own guarded call.
      try {
        await loadApprovedPayments(approvedPage);
      } catch { /* approved list keeps its own error state */ }
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mp-page">
      {/* ── HEADER ── */}
      <div className="mp-header">
        <h1 className="mp-header-title">Payment Verification</h1>
        <p className="mp-header-subtitle">
          Review submitted payment references and approve or reject them
        </p>
      </div>

      {/* ── STATISTICS ── */}
      <div className="mp-stats-row">
        <LMSCard className="mp-stat-card">
          <div className="mp-stat-inner">
            <div className="mp-stat-icon mp-stat-icon--pending">PENDING</div>
            <div className="mp-stat-data">
              <h3>Pending Requests</h3>
              <p className="mp-stat-value mp-stat-value--pending">{pendingCount}</p>
            </div>
          </div>
        </LMSCard>

        <LMSCard className="mp-stat-card">
          <div className="mp-stat-inner">
            <div className="mp-stat-icon mp-stat-icon--revenue">AMOUNT</div>
            <div className="mp-stat-data">
              <h3>Awaiting Verification</h3>
              <p className="mp-stat-value mp-stat-value--revenue">
                ₹{pendingAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </LMSCard>
      </div>

      {/* ── STATUS MESSAGES ── */}
      {error && (
        <div
          className="badge-lms badge-lms-danger"
          style={{ marginBottom: 'var(--lms-space-4)' }}
          role="alert"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          className="badge-lms badge-lms-success"
          style={{ marginBottom: 'var(--lms-space-4)' }}
          role="status"
        >
          {notice}
        </div>
      )}


      {/* ── DECISION PANEL ── */}
      {decision && (
        <LMSCard className="mp-table-card">
          <div style={{ padding: 'var(--lms-space-5)' }}>
            <h3
              style={{
                margin: '0 0 var(--lms-space-3)',
                fontSize: 'var(--lms-text-lg)'
              }}
            >
              {decision.action === 'approve' ? 'Approve payment' : 'Reject payment'} —{' '}
              {decision.payment.transactionId || 'Not provided'}
            </h3>

            <label
              htmlFor="admin-remarks"
              style={{
                display: 'block',
                marginBottom: 'var(--lms-space-2)',
                fontWeight: 'var(--lms-font-semibold)'
              }}
            >
              {decision.action === 'reject'
                ? 'Rejection reason (required)'
                : 'Remark (optional)'}
            </label>

            <textarea
              id="admin-remarks"
              className="textarea-lms"
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={
                decision.action === 'reject'
                  ? 'Reason for rejecting this payment…'
                  : 'Optional note for this approval…'
              }
            />

            {decision.action === 'approve' && (
              <div className="mp-funds-warning" role="note">
                <p>
                  A screenshot or transaction reference alone does not confirm
                  receipt of funds. Check the receiving bank/UPI account and
                  verify the amount before approving.
                </p>
                <label className="mp-funds-check">
                  <input
                    type="checkbox"
                    checked={fundsVerified}
                    onChange={(e) => setFundsVerified(e.target.checked)}
                  />
                  <span>
                    I checked the receiving account and verified the amount for
                    this payment.
                  </span>
                </label>
              </div>
            )}

            <div
              className="mp-action-cells"
              style={{
                justifyContent: 'flex-start',
                marginTop: 'var(--lms-space-4)'
              }}
            >
              <LMSButton
                variant={decision.action === 'approve' ? 'success' : 'warning'}
                onClick={submitDecision}
                loading={submitting}
                disabled={
                  submitting ||
                  (decision.action === 'reject' && !remark.trim()) ||
                  (decision.action === 'approve' && !fundsVerified)
                }
              >
                {decision.action === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </LMSButton>
              <LMSButton variant="outline" onClick={cancelDecision} disabled={submitting}>
                Cancel
              </LMSButton>
            </div>
          </div>
        </LMSCard>
      )}

      {/* ── CONTROLS ── */}
      <div className="mp-controls">
        <div className="mp-search-filter">
          <input
            type="text"
            className="input-lms"
            placeholder="Search by participant, course or transaction ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <LMSButton variant="outline" onClick={loadPayments} disabled={loading}>
          Refresh
        </LMSButton>
      </div>


      {/* ── APPROVED PAYMENTS (automatic bill download) ── */}
      <LMSCard className="mp-table-card">
        <div style={{ padding: 'var(--lms-space-5)' }}>
          <div className="mp-approved-head">
            <div>
              <h3 className="mp-approved-title">
                Approved payments — bills (PDF)
              </h3>
              <p className="mp-approved-sub">
                {approvedLoading
                  ? 'Loading approved payments…'
                  : `Showing ${approvedPayments.length} of ${approvedTotal} approved payments`}
              </p>
            </div>
            <LMSButton
              variant="secondary"
              onClick={() => loadApprovedPayments(approvedPage)}
              disabled={approvedLoading}
            >
              {approvedLoading ? 'Loading…' : 'Refresh'}
            </LMSButton>
          </div>

          {approvedError && (
            <div
              className="badge-lms badge-lms-danger"
              style={{ marginTop: 'var(--lms-space-3)' }}
              role="alert"
            >
              {approvedError}{' '}
              <button
                type="button"
                className="mp-retry-btn"
                onClick={() => loadApprovedPayments(approvedPage)}
              >
                Retry
              </button>
            </div>
          )}

          {approvedLoading ? (
            <p style={{ marginTop: 'var(--lms-space-4)' }}>Loading approved payments…</p>
          ) : approvedPayments.length === 0 && !approvedError ? (
            <div className="mp-empty" style={{ marginTop: 'var(--lms-space-4)' }}>
              <div className="mp-empty-icon">NO DATA</div>
              <h3>No approved payments</h3>
              <p>Approved payments with bills will appear here automatically.</p>
            </div>
          ) : approvedPayments.length > 0 ? (
            <ApprovedPaymentsTable
              payments={approvedPayments}
              billLoadingId={billLoadingId}
              onDownload={downloadBill}
              page={approvedPage}
              totalPages={approvedTotalPages}
              loading={approvedLoading}
              onPage={(p) => loadApprovedPayments(p)}
            />
          ) : null}
        </div>
      </LMSCard>

      {/* ── PENDING PAYMENTS TABLE ── */}
      <LMSCard className="mp-table-card">
        <div className="mp-table-scroll">
          <table className="mp-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Transaction ID</th>
                <th>Payment Method</th>
                <th>Payment Date</th>
                <th>Proof</th>
                <th>Bill Number</th>
                <th>Verified At</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11">Loading pending payments…</td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => {
                  const participant = payment.participantId;
                  const participantName = participant
                    ? `${participant.firstName || ''} ${participant.lastName || ''}`.trim()
                    : '';
                  const proofRowId = payment._id || payment.id;
                  const proofBusy = proofLoadingId && String(proofLoadingId) === String(proofRowId);

                  return (
                    <tr key={payment._id}>
                      <td data-label="Participant">
                        {participantName || 'Unknown participant'}
                        {participant && participant.email && (
                          <div
                            style={{
                              fontSize: 'var(--lms-text-xs)',
                              color: 'var(--lms-text-secondary)'
                            }}
                          >
                            {participant.email}
                          </div>
                        )}
                      </td>
                      <td data-label="Course">
                        {payment.courseName || payment.courseCode}
                        {payment.courseName && payment.courseCode && (
                          <div
                            style={{
                              fontSize: 'var(--lms-text-xs)',
                              color: 'var(--lms-text-secondary)'
                            }}
                          >
                            {payment.courseCode}
                          </div>
                        )}
                      </td>
                      <td data-label="Amount" className="mp-amount-cell">
                        ₹{Number(payment.amount || 0).toLocaleString()}
                      </td>
                      <td data-label="Transaction ID" className="mp-txn-cell">
                        {payment.transactionId || '—'}
                      </td>
                      <td data-label="Payment Method">
                        {payment.paymentMethod === 'UPI_ID' ? 'UPI-ID submission' : (payment.paymentMethod || '—')}
                        {payment.paymentMethod === 'UPI_ID' && (
                          <div
                            style={{
                              fontSize: 'var(--lms-text-xs)',
                              color: 'var(--lms-text-secondary)'
                            }}
                          >
                            Verify the actual incoming funds in the institute&apos;s receiving account — a UPI ID alone is not proof of payment.
                          </div>
                        )}
                      </td>
                      <td data-label="Payment Date">{formatDate(payment.paymentDate)}</td>
                      <td data-label="Proof">
                        {payment.hasProof ? (
                          <div className="mp-proof-cell">
                            <LMSButton
                              variant="outline"
                              onClick={() => openProof(payment)}
                              disabled={!!proofBusy}
                              loading={!!proofBusy}
                            >
                              {proofBusy ? 'Opening…' : 'View Proof'}
                            </LMSButton>
                            {(payment.proofMime || payment.proofSize) && (
                              <div className="mp-proof-meta">
                                {[payment.proofMime, formatFileSize(payment.proofSize)]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="mp-proof-empty">No screenshot</span>
                        )}
                      </td>
                      {/* Step 6F — persisted bill number display only.
                          This queue lists PENDING records, so the cell shows
                          a neutral placeholder; a persisted value (PAID via
                          another view, or included in a future response) is
                          shown, and a PAID row without one is flagged for
                          investigation. Never invented here. */}
                      <td data-label="Bill Number" className="mp-bill-cell">
                        {payment.billNumber
                          ? payment.billNumber
                          : payment.status === 'PAID'
                          ? 'Missing bill number'
                          : '—'}
                      </td>
                      {/* Step 6F — verifiedAt only when the server supplied it. */}
                      <td data-label="Verified At">{formatDate(payment.verifiedAt)}</td>
                      <td data-label="Status">
                        <span className="mp-status-badge mp-status-badge--pending">
                          {payment.status}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="mp-action-cells">
                          <LMSButton
                            variant="success"
                            onClick={() => openDecision(payment, 'approve')}
                          >
                            Approve
                          </LMSButton>
                          <LMSButton
                            variant="warning"
                            onClick={() => openDecision(payment, 'reject')}
                          >
                            Reject
                          </LMSButton>
                          {/* Safety net: this PENDING queue never returns PAID rows,
                              so this button stays hidden here. Approved rows
                              get their Download Bill (PDF) button from the
                              Approved Payments section below. */}
                          {payment.status === 'PAID' && payment.billNumber && (
                            <LMSButton
                              variant="primary"
                              onClick={() => downloadBill(payment)}
                              disabled={billLoadingId === (payment._id || payment.id)}
                            >
                              {billLoadingId === (payment._id || payment.id)
                                ? 'Loading...'
                                : 'Download Bill (PDF)'}
                            </LMSButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11">
                    <div className="mp-empty">
                      <div className="mp-empty-icon">NO DATA</div>
                      <h3>No pending payments</h3>
                      <p>
                        {searchTerm
                          ? 'No pending payments match your search.'
                          : 'There are no payments waiting for verification.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </LMSCard>

      {/* ── SUMMARY FOOTER ── */}
      <div className="mp-footer">
        <span>
          Showing {filteredPayments.length} of {pendingCount} pending payments
        </span>
        <span className="mp-footer-revenue">
          Pending Amount: ₹{pendingAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default ManagePayments;

