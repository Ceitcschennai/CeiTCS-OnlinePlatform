import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/paymentHistory.css';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const [paymentHistory] = useState([
    {
      id: 1,
      transactionId: 'TXN1234567890',
      paymentFor: 'Mathematics Tuition - Monthly Fee',
      amount: 1500,
      date: '2025-07-15',
      status: 'completed',
      method: 'UPI',
      nextDueDate: '2025-08-15'
    },
    {
      id: 2,
      transactionId: 'TXN1234567891',
      paymentFor: 'Physics Tuition - Monthly Fee',
      amount: 1200,
      date: '2025-07-10',
      status: 'completed',
      method: 'Credit Card',
      nextDueDate: '2025-08-10'
    },
    {
      id: 3,
      transactionId: 'TXN1234567892',
      paymentFor: 'Chemistry Lab Fee',
      amount: 500,
      date: '2025-07-05',
      status: 'completed',
      method: 'Net Banking',
      nextDueDate: '2025-08-05'
    },
    {
      id: 4,
      transactionId: 'TXN1234567893',
      paymentFor: 'English Extra Classes',
      amount: 800,
      date: '2025-06-28',
      status: 'completed',
      method: 'UPI',
      nextDueDate: '2025-07-28'
    }
  ]);

  const [pendingPayments] = useState([
    {
      id: 1,
      paymentFor: 'Mathematics Tuition - Monthly Fee',
      amount: 1500,
      dueDate: '2025-07-25',
      status: 'pending',
      daysOverdue: 0
    },
    {
      id: 2,
      paymentFor: 'Biology Practical Fee',
      amount: 600,
      dueDate: '2025-07-20',
      status: 'overdue',
      daysOverdue: 5
    }
  ]);

  const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPending = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'PAID';
      case 'pending':
        return 'PENDING';
      case 'overdue':
        return 'OVERDUE';
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
      default:
        return 'status-unknown';
    }
  };

  const downloadReceipt = (payment) => {
    // Create a simple text receipt
    const receiptContent = `
ONLINE TUITION PAYMENT RECEIPT
================================

Transaction ID: ${payment.transactionId}
Date: ${payment.date}
Payment For: ${payment.paymentFor}
Amount: ₹${payment.amount}
Payment Method: ${payment.method}
Status: ${payment.status.toUpperCase()}

Thank you for your payment!

Contact: support@onlinetuition.com
Phone: +91 98765 43210
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
                    <p className="due-date">Due: {new Date(payment.dueDate).toLocaleDateString('en-IN', { 
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
                    <button 
                      className="download-btn"
                      onClick={() => downloadReceipt(payment)}
                      title="Download Receipt"
                    >
                      Download
                    </button>
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
          <h3>No Payment History</h3>
          <p>Your payment history will appear here once you make your first payment.</p>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
