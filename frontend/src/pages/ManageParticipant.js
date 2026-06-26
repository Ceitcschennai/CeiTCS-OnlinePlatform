import React, { useEffect, useState, useRef } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/manageparticipant.css';
import {
  FaUsers,
  FaSearch,
  FaPlus,
  FaCheck,
  FaTimes,
  FaEye,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaUserTie,
  FaEnvelope,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaDownload,
  FaBriefcase
} from 'react-icons/fa';

const ManageParticipant = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    paid: 0
  });

  const filterRef = useRef(null);

  const [formData, setFormData] = useState({
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    role: '',
    skills: '',
    approvalStatus: 'Pending',
    paymentStatus: 'Unpaid'
  });

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    const total = employees.length;
    const approved = employees.filter(e => e.approvalStatus === 'Approved').length;
    const pending = employees.filter(e => e.approvalStatus === 'Pending').length;
    const paid = employees.filter(e => e.paymentStatus === 'Paid').length;
    setStats({ total, approved, pending, paid });
  }, [employees]);

  useEffect(() => {
    let filtered = employees;
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.skills?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'approved': filtered = filtered.filter(e => e.approvalStatus === 'Approved'); break;
        case 'pending': filtered = filtered.filter(e => e.approvalStatus === 'Pending'); break;
        case 'rejected': filtered = filtered.filter(e => e.approvalStatus === 'Rejected'); break;
        case 'paid': filtered = filtered.filter(e => e.paymentStatus === 'Paid'); break;
        case 'unpaid': filtered = filtered.filter(e => e.paymentStatus === 'Unpaid'); break;
        default: break;
      }
    }
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [employees, searchTerm, filterStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/employee`);
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Not JSON response:", text);
        throw new Error("Server did not return JSON");
      }
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      salutation: '',
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      role: '',
      skills: '',
      approvalStatus: 'Pending',
      paymentStatus: 'Unpaid'
    });
  };

  const openModal = (type, employee = null) => {
    setModalType(type);
    setSelectedEmployee(employee);
    if (type === 'add') {
      resetForm();
    } 
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedEmployee(null);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = modalType === 'add'
        ? `${API_BASE_URL}/api/employee/add`
        : `${API_BASE_URL}/api/employee/${selectedEmployee._id}`;
      const method = modalType === 'add' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error(`${modalType === 'add' ? 'Add' : 'Update'} failed`);
      const result = await response.json();
      if (modalType === 'add') {
        await fetchEmployees();
        alert('✅ Participant added successfully');
      } else {
        setEmployees(prev => prev.map(emp => emp._id === selectedEmployee._id ? result : emp));
        alert('✅ Participant updated successfully');
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert(`❌ Error ${modalType === 'add' ? 'adding' : 'updating'} participant`);
    }
  };

  const toggleActiveStatus = async (employee) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/employee/${employee._id}/status`,
        {
          method: "PUT",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setEmployees((prev) =>
        prev.map((emp) =>
          emp._id === employee._id
            ? data.employee
            : emp
        )
      );

      alert(data.message);

    } catch (err) {
      console.error(err);
      alert("❌ Failed to update participant status");
    }
  };

  const handleApproval = async (id, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employee/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Approval failed');
      const updated = await response.json();
      setEmployees(prev => prev.map(emp => emp._id === id ? updated : emp));
      if (status === 'Approved') {
        alert(`✅ Approval email sent to ${updated.email}`);
      } else {
        alert(`✅ Participant ${status.toLowerCase()} successfully`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error processing approval');
    }
  };

  const handleRejectClick = (employee) => {
    setSelectedEmployee(employee);
    setRejectFeedback('');
    setShowRejectModal(true);
  };

  const processEmployeeRejection = async () => {
    if (!selectedEmployee) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/employee/${selectedEmployee._id}/approve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'Rejected',
            feedback: rejectFeedback
          })
        }
      );

      if (!response.ok) {
        throw new Error('Rejection failed');
      }

      const updated = await response.json();

      setEmployees(prev =>
        prev.map(emp =>
          emp._id === selectedEmployee._id ? updated : emp
        )
      );

      alert('✅ Participant rejected successfully');

      setShowRejectModal(false);
      setSelectedEmployee(null);
      setRejectFeedback('');
    } catch (err) {
      console.error(err);
      alert('❌ Error processing rejection');
    } finally {
      setLoading(false);
    }
  };

  const togglePayment = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employee/${id}/payment`, { method: 'PUT' });
      if (!response.ok) throw new Error('Payment toggle failed');
      const updated = await response.json();
      setEmployees(prev => prev.map(emp => emp._id === id ? updated : emp));
      alert('✅ Payment status updated successfully');
    } catch (err) {
      console.error(err);
      alert('❌ Error updating payment status');
    }
  };

  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getStatusClass = (status, type) => {
    if (type === 'approval') {
      switch (status) {
        case 'Approved': return 'status-approved';
        case 'Rejected': return 'status-rejected';
        default: return 'status-pending';
      }
    } else {
      return status === 'Paid' ? 'status-paid' : 'status-unpaid';
    }
  };

  const getInitials = (firstName, lastName) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

  const filterOptions = [
    { value: 'all', label: 'All Participants' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' }
  ];

  return (
    <div className="student-management-container">
      {/* Header */}
      <div className="student-management-header">
        <div className="student-header-content">
          <h2>
            <FaUsers className="student-header-icon" />
            Manage Participants
          </h2>
          <p>Participant management with approval tracking and payment monitoring</p>
          <div className="student-statistics-row">
            <div className="student-stat-card">
              <span className="student-stat-number">{stats.total}</span>
              <span className="student-stat-label">Total Participants</span>
            </div>
            <div className="student-stat-card">
              <span className="student-stat-number">{stats.approved}</span>
              <span className="student-stat-label">Approved</span>
            </div>
            <div className="student-stat-card">
              <span className="student-stat-number">{stats.pending}</span>
              <span className="student-stat-label">Pending</span>
            </div>
            <div className="student-stat-card">
              <span className="student-stat-number">{stats.paid}</span>
              <span className="student-stat-label">Paid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="students-controls">
        <div className="controls-row">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, email, role, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="controls-right">
            <div className="filter-dropdown" ref={filterRef}>
              <button className="filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                <FaFilter /> Filter
              </button>
              {showFilterMenu && (
                <div className="filter-menu">
                  {filterOptions.map(option => (
                    <div
                      key={option.value}
                      className={`filter-option ${filterStatus === option.value ? 'active' : ''}`}
                      onClick={() => { setFilterStatus(option.value); setShowFilterMenu(false); }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="add-student-btn" onClick={() => openModal('add')}>
              <FaPlus /> Add Participant
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="students-container">
        {loading ? (
          <div className="students-loading-spinner">
            <div className="students-spinner"></div>
            <p>Loading participants...</p>
          </div>
        ) : currentEmployees.length === 0 ? (
          <div className="empty-state">
            <FaUsers className="empty-icon" />
            <h3>No participants found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <>
            <div className="students-grid">
              {currentEmployees.map((employee) => (
                <div key={employee._id} className="student-card">
                  {/* Card Header */}
                  <div className="student-card-header">
                    <div className="student-profile">
                      <div className="student-avatar">
                        {getInitials(employee.firstName, employee.lastName)}
                      </div>
                      <div className="student-info">
                        <div className="student-name">
                          <FaUserTie style={{ color: '#059669' }} />
                          {`${employee.salutation || ''} ${employee.firstName || ''} ${employee.lastName || ''}`.trim()}
                        </div>
                        <div className="student-id">ID: {employee._id.slice(-6)}</div>
                      </div>
                    </div>
                    <div className="student-badges">
                      <span className={`status-badge ${ employee.isActive ? "status-approved" : "status-rejected" }`}> {employee.isActive ? "Active" : "Inactive"} </span>
                      <span className={`status-badge ${getStatusClass(employee.approvalStatus, 'approval')}`}>
                        {employee.approvalStatus}
                      </span>
                      {employee.approvalStatus === 'Approved' && (
                        <span className={`status-badge ${getStatusClass(employee.paymentStatus, 'payment')}`}>
                          {employee.paymentStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="student-card-body">
                    <div className="student-detail-group">
                      <div className="student-detail-label"><FaEnvelope /> Contact Information</div>
                      <div className="student-detail-value">
                        <div style={{ marginBottom: '8px' }}><strong>Email:</strong> {employee.email}</div>
                        {employee.mobile && <div><strong>Mobile:</strong> {employee.mobile}</div>}
                      </div>
                    </div>
                    <div className="student-detail-group">
                      <div className="student-detail-label"><FaBriefcase /> Job Details</div>
                      <div className="student-detail-value">
                        <div style={{ marginBottom: '8px' }}><strong>Role:</strong> {employee.role || '—'}</div>
                        <div><strong>Skills:</strong> {employee.skills || '—'}</div>
                      </div>
                    </div>
                    {employee.approvalStatus === 'Approved' && (
                      <div className="student-detail-group">
                        <div className="student-detail-label"><FaMoneyBillWave /> Payment Status</div>
                        <div className="student-detail-value">
                          <span className={`status-badge ${getStatusClass(employee.paymentStatus, 'payment')}`}>
                            {employee.paymentStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="student-card-footer">
                    <div className="student-registration-date">
                      <FaCalendarAlt />
                      <span>Registered: {employee.registeredAt ? new Date(employee.registeredAt).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="student-actions">
                      {employee.approvalStatus === 'Pending' ? (
                        <>
                          <button onClick={() => handleApproval(employee._id, 'Approved')} className="action-btn btn-approve" title="Approve Participant">
                            <FaCheck /> Approve
                          </button>
                          <button onClick={() => handleRejectClick(employee)} className="action-btn btn-reject" title="Reject Participant">
                            <FaTimes /> Reject
                          </button>
                        </>
                      ) : employee.approvalStatus === 'Approved' ? (
                          <button onClick={() => togglePayment(employee._id)} className="action-btn btn-toggle" title="Toggle Payment">
                            <FaMoneyBillWave />
                            {employee.paymentStatus === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                      ) : null}
                      <button onClick={() => openModal('view', employee)} className="action-btn btn-edit" title="View Details">
                        <FaEye /> View
                      </button>
                      <button onClick={() => toggleActiveStatus(employee)} className={`action-btn ${ employee.isActive ? "btn-delete" : "btn-approve"}`}
                        title={employee.isActive ? "Deactivate Participant" : "Activate Participant"}>
                        {employee.isActive ? (
                          <>
                            <FaTimes /> Deactivate
                          </>
                        ) : (
                          <>
                            <FaCheck /> Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, filteredEmployees.length)} of {filteredEmployees.length} participants
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                    <FaChevronLeft />
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                      onClick={() => paginate(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button className="pagination-btn" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="student-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="student-modal-header">
              <h3 className="student-modal-title">
                {modalType === 'add' ? 'Add New Participant' : 'Participant Details'}
              </h3>
              <button className="student-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="student-modal-body">
              {modalType === 'view' ? (
                <div className="student-view-details">
                  <div className="student-view-item">
                    <div className="student-view-icon"><FaUserTie /></div>
                    <div className="student-view-content">
                      <div className="student-view-label">Full Name</div>
                      <div className="student-view-value">
                        {`${selectedEmployee?.salutation || ''} ${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`.trim()}
                      </div>
                    </div>
                  </div>
                  <div className="student-view-item">
                    <div className="student-view-icon"><FaEnvelope /></div>
                    <div className="student-view-content">
                      <div className="student-view-label">Contact Information</div>
                      <div className="student-view-value">
                        <div style={{ marginBottom: '8px' }}><strong>Email:</strong> {selectedEmployee?.email}</div>
                        <div><strong>Mobile:</strong> {selectedEmployee?.mobile || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="student-view-item">
                    <div className="student-view-icon"><FaBriefcase /></div>
                    <div className="student-view-content">
                      <div className="student-view-label">Job Details</div>
                      <div className="student-view-value">
                        <div style={{ marginBottom: '8px' }}><strong>Role:</strong> {selectedEmployee?.role || 'Not specified'}</div>
                        <div><strong>Skills:</strong> {selectedEmployee?.skills || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="student-view-item">
                    <div className="student-view-icon"><FaUserCheck /></div>
                    <div className="student-view-content">
                      <div className="student-view-label">Status Information</div>
                      <div className="student-view-value">
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Approval Status:</strong>
                          <div className="student-view-badge">
                            <span className={`status-badge ${getStatusClass(selectedEmployee?.approvalStatus, 'approval')}`}>
                              {selectedEmployee?.approvalStatus}
                            </span>
                          </div>
                        </div>
                        <div>
                          <strong>Payment Status:</strong>
                          <div className="student-view-badge">
                            <span className={`status-badge ${getStatusClass(selectedEmployee?.paymentStatus, 'payment')}`}>
                              {selectedEmployee?.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="student-view-item">
                    <div className="student-view-icon"><FaCalendarAlt /></div>
                    <div className="student-view-content">
                      <div className="student-view-label">Registration Date</div>
                      <div className="student-view-value">
                        {selectedEmployee?.registeredAt
                          ? new Date(selectedEmployee.registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  {selectedEmployee?.proof && (
                  <div className="student-view-item">
                    <div className="student-view-icon">
                      <FaDownload />
                    </div>

                    <div className="student-view-content">
                      <div className="student-view-label">
                        Participant Proof Document
                      </div>

                      <div className="certificate-actions">
                        {/* Open in same tab */}
                        <a
                          href={selectedEmployee.proof}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-btn"
                        >
                          <FaEye />
                          View
                        </a>

                        {/* Download */}
                        <a
                          href={selectedEmployee.proof.replace(
                            "/upload/",
                            "/upload/fl_attachment/"
                          )}
                          className="download-btn"
                        >
                          <FaDownload />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="student-form-row">
                    <div className="student-form-group">
                      <label className="student-form-label">Salutation</label>
                      <select name="salutation" value={formData.salutation} onChange={handleInputChange} className="student-form-select">
                        <option value="">Select</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                      </select>
                    </div>
                    <div className="student-form-group">
                      <label className="student-form-label">First Name *</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="student-form-input" required />
                    </div>
                  </div>
                  <div className="student-form-row">
                    <div className="student-form-group">
                      <label className="student-form-label">Last Name *</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="student-form-input" required />
                    </div>
                    <div className="student-form-group">
                      <label className="student-form-label">Email *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="student-form-input" required />
                    </div>
                  </div>
                  <div className="student-form-row">
                    <div className="student-form-group">
                      <label className="student-form-label">Mobile</label>
                      <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} className="student-form-input" />
                    </div>
                    <div className="student-form-group">
                      <label className="student-form-label">Role *</label>
                      <input type="text" name="role" value={formData.role} onChange={handleInputChange} className="student-form-input" placeholder="e.g. Developer, Designer" required />
                    </div>
                  </div>
                  <div className="student-form-row">
                    <div className="student-form-group">
                      <label className="student-form-label">Skills</label>
                      <input type="text" name="skills" value={formData.skills} onChange={handleInputChange} className="student-form-input" placeholder="e.g. React, Node.js" />
                    </div>
                    <div className="student-form-group">
                      <label className="student-form-label">Approval Status</label>
                      <select name="approvalStatus" value={formData.approvalStatus} onChange={handleInputChange} className="student-form-select">
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div className="student-form-row">
                    <div className="student-form-group">
                      <label className="student-form-label">Payment Status</label>
                      <select name="paymentStatus" value={formData.paymentStatus} onChange={handleInputChange} className="student-form-select">
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                  </div>
                   <div className="student-form-actions">
                     <button type="button" className="student-btn-secondary" onClick={closeModal}>Cancel</button>
                     <button type="submit" className="student-btn-primary">
                       {modalType === 'add' ? 'Add Participant' : 'Update Participant'}
                     </button>
                   </div>
                 </form>
                )}
              </div>
            </div>
          </div>
          
      )}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="student-modal-content">
            <div className="student-modal-header">
              <h3>Reject Participant</h3>
              <button
                className="student-modal-close"
                onClick={() => setShowRejectModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="student-modal-body">
              <label style={{ fontWeight: "600" }}>
                Rejection Feedback
              </label>

              <textarea
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "10px"
                }}
                placeholder="Enter rejection reason..."
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px"
                }}
              >
                <button
                  type="button"
                  className="student-btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="student-btn-primary"
                  onClick={processEmployeeRejection}
                  disabled={!rejectFeedback.trim()}
                >
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageParticipant;