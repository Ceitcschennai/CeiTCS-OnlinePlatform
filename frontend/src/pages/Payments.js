import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/payments.css';
import LMSCard from '../components/common/LMSCard';
import LMSButton from '../components/common/LMSButton';
import {
  FaCreditCard,
  FaHistory,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaRupeeSign,
  FaUser,
  FaFileInvoice
} from 'react-icons/fa';

const Payments = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('payment');

  // Mock data for demonstration
  const [paymentHistory] = useState([
    {
      id: 'PAY001',
      date: '2025-01-15',
      amount: 5000,
      status: 'Completed',
      method: 'Credit Card',
      description: 'Monthly Tuition Fee - January 2025',
      transactionId: 'TXN123456789'
    },
    {
      id: 'PAY002',
      date: '2024-12-15',
      amount: 5000,
      status: 'Completed',
      method: 'UPI',
      description: 'Monthly Tuition Fee - December 2024',
      transactionId: 'TXN123456788'
    },
    {
      id: 'PAY003',
      date: '2024-11-15',
      amount: 5000,
      status: 'Completed',
      method: 'Net Banking',
      description: 'Monthly Tuition Fee - November 2024',
      transactionId: 'TXN123456787'
    }
  ]);

  const [pendingPayments] = useState([
    {
      id: 'DUE001',
      dueDate: '2025-02-15',
      amount: 5000,
      description: 'Monthly Tuition Fee - February 2025',
      status: 'Pending'
    }
  ]);

  const handlePayment = (paymentId) => {
    // Navigate to payment gateway or show payment modal
    navigate('/payment-gateway', { state: { paymentId } });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <FaCheckCircle className="pay-status-icon pay-status-icon--completed" />;
      case 'Pending':
        return <FaClock className="pay-status-icon pay-status-icon--pending" />;
      case 'Failed':
        return <FaExclamationTriangle className="pay-status-icon pay-status-icon--failed" />;
      default:
        return <FaClock className="pay-status-icon pay-status-icon--pending" />;
    }
  };

  const getStatusClass = (status) => {
    return status.toLowerCase();
  };

  return (
    <div className="pay-page">

      {/* ── HEADER ── */}
      <div className="pay-header">
        <h1 className="pay-header-title">Payments</h1>
        <p className="pay-header-subtitle">Manage your fee payments and view payment history</p>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="pay-tabs" role="tablist">
        <LMSButton
          variant={activeTab === 'payment' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('payment')}
          className="pay-tab-btn"
          role="tab"
          aria-selected={activeTab === 'payment'}
        >
          <FaCreditCard /> Make Payment
        </LMSButton>
        <LMSButton
          variant={activeTab === 'history' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('history')}
          className="pay-tab-btn"
          role="tab"
          aria-selected={activeTab === 'history'}
        >
          <FaHistory /> Payment History
        </LMSButton>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="pay-content" role="tabpanel">
        {activeTab === 'payment' && (
          <div className="pay-tab-panel">

            {/* Outstanding Payments */}
            <section className="pay-section">
              <h2 className="pay-section-title">
                <FaExclamationTriangle className="pay-section-icon" />
                Outstanding Payments
              </h2>
              {pendingPayments.length > 0 ? (
                <div className="pay-cards-grid">
                  {pendingPayments.map((payment) => (
                    <LMSCard key={payment.id} className="pay-card pay-card--pending" hover>
                      <div className="pay-card-header">
                        <div className="pay-card-info">
                          <h3 className="pay-card-title">{payment.description}</h3>
                          <p className="pay-card-id">Payment ID: {payment.id}</p>
                        </div>
                        {getStatusIcon(payment.status)}
                      </div>

                      <div className="pay-card-details">
                        <div className="pay-detail-row">
                          <FaCalendarAlt className="pay-detail-icon" />
                          <span>Due Date: {new Date(payment.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="pay-detail-row">
                          <FaRupeeSign className="pay-detail-icon" />
                          <span>Amount: ₹{payment.amount.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="pay-card-footer">
                        <LMSButton variant="primary" onClick={() => handlePayment(payment.id)} fullWidth>
                          Pay Now
                        </LMSButton>
                      </div>
                    </LMSCard>
                  ))}
                </div>
              ) : (
                <div className="pay-empty">
                  <FaCheckCircle className="pay-empty-icon" />
                  <h3>All payments are up to date!</h3>
                  <p>You have no outstanding payments at this time.</p>
                </div>
              )}
            </section>

            {/* Payment Methods */}
            <section className="pay-section">
              <h2 className="pay-section-title">
                <FaCreditCard className="pay-section-icon" />
                Payment Methods
              </h2>
              <div className="pay-methods-grid">
                <LMSCard className="pay-method-card" hover>
                  <FaCreditCard className="pay-method-icon" />
                  <h4>Credit/Debit Card</h4>
                  <p>Pay securely with your card</p>
                </LMSCard>
                <LMSCard className="pay-method-card" hover>
                  <FaRupeeSign className="pay-method-icon" />
                  <h4>UPI</h4>
                  <p>Quick payment via UPI apps</p>
                </LMSCard>
                <LMSCard className="pay-method-card" hover>
                  <FaUser className="pay-method-icon" />
                  <h4>Net Banking</h4>
                  <p>Direct bank transfer</p>
                </LMSCard>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="pay-tab-panel">

            {/* Payment History */}
            <section className="pay-section">
              <h2 className="pay-section-title">
                <FaHistory className="pay-section-icon" />
                Payment History
              </h2>

              {paymentHistory.length > 0 ? (
                <div className="pay-table-scroll">
                  <table className="pay-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Transaction ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td>{new Date(payment.date).toLocaleDateString()}</td>
                          <td>{payment.description}</td>
                          <td className="pay-amount-col">₹{payment.amount.toLocaleString()}</td>
                          <td>{payment.method}</td>
                          <td>
                            <span className={`pay-status-badge pay-status-badge--${getStatusClass(payment.status)}`}>
                              {getStatusIcon(payment.status)}
                              {payment.status}
                            </span>
                          </td>
                          <td className="pay-txn-col">{payment.transactionId}</td>
                          <td>
                            <LMSButton variant="outline" onClick={() => {}}>
                              <FaFileInvoice /> Receipt
                            </LMSButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="pay-empty">
                  <FaHistory className="pay-empty-icon" />
                  <h3>No payment history found</h3>
                  <p>Your payment history will appear here once you make payments.</p>
                </div>
              )}
            </section>

            {/* Payment Summary */}
            <section className="pay-section">
              <h2 className="pay-section-title">
                <FaRupeeSign className="pay-section-icon" />
                Payment Summary
              </h2>
              <div className="pay-summary-grid">
                <LMSCard className="pay-summary-card" hover>
                  <h3 className="pay-summary-label">Total Paid</h3>
                  <p className="pay-summary-amount">₹{paymentHistory.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}</p>
                  <span className="pay-summary-period">This Year</span>
                </LMSCard>
                <LMSCard className="pay-summary-card" hover>
                  <h3 className="pay-summary-label">Pending Payments</h3>
                  <p className="pay-summary-amount">₹{pendingPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}</p>
                  <span className="pay-summary-period">Outstanding</span>
                </LMSCard>
                <LMSCard className="pay-summary-card" hover>
                  <h3 className="pay-summary-label">Last Payment</h3>
                  <p className="pay-summary-amount">₹{paymentHistory[0]?.amount.toLocaleString() || '0'}</p>
                  <span className="pay-summary-period">{paymentHistory[0] ? new Date(paymentHistory[0].date).toLocaleDateString() : 'N/A'}</span>
                </LMSCard>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;