import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/payments.css';
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
        return <FaCheckCircle className="status-icon completed" />;
      case 'Pending':
        return <FaClock className="status-icon pending" />;
      case 'Failed':
        return <FaExclamationTriangle className="status-icon failed" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  const getStatusClass = (status) => {
    return status.toLowerCase();
  };

  return (
    <div className="payments-container">
      <div className="payments-header">
        <h1>Payments</h1>
        <p>Manage your fee payments and view payment history</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment')}
        >
          <FaCreditCard className="tab-icon" />
          Make Payment
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FaHistory className="tab-icon" />
          Payment History
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'payment' && (
          <div className="payment-tab">
            {/* Outstanding Payments */}
            <div className="section">
              <h2 className="section-title">
                <FaExclamationTriangle className="section-icon" />
                Outstanding Payments
              </h2>
              {pendingPayments.length > 0 ? (
                <div className="payments-grid">
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} className="payment-card pending">
                      <div className="payment-header">
                        <div className="payment-info">
                          <h3>{payment.description}</h3>
                          <p className="payment-id">Payment ID: {payment.id}</p>
                        </div>
                        {getStatusIcon(payment.status)}
                      </div>
                      
                      <div className="payment-details">
                        <div className="detail-item">
                          <FaCalendarAlt className="detail-icon" />
                          <span>Due Date: {new Date(payment.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="detail-item">
                          <FaRupeeSign className="detail-icon" />
                          <span>Amount: ₹{payment.amount.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="payment-actions">
                        <button 
                          className="pay-button"
                          onClick={() => handlePayment(payment.id)}
                        >
                          Pay Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-payments">
                  <FaCheckCircle className="no-payments-icon" />
                  <h3>All payments are up to date!</h3>
                  <p>You have no outstanding payments at this time.</p>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="section">
              <h2 className="section-title">
                <FaCreditCard className="section-icon" />
                Payment Methods
              </h2>
              <div className="payment-methods">
                <div className="method-card">
                  <FaCreditCard className="method-icon" />
                  <h4>Credit/Debit Card</h4>
                  <p>Pay securely with your card</p>
                </div>
                <div className="method-card">
                  <FaRupeeSign className="method-icon" />
                  <h4>UPI</h4>
                  <p>Quick payment via UPI apps</p>
                </div>
                <div className="method-card">
                  <FaUser className="method-icon" />
                  <h4>Net Banking</h4>
                  <p>Direct bank transfer</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-tab">
            <div className="section">
              <h2 className="section-title">
                <FaHistory className="section-icon" />
                Payment History
              </h2>
              
              {paymentHistory.length > 0 ? (
                <div className="history-table-container">
                  <table className="history-table">
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
                          <td className="amount">₹{payment.amount.toLocaleString()}</td>
                          <td>{payment.method}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(payment.status)}`}>
                              {getStatusIcon(payment.status)}
                              {payment.status}
                            </span>
                          </td>
                          <td className="transaction-id">{payment.transactionId}</td>
                          <td>
                            <button className="download-button">
                              <FaFileInvoice />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-history">
                  <FaHistory className="no-history-icon" />
                  <h3>No payment history found</h3>
                  <p>Your payment history will appear here once you make payments.</p>
                </div>
              )}
            </div>

            {/* Payment Summary */}
            <div className="section">
              <h2 className="section-title">
                <FaRupeeSign className="section-icon" />
                Payment Summary
              </h2>
              <div className="summary-grid">
                <div className="summary-card">
                  <h3>Total Paid</h3>
                  <p className="summary-amount">₹{paymentHistory.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}</p>
                  <span className="summary-period">This Year</span>
                </div>
                <div className="summary-card">
                  <h3>Pending Payments</h3>
                  <p className="summary-amount">₹{pendingPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}</p>
                  <span className="summary-period">Outstanding</span>
                </div>
                <div className="summary-card">
                  <h3>Last Payment</h3>
                  <p className="summary-amount">₹{paymentHistory[0]?.amount.toLocaleString() || '0'}</p>
                  <span className="summary-period">{paymentHistory[0] ? new Date(paymentHistory[0].date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
