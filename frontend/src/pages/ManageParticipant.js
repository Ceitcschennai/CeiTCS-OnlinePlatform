import React, { useEffect, useState, useRef } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/manageparticipant.css';
import LMSCard from '../components/common/LMSCard';
import LMSButton from '../components/common/LMSButton';
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

// Existing JWT token stored at login — sent on every protected API call
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
      const response = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: getAuthHeaders()
      });
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
          headers: getAuthHeaders()
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
            'Content-Type': 'application/json',
            ...getAuthHeaders()
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
      const response = await fetch(`${API_BASE_URL}/api/employee/${id}/payment`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
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
    <div className="manage-participant-modern">

      {/* ── HEADER ── */}
      <div className="mp-header--participants">
        <div className="mp-header-content">
          <h2 className="mp-header-title">
            <FaUsers className="mp-header-icon" />
            Manage Participants
          </h2>
          <p className="mp-header-subtitle">Participant management with approval tracking and payment monitoring</p>
        </div>
        <div className="mp-stats-row">
          <LMSCard className="mp-stat-card" hover>
            <div className="mp-stat-inner">
              <span className="mp-stat-value">{stats.total}</span>
              <span className="mp-stat-label">Total</span>
            </div>
          </LMSCard>
          <LMSCard className="mp-stat-card" hover>
            <div className="mp-stat-inner">
              <span className="mp-stat-value mp-stat-value--approved">{stats.approved}</span>
              <span className="mp-stat-label">Approved</span>
            </div>
          </LMSCard>
          <LMSCard className="mp-stat-card" hover>
            <div className="mp-stat-inner">
              <span className="mp-stat-value mp-stat-value--pending">{stats.pending}</span>
              <span className="mp-stat-label">Pending</span>
            </div>
          </LMSCard>
          <LMSCard className="mp-stat-card" hover>
            <div className="mp-stat-inner">
              <span className="mp-stat-value mp-stat-value--paid">{stats.paid}</span>
              <span className="mp-stat-label">Paid</span>
            </div>
          </LMSCard>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="mp-controls--participants">
        <div className="mp-controls-row--participants">
          <div className="mp-search-wrap">
            <FaSearch className="mp-search-icon" />
            <input
              type="text"
              className="mp-search-input"
              placeholder="Search by name, email, role, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="mp-controls-right--participants">
            <div className="mp-filter-dropdown" ref={filterRef}>
              <LMSButton variant="secondary" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                <FaFilter /> Filter
              </LMSButton>
              {showFilterMenu && (
                <div className="mp-filter-menu">
                  {filterOptions.map(option => (
                    <div
                      key={option.value}
                      className={`mp-filter-option ${filterStatus === option.value ? 'mp-filter-option--active' : ''}`}
                      onClick={() => { setFilterStatus(option.value); setShowFilterMenu(false); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setFilterStatus(option.value); setShowFilterMenu(false); }}}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <LMSButton variant="primary" onClick={() => openModal('add')}>
              <FaPlus /> Add Participant
            </LMSButton>
          </div>
        </div>
      </div>

      {/* ── PARTICIPANT CARDS ── */}
      <div className="mp-content">
        {loading ? (
          <div className="mp-loading">
            <div className="mp-spinner"></div>
            <p>Loading participants...</p>
          </div>
        ) : currentEmployees.length === 0 ? (
          <div className="mp-empty">
            <FaUsers className="mp-empty-icon" />
            <h3>No participants found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <>
            <div className="mp-grid">
              {currentEmployees.map((employee) => (
                <LMSCard key={employee._id} hover className="mp-employee-card">
                  {/* Card Header */}
                  <div className="mp-card-header--participants">
                    <div className="mp-card-profile--participants">
                      <div className="mp-avatar">
                        {getInitials(employee.firstName, employee.lastName)}
                      </div>
                      <div className="mp-card-info--participants">
                        <div className="mp-card-name--participants">
                          <FaUserTie className="mp-card-name-icon--participants" />
                          {`${employee.salutation || ''} ${employee.firstName || ''} ${employee.lastName || ''}`.trim()}
                        </div>
                        <div className="mp-card-id--participants">ID: {employee._id.slice(-6)}</div>
                      </div>
                    </div>
                    <div className="mp-card-badges--participants">
                      <span className={`status-badge ${employee.isActive ? "status-approved" : "status-rejected"}`}>
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
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
                  <div className="mp-card-body">
                    <div className="mp-detail-group">
                      <div className="mp-detail-label"><FaEnvelope /> Contact</div>
                      <div className="mp-detail-value">
                        <div><strong>Email:</strong> {employee.email}</div>
                        {employee.mobile && <div><strong>Mobile:</strong> {employee.mobile}</div>}
                      </div>
                    </div>
                    <div className="mp-detail-group">
                      <div className="mp-detail-label"><FaBriefcase /> Job Details</div>
                      <div className="mp-detail-value">
                        <div><strong>Role:</strong> {employee.role || '—'}</div>
                        <div><strong>Skills:</strong> {employee.skills || '—'}</div>
                      </div>
                    </div>
                    {employee.approvalStatus === 'Approved' && (
                      <div className="mp-detail-group">
                        <div className="mp-detail-label"><FaMoneyBillWave /> Payment</div>
                        <div className="mp-detail-value">
                          <span className={`status-badge ${getStatusClass(employee.paymentStatus, 'payment')}`}>
                            {employee.paymentStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mp-card-footer">
                    <div className="mp-reg-date">
                      <FaCalendarAlt />
                      <span>Registered: {employee.registeredAt ? new Date(employee.registeredAt).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="mp-card-actions">
                      {employee.approvalStatus === 'Pending' ? (
                        <>
                          <LMSButton variant="success" onClick={() => handleApproval(employee._id, 'Approved')}>
                            <FaCheck /> Approve
                          </LMSButton>
                          <LMSButton variant="danger" onClick={() => handleRejectClick(employee)}>
                            <FaTimes /> Reject
                          </LMSButton>
                        </>
                      ) : employee.approvalStatus === 'Approved' ? (
                        <LMSButton variant="warning" onClick={() => togglePayment(employee._id)}>
                          <FaMoneyBillWave />
                          {employee.paymentStatus === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}
                        </LMSButton>
                      ) : null}
                      <LMSButton variant="outline" onClick={() => openModal('view', employee)}>
                        <FaEye /> View
                      </LMSButton>
                      <LMSButton
                        variant={employee.isActive ? 'danger' : 'success'}
                        onClick={() => toggleActiveStatus(employee)}
                      >
                        {employee.isActive ? <><FaTimes /> Deactivate</> : <><FaCheck /> Activate</>}
                      </LMSButton>
                    </div>
                  </div>
                </LMSCard>
              ))}
            </div>

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
              <div className="mp-pagination">
                <div className="mp-pagination-info">
                  Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, filteredEmployees.length)} of {filteredEmployees.length} participants
                </div>
                <div className="mp-pagination-controls">
                  <button className="mp-page-btn" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                    <FaChevronLeft />
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      className={`mp-page-btn ${currentPage === index + 1 ? 'mp-page-btn--active' : ''}`}
                      onClick={() => paginate(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button className="mp-page-btn" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ADD/VIEW MODAL ── */}
      {showModal && (
        <div className="mp-modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-label={modalType === 'add' ? 'Add Participant' : 'Participant Details'}>
          <div className="mp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">
                {modalType === 'add' ? 'Add New Participant' : 'Participant Details'}
              </h3>
              <button className="mp-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="mp-modal-body">
              {modalType === 'view' ? (
                <div className="mp-view-details">
                  <div className="mp-view-item">
                    <div className="mp-view-icon"><FaUserTie /></div>
                    <div className="mp-view-content">
                      <div className="mp-view-label">Full Name</div>
                      <div className="mp-view-value">
                        {`${selectedEmployee?.salutation || ''} ${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`.trim()}
                      </div>
                    </div>
                  </div>
                  <div className="mp-view-item">
                    <div className="mp-view-icon"><FaEnvelope /></div>
                    <div className="mp-view-content">
                      <div className="mp-view-label">Contact</div>
                      <div className="mp-view-value">
                        <div><strong>Email:</strong> {selectedEmployee?.email}</div>
                        <div><strong>Mobile:</strong> {selectedEmployee?.mobile || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mp-view-item">
                    <div className="mp-view-icon"><FaBriefcase /></div>
                    <div className="mp-view-content">
                      <div className="mp-view-label">Job Details</div>
                      <div className="mp-view-value">
                        <div><strong>Role:</strong> {selectedEmployee?.role || 'Not specified'}</div>
                        <div><strong>Skills:</strong> {selectedEmployee?.skills || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mp-view-item">
                    <div className="mp-view-icon"><FaUserCheck /></div>
                    <div className="mp-view-content">
                      <div className="mp-view-label">Status</div>
                      <div className="mp-view-value">
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Approval:</strong>{' '}
                          <span className={`status-badge ${getStatusClass(selectedEmployee?.approvalStatus, 'approval')}`}>
                            {selectedEmployee?.approvalStatus}
                          </span>
                        </div>
                        <div>
                          <strong>Payment:</strong>{' '}
                          <span className={`status-badge ${getStatusClass(selectedEmployee?.paymentStatus, 'payment')}`}>
                            {selectedEmployee?.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mp-view-item">
                    <div className="mp-view-icon"><FaCalendarAlt /></div>
                    <div className="mp-view-content">
                      <div className="mp-view-label">Registered</div>
                      <div className="mp-view-value">
                        {selectedEmployee?.registeredAt
                          ? new Date(selectedEmployee.registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  {selectedEmployee?.proof && (
                    <div className="mp-view-item">
                      <div className="mp-view-icon"><FaDownload /></div>
                      <div className="mp-view-content">
                        <div className="mp-view-label">Proof Document</div>
                        <div className="mp-doc-actions">
                          <a href={selectedEmployee.proof} target="_blank" rel="noopener noreferrer" className="mp-doc-link mp-doc-link--view">
                            <FaEye /> View
                          </a>
                          <a href={selectedEmployee.proof.replace("/upload/", "/upload/fl_attachment/")} className="mp-doc-link mp-doc-link--download">
                            <FaDownload /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label">Salutation</label>
                      <select name="salutation" value={formData.salutation} onChange={handleInputChange} className="input-lms">
                        <option value="">Select</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                      </select>
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label">First Name <span className="mp-required">*</span></label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="input-lms" required />
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label">Last Name <span className="mp-required">*</span></label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="input-lms" required />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label">Email <span className="mp-required">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input-lms" required />
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label">Mobile</label>
                      <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} className="input-lms" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label">Role <span className="mp-required">*</span></label>
                      <input type="text" name="role" value={formData.role} onChange={handleInputChange} className="input-lms" placeholder="e.g. Developer" required />
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label">Skills</label>
                      <input type="text" name="skills" value={formData.skills} onChange={handleInputChange} className="input-lms" placeholder="e.g. React, Node.js" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label">Approval Status</label>
                      <select name="approvalStatus" value={formData.approvalStatus} onChange={handleInputChange} className="input-lms">
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label">Payment Status</label>
                      <select name="paymentStatus" value={formData.paymentStatus} onChange={handleInputChange} className="input-lms">
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                  </div>
                  <div className="mp-form-actions">
                    <LMSButton variant="secondary" onClick={closeModal} type="button">Cancel</LMSButton>
                    <LMSButton variant="primary" type="submit">
                      {modalType === 'add' ? 'Add Participant' : 'Update Participant'}
                    </LMSButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {showRejectModal && (
        <div className="mp-modal-overlay" role="dialog" aria-modal="true" aria-label="Rejection feedback">
          <div className="mp-modal-content mp-modal-content--sm" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">Reject Participant</h3>
              <button className="mp-modal-close" onClick={() => setShowRejectModal(false)}><FaTimes /></button>
            </div>
            <div className="mp-modal-body">
              <label className="mp-form-label">Rejection Feedback</label>
              <textarea
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                rows={5}
                className="input-lms"
                placeholder="Enter rejection reason..."
              />
              <div className="mp-form-actions">
                <LMSButton variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</LMSButton>
                <LMSButton
                  variant="danger"
                  onClick={processEmployeeRejection}
                  disabled={!rejectFeedback.trim()}
                  loading={loading}
                >
                  Submit Rejection
                </LMSButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageParticipant;