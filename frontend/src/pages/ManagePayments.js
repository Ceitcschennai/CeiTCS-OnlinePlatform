import React, { useState } from 'react';
import '../styles/managePayments.css';

const initialPayments = [
  {
    id: 1,
    name: 'Monika V',
    class: '10',
    subject: 'Mathematics',
    type: 'Monthly Tuition',
    amount: 1500,
    status: 'Paid',
    datePaid: '2025-07-01',
    dueDate: '2025-08-01',
    reminder: '-',
    transactionId: 'TXN1234567890',
    paymentMethod: 'UPI'
  },
  {
    id: 2,
    name: 'Sanjay K',
    class: '12 Bio-Maths',
    subject: 'Music',
    type: 'Explore More - Keyboard',
    amount: 700,
    status: 'Pending',
    datePaid: '-',
    dueDate: '2025-07-15',
    reminder: 'Sent',
    transactionId: '-',
    paymentMethod: '-'
  },
  {
    id: 3,
    name: 'Priya S',
    class: '11 Science',
    subject: 'Physics',
    type: 'Monthly Tuition',
    amount: 1200,
    status: 'Overdue',
    datePaid: '-',
    dueDate: '2025-07-10',
    reminder: 'Sent',
    transactionId: '-',
    paymentMethod: '-'
  },
  {
    id: 4,
    name: 'Rahul M',
    class: '12 Commerce',
    subject: 'Accounts',
    type: 'Monthly Tuition',
    amount: 1000,
    status: 'Paid',
    datePaid: '2025-07-05',
    dueDate: '2025-08-05',
    reminder: '-',
    transactionId: 'TXN1234567891',
    paymentMethod: 'Credit Card'
  },
  {
    id: 5,
    name: 'Ananya K',
    class: '10',
    subject: 'English',
    type: 'Extra Classes',
    amount: 800,
    status: 'Pending',
    datePaid: '-',
    dueDate: '2025-07-20',
    reminder: 'Not Sent',
    transactionId: '-',
    paymentMethod: '-'
  }
];

const ManagePayments = () => {
  const [payments, setPayments] = useState(initialPayments);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'All' || payment.status === filterStatus;
    const matchesSearch = payment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.class.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter(p => p.status === 'Pending' || p.status === 'Overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const overdueCount = payments.filter(p => p.status === 'Overdue').length;

  const sendReminder = (paymentId) => {
    setPayments(payments.map(payment =>
      payment.id === paymentId
        ? { ...payment, reminder: 'Sent' }
        : payment
    ));
    alert('Reminder sent successfully!');
  };

  const markAsPaid = (paymentId) => {
    setPayments(payments.map(payment =>
      payment.id === paymentId
        ? { 
            ...payment, 
            status: 'Paid', 
            datePaid: new Date().toISOString().split('T')[0],
            transactionId: `TXN${Date.now()}`,
            paymentMethod: 'Cash' 
          }
        : payment
    ));
    alert('Payment marked as paid!');
  };

  const exportPayments = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Class,Subject,Type,Amount,Status,Date Paid,Due Date,Transaction ID,Payment Method\n" +
      payments.map(p => 
        `${p.name},${p.class},${p.subject},${p.type},${p.amount},${p.status},${p.datePaid},${p.dueDate},${p.transactionId},${p.paymentMethod}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payments_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="manage-payments-page">
      <div className="page-header">
        <h2>Manage Payments</h2>
        <p>Monitor and manage all student payments</p>
      </div>

      {/* Statistics Cards */}
      <div className="payment-stats">
        <div className="stat-card revenue">
          <div className="stat-icon">
            <span className="icon-text">REVENUE</span>
          </div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p>₹{totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">
            <span className="icon-text">PENDING</span>
          </div>
          <div className="stat-content">
            <h3>Pending Amount</h3>
            <p>₹{pendingAmount.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card overdue">
          <div className="stat-icon">
            <span className="icon-text">OVERDUE</span>
          </div>
          <div className="stat-content">
            <h3>Overdue Payments</h3>
            <p>{overdueCount}</p>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="payment-controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by name, subject, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
        <div className="action-buttons">
          <button className="export-btn" onClick={exportPayments}>
            Export Data
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="payments-table-container">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date Paid</th>
              <th>Due Date</th>
              <th>Transaction ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id}>
                <td data-label="Student">{payment.name}</td>
                <td data-label="Class">{payment.class}</td>
                <td data-label="Subject">{payment.subject}</td>
                <td data-label="Type">{payment.type}</td>
                <td data-label="Amount">₹{payment.amount}</td>
                <td data-label="Status">
                  <span className={`status-badge ${payment.status.toLowerCase()}`}>
                    {payment.status === 'Paid' ? 'PAID' : payment.status === 'Pending' ? 'PENDING' : 'OVERDUE'}
                  </span>
                </td>
                <td data-label="Date Paid">{payment.datePaid}</td>
                <td data-label="Due Date">{payment.dueDate}</td>
                <td data-label="Transaction ID">{payment.transactionId}</td>
                <td data-label="Actions">
                  <div className="action-buttons-cell">
                    {payment.status !== 'Paid' && (
                      <>
                        <button
                          className="reminder-btn"
                          onClick={() => sendReminder(payment.id)}
                          disabled={payment.reminder === 'Sent'}
                          title="Send Reminder"
                        >
                          Send Reminder
                        </button>
                        <button
                          className="mark-paid-btn"
                          onClick={() => markAsPaid(payment.id)}
                          title="Mark as Paid"
                        >
                          Mark Paid
                        </button>
                      </>
                    )}
                    {payment.status === 'Paid' && (
                      <button
                        className="receipt-btn"
                        onClick={() => {
                          const receiptContent = `
PAYMENT RECEIPT
===============
Student: ${payment.name}
Class: ${payment.class}
Subject: ${payment.subject}
Type: ${payment.type}
Amount: ₹${payment.amount}
Date: ${payment.datePaid}
Transaction ID: ${payment.transactionId}
Payment Method: ${payment.paymentMethod}
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
                        }}
                        title="Download Receipt"
                      >
                        Download Receipt
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPayments.length === 0 && (
        <div className="no-payments">
          <div className="no-payments-icon">
            <span className="icon-text">NO DATA</span>
          </div>
          <h3>No payments found</h3>
          <p>No payments match your current filter criteria.</p>
        </div>
      )}

      {/* Summary Footer */}
      <div className="payment-summary-footer">
        <div className="summary-item">
          <span>Showing {filteredPayments.length} of {payments.length} payments</span>
        </div>
        <div className="summary-item">
          <span>Total Revenue: ₹{totalRevenue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default ManagePayments;
