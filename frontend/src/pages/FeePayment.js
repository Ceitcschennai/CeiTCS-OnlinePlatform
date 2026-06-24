import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentGateway from '../components/PaymentGateway';
import '../styles/feePayment.css';

const FeePayment = () => {
  const navigate = useNavigate();
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  const [feeStructure] = useState([
    {
      id: 1,
      subject: 'Mathematics',
      type: 'Monthly Tuition',
      amount: 1500,
      dueDate: '2025-07-25',
      description: 'Regular monthly tuition fee for Mathematics',
      status: 'due'
    },
    {
      id: 2,
      subject: 'Physics',
      type: 'Monthly Tuition',
      amount: 1200,
      dueDate: '2025-07-20',
      description: 'Regular monthly tuition fee for Physics',
      status: 'overdue'
    },
    {
      id: 3,
      subject: 'Chemistry',
      type: 'Lab Fee',
      amount: 500,
      dueDate: '2025-07-30',
      description: 'Monthly laboratory fee for Chemistry practicals',
      status: 'due'
    },
    {
      id: 4,
      subject: 'English',
      type: 'Extra Classes',
      amount: 800,
      dueDate: '2025-08-01',
      description: 'Additional English speaking and writing classes',
      status: 'upcoming'
    },
    {
      id: 5,
      subject: 'Computer Science',
      type: 'Monthly Tuition',
      amount: 1800,
      dueDate: '2025-07-28',
      description: 'Monthly tuition fee for Computer Science',
      status: 'due'
    }
  ]);

  const handlePaymentSelect = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = (paymentData) => {
    setPaymentSuccess({
      ...paymentData,
      feeDetails: selectedPayment
    });
    setShowPaymentGateway(false);
    setSelectedPayment(null);
  };

  const handlePaymentFailure = (error) => {
    alert(`Payment failed: ${error.error}`);
    setShowPaymentGateway(false);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'due':
        return 'status-due';
      case 'overdue':
        return 'status-overdue';
      case 'upcoming':
        return 'status-upcoming';
      default:
        return 'status-default';
    }
  };

  const getStatusIcon = (status) => {
    // Using text-based indicators for a professional look
    switch (status) {
      case 'due':
        return 'PAYMENT DUE';
      case 'overdue':
        return 'PAYMENT OVERDUE';
      case 'upcoming':
        return 'UPCOMING PAYMENT';
      default:
        return 'PENDING PAYMENT';
    }
  };

  const totalDue = feeStructure
    .filter(fee => fee.status === 'due' || fee.status === 'overdue')
    .reduce((sum, fee) => sum + fee.amount, 0);

  const overdueCount = feeStructure.filter(fee => fee.status === 'overdue').length;

  if (paymentSuccess) {
    return (
      <div className="fee-payment-page">
        <div className="payment-success-container">
          <div className="success-icon">
            <div className="checkmark">✓</div>
          </div>
          <h2>Payment Successful!</h2>
          <div className="success-details">
            <p><strong>Transaction ID:</strong> {paymentSuccess.transactionId}</p>
            <p><strong>Amount Paid:</strong> ₹{paymentSuccess.amount}</p>
            <p><strong>Payment For:</strong> {paymentSuccess.feeDetails.subject} - {paymentSuccess.feeDetails.type}</p>
            <p><strong>Payment Method:</strong> {paymentSuccess.method}</p>
            <p><strong>Date:</strong> {new Date(paymentSuccess.timestamp).toLocaleDateString()}</p>
          </div>
          <div className="success-actions">
            <button
              className="download-receipt-btn"
              onClick={() => {
                const receiptContent = `
ONLINE TUITION PAYMENT RECEIPT
================================

Transaction ID: ${paymentSuccess.transactionId}
Date: ${new Date(paymentSuccess.timestamp).toLocaleDateString()}
Payment For: ${paymentSuccess.feeDetails.subject} - ${paymentSuccess.feeDetails.type}
Amount: ₹${paymentSuccess.amount}
Payment Method: ${paymentSuccess.method}
Status: SUCCESS

Thank you for your payment!

Contact: support@onlinetuition.com
Phone: +91 98765 43210
                `;

                const blob = new Blob([receiptContent], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${paymentSuccess.transactionId}.txt`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }}
            >
              Download Receipt
            </button>
            <button
              className="back-to-fees-btn"
              onClick={() => setPaymentSuccess(null)}
            >
              Back to Fees
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPaymentGateway && selectedPayment) {
    return (
      <div className="fee-payment-page">
        <div className="payment-gateway-container">
          <PaymentGateway
            amount={selectedPayment.amount}
            paymentFor={`${selectedPayment.subject} - ${selectedPayment.type}`}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentFailure={handlePaymentFailure}
            onBack={() => {
              setShowPaymentGateway(false);
              setSelectedPayment(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fee-payment-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2>Fee Management Portal</h2>
            <p>Track, manage, and process all your tuition fee payments</p>
          </div>
          <div className="header-info-section">
            <div className="header-info-item">
              <span className="info-label">Academic Year</span>
              <span className="info-value">2025-2026</span>
            </div>
            <div className="header-info-item">
              <span className="info-label">Last Updated</span>
              <span className="info-value">{new Date().toLocaleDateString('en-US', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="fee-summary">
        <div className="summary-card total-due">
          <div className="summary-icon">
            <span className="icon-text">TOTAL</span>
          </div>
          <div className="summary-content">
            <h3>Total Due</h3>
            <p>₹{totalDue.toLocaleString()}</p>
          </div>
        </div>
        {overdueCount > 0 && (
          <div className="summary-card overdue-alert">
            <div className="summary-icon">
              <span className="icon-text">OVERDUE</span>
            </div>
            <div className="summary-content">
              <h3>Overdue Payments</h3>
              <p>{overdueCount} payment{overdueCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
        <div className="summary-card total-subjects">
          <div className="summary-icon">
            <span className="icon-text">SUBJECTS</span>
          </div>
          <div className="summary-content">
            <h3>Active Subjects</h3>
            <p>{feeStructure.length}</p>
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="fee-structure-section">
        <h3>Fee Structure</h3>
        <div className="fee-cards-grid">
          {feeStructure.map(fee => (
            <div key={fee.id} className={`fee-card ${getStatusClass(fee.status)}`}>
              <div className="fee-header">
                <h4>{fee.subject}</h4>
                <span className={`status-badge ${getStatusClass(fee.status)}`}>
                  {getStatusIcon(fee.status)}
                </span>
              </div>
              <div className="fee-details">
                <p className="fee-type">{fee.type}</p>
                <p className="fee-description">{fee.description}</p>
                <div className="fee-amount">₹{fee.amount}</div>
                <div className="fee-due-date">Due: {fee.dueDate}</div>
              </div>
              <div className="fee-actions">
                {(fee.status === 'due' || fee.status === 'overdue') && (
                  <button
                    className="pay-now-btn"
                    onClick={() => handlePaymentSelect(fee)}
                  >
                    Pay Now
                  </button>
                )}
                {fee.status === 'upcoming' && (
                  <button className="pay-advance-btn">
                    Pay in Advance
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button
            className="bulk-pay-btn"
            onClick={() => {
              const duePayments = feeStructure.filter(fee => fee.status === 'due' || fee.status === 'overdue');
              if (duePayments.length > 0) {
                const totalAmount = duePayments.reduce((sum, fee) => sum + fee.amount, 0);
                setSelectedPayment({
                  id: 'bulk',
                  subject: 'All Due Payments',
                  type: 'Bulk Payment',
                  amount: totalAmount,
                  description: `Payment for ${duePayments.length} pending fees`
                });
                setShowPaymentGateway(true);
              }
            }}
            disabled={totalDue === 0}
          >
            Pay All Due (₹{totalDue})
          </button>
          <button className="download-structure-btn">
            Download Fee Structure
          </button>
          <button
            className="payment-history-btn"
            onClick={() => navigate('/payment-history')}
          >
            View Payment History
          </button>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="payment-instructions">
        <h3>Payment Guidelines</h3>
        <div className="instructions-container">
          <div className="instruction-column">
            <div className="instruction-item">
              <div className="instruction-icon payment-methods"></div>
              <div className="instruction-content">
                <h4>Payment Methods</h4>
                <p>Multiple secure options available including Credit/Debit Cards, UPI, and Net Banking.</p>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon notification"></div>
              <div className="instruction-content">
                <h4>Payment Notifications</h4>
                <p>Automatic confirmation email and SMS alerts for successful payments and upcoming due dates.</p>
              </div>
            </div>
          </div>

          <div className="instruction-column">
            <div className="instruction-item">
              <div className="instruction-icon late-fee"></div>
              <div className="instruction-content">
                <h4>Late Payment Policy</h4>
                <p>Additional charges may apply for payments made after the due date. Please ensure timely payments.</p>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon support"></div>
              <div className="instruction-content">
                <h4>Payment Support</h4>
                <p>For payment-related assistance, contact our dedicated support at +91 98765 43210 or email at support@onlinetuition.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeePayment;
