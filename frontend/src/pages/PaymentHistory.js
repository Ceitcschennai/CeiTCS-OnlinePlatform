import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import '../styles/paymentHistory.css';

/* ============================================
   BACKEND STATUS -> EXISTING UI STATUS
   Payment.status is PENDING / PAID / REJECTED.
   This page (and its CSS) already styles
   completed / pending / overdue / unknown, so the
   backend status is mapped without renaming the UI.
   "overdue" is NOT produced by the Payment model,
   therefore no overdue payment is ever fabricated.
============================================ */
const mapStatusToUi = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'PAID':
      return 'completed';
    case 'PENDING':
      return 'pending';
    case 'REJECTED':
      return 'rejected';
    default:
      return 'unknown';
  }
};

/* Convert a stored Payment document into the shape this page renders.
   billNumber (when present) is carried through so the receipt action
   can be gated on the persisted backend value — never generated here. */
const toUiPayment = (payment) => {
  const amount = Number(payment.amount) || 0;

  return {
    id: payment._id || payment.id,
    transactionId: payment.transactionId || '',
    paymentFor: payment.courseName || payment.courseCode || 'Course Payment',
    amount,
    date: payment.paymentDate
      ? new Date(payment.paymentDate).toISOString().split('T')[0]
      : '',
    status: mapStatusToUi(payment.status),
    rawStatus: String(payment.status || '').toUpperCase(),
    billNumber: payment.billNumber || '',
    method: payment.paymentMethod || ''
  };
};

const PaymentHistory = () => {
  const navigate = useNavigate();
  // ░░ PAYMENT DATA (backend driven) ░░
  // Source: GET /api/payments/my-payments (owner scoped by the JWT).
  // The previously hardcoded demo records were removed; only this
  // logged-in participant's own stored payments are rendered.
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingPayments, setPendingPayments] = useState([]);

  // Receipt-download state (backend receipt endpoint is the source of truth)
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const [receiptError, setReceiptError] = useState("");

  // Load the logged-in participant's OWN payments using the existing JWT
  useEffect(() => {
    let cancelled = false;

    const loadPayments = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your payment history.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/my-payments`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
          if (!cancelled) {
            setError("Your session has expired. Please log in again.");
            setLoading(false);
          }
          return;
        }

        if (res.status === 403) {
          if (!cancelled) {
            setError("You are not authorised to view this payment history.");
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          if (!cancelled) {
            setError("Unable to load payment history. Please try again.");
            setLoading(false);
          }
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data.payments) ? data.payments : [];
        const uiPayments = list.map(toUiPayment);

        if (!cancelled) {
          setPaymentHistory(uiPayments);
          setPendingPayments(
            uiPayments.filter(payment => payment.status === "pending")
          );
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load payment history. Please try again.");
          setLoading(false);
        }
      }
    };

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Secure bill-download email link (?bill=<paymentId>): after the
     participant signs in and their OWN payments load, auto-download
     the matching approved bill. Backend ownership checks always run;
     a non-matching or non-approved id is ignored silently. */
  useEffect(() => {
    if (loading || paymentHistory.length === 0) return;
    let billId = "";
    try {
      billId = new URLSearchParams(window.location.search).get("bill") || "";
    } catch { billId = ""; }
    if (!billId) return;
    const match = paymentHistory.find(
      (p) => String(p.id) === String(billId) && p.status === "completed" && p.billNumber
    );
    if (match) {
      downloadReceipt(match);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("bill");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      } catch { /* keep URL unchanged */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, paymentHistory]);

  // Only PAID records are counted as "Total Paid"
  const totalPaid = paymentHistory
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalPending = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'PAID';
      case 'pending':
        return 'PENDING';
      case 'overdue':
        return 'OVERDUE';
      case 'rejected':
        return 'REJECTED';
      default:
        return 'UNKNOWN';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'overdue':
        return 'status-overdue';
      case 'rejected':
        // reuses the existing red badge style (no CSS change)
        return 'status-overdue';
      default:
        return 'status-unknown';
    }
  };

  /* Official bill PDF comes ONLY from the authenticated backend
     endpoint GET /api/payments/:id/bill-pdf (PAID + persisted
     billNumber, owner-or-admin). Genuine PDF bytes are downloaded
     with a safe filename based on the persisted bill number. */
  const downloadReceipt = async (payment) => {
    setReceiptError("");

    if (!payment || payment.status !== 'completed' || !payment.billNumber) {
      setReceiptError("Official receipt is not available for this payment.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setReceiptError("Please log in again to download your receipt.");
      return;
    }

    setReceiptLoadingId(payment.id);

    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${payment.id}/bill-pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        setReceiptError("Your session has expired. Please log in again.");
        return;
      }

      if (res.status === 403) {
        setReceiptError("You are not authorised to access this receipt.");
        return;
      }

      if (res.status === 404) {
        setReceiptError("Receipt not found for this payment.");
        return;
      }

      if (res.status === 409) {
        let detail = "";
        try {
          const errData = await res.json();
          detail = errData && errData.message ? ` (${errData.message})` : "";
        } catch (e) { /* keep generic message */ }
        setReceiptError(`Official receipt is not available for this payment${detail}.`);
        return;
      }

      if (!res.ok) {
        setReceiptError("Unable to download receipt. Please try again.");
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        let detail = "";
        try {
          const errData = await res.json();
          detail = errData && errData.message ? ` (${errData.message})` : "";
        } catch (e) { /* keep generic message */ }
        setReceiptError(`Official receipt is not available for this payment${detail}.`);
        return;
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        setReceiptError("Official receipt is not available for this payment.");
        return;
      }

      const safeBill = String(payment.billNumber || "bill").replace(/[^A-Za-z0-9-_]/g, "-");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeBill}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setReceiptError("Unable to download receipt. Please try again.");
    } finally {
      setReceiptLoadingId(null);
    }
  };

  return (
    <div className="payment-history-page">
      <div className="page-header">
        <h2>Payment History</h2>
        <p>Track all your payments and pending dues</p>
      </div>

      {/* Summary Cards */}
      <div className="payment-summary">
        <div className="summary-card total-paid">
          <div className="summary-icon">
            <span className="icon-text">PAID</span>
          </div>
          <div className="summary-content">
            <h3>Total Paid</h3>
            <p>₹{totalPaid.toLocaleString()}</p>
          </div>
        </div>
        <div className="summary-card total-pending">
          <div className="summary-icon">
            <span className="icon-text">PENDING</span>
          </div>
          <div className="summary-content">
            <h3>Pending Amount</h3>
            <p>₹{totalPending.toLocaleString()}</p>
          </div>
        </div>
        <div className="summary-card total-transactions">
          <div className="summary-icon">
            <span className="icon-text">TOTAL</span>
          </div>
          <div className="summary-content">
            <h3>Total Transactions</h3>
            <p>{paymentHistory.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="pending-payments-section">
          <h3>Pending Payments</h3>
          <div className="pending-payments-grid">
            {pendingPayments.map(payment => (
              <div key={payment.id} className={`pending-payment-card ${payment.status}`}>
                <div className="card-content">
                  <div className="payment-info">
                    <h4>{payment.paymentFor}</h4>
                    <p className="amount">₹{payment.amount.toLocaleString()}</p>
                    <p className="due-date">Submitted: {new Date(payment.date).toLocaleDateString('en-IN', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}</p>
                    {payment.status === 'overdue' && (
                      <p className="overdue-notice">
                        Overdue by {payment.daysOverdue} day{payment.daysOverdue > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="payment-actions">
                    <button 
                      className="pay-now-btn"
                      onClick={() => navigate('/fee-payment')}
                      title={`Pay ₹${payment.amount} for ${payment.paymentFor}`}
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History Table */}
      <div className="payment-history-section">
        <h3>Payment History</h3>
        {receiptError && (
          <p className="receipt-error" role="alert">{receiptError}</p>
        )}
        <div className="payment-table-container">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Payment For</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map(payment => (
                <tr key={payment.id}>
                  <td data-label="Date">{payment.date}</td>
                  <td data-label="Transaction ID">{payment.transactionId}</td>
                  <td data-label="Payment For">{payment.paymentFor}</td>
                  <td data-label="Amount">₹{payment.amount}</td>
                  <td data-label="Method">{payment.method}</td>
                  <td data-label="Status">
                    <span className={`status-badge ${getStatusClass(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                    </span>
                  </td>
                  <td data-label="Actions">
                    {payment.status === 'completed' && payment.billNumber ? (
                      <button
                        className="download-btn"
                        onClick={() => downloadReceipt(payment)}
                        disabled={receiptLoadingId === payment.id}
                        title={`Download official bill PDF (${payment.billNumber})`}
                      >
                        {receiptLoadingId === payment.id ? "Loading..." : "Bill (PDF)"}
                      </button>
                    ) : payment.status === 'completed' ? (
                      <span className="receipt-unavailable" title="This paid payment has no persisted bill number">
                        Receipt unavailable
                      </span>
                    ) : payment.status === 'pending' ? (
                      <span className="receipt-unavailable" title="Payment is awaiting admin verification">
                        Awaiting verification
                      </span>
                    ) : payment.status === 'rejected' ? (
                      <span className="receipt-unavailable" title="Payment was rejected">
                        Rejected
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {paymentHistory.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <span className="icon-text">NO DATA</span>
          </div>
          <h3>{loading ? 'Loading Payment History' : error ? 'Unable to Load Payment History' : 'No Payment History'}</h3>
          <p>{loading ? 'Fetching your payments from the server...' : error || 'Your payment history will appear here once you make your first payment.'}</p>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
