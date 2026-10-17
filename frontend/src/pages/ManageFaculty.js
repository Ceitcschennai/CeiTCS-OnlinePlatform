import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/managefaculty.css';
import LMSCard from '../components/common/LMSCard';
import LMSButton from '../components/common/LMSButton';
import {
  FaChalkboardTeacher,
  FaSearch,
  FaPlus,
  FaDownload,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaToggleOn,
  FaToggleOff,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaUserCheck,
  FaGraduationCap,
  FaMobileAlt,
  FaEnvelope,
  FaCalendarAlt,
  FaClock,
  FaBookOpen,
  FaStar
} from 'react-icons/fa';

// Existing JWT token stored at login — sent on every protected API call
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const RejectFeedbackModal = ({ isOpen, onClose, onSubmit, loading, facultyName }) => {
  const [feedback, setFeedback] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    onSubmit(feedback);
    setFeedback("");
  };

  return (
    <div className="mf-modal-overlay" role="dialog" aria-modal="true" aria-label="Rejection feedback">
      <div className="mf-modal-content mf-modal-content--sm">
        <h3 className="mf-reject-title">Rejection Feedback for {facultyName}</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Enter feedback for rejection..."
          rows={4}
          disabled={loading}
          className="input-lms"
        />
        <div className="mf-reject-actions">
          <LMSButton variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </LMSButton>
          <LMSButton
            variant="danger"
            onClick={handleSubmit}
            disabled={loading || !feedback.trim()}
            loading={loading}
          >
            {loading ? "Processing..." : "Submit Rejection"}
          </LMSButton>
        </div>
      </div>
    </div>
  );
};

const ManageFaculty = () => {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, active: 0, inactive: 0 });

  const filterRef = useRef(null);

  const [formData, setFormData] = useState({
    salutation: 'Mr.',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    timezone: '',
    password: '',
    specialization: '',
    experience: '',
    qualification: '',
    notes: ''
  });

  const filterOptions = [
    { value: 'All', label: 'All Faculty' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved Only' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const fetchTrainees = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 8,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'All' && { status: filterStatus })
      });

      const response = await axios.get(`${API_BASE_URL}/api/admin/trainees?${queryParams}`, {
        headers: getAuthHeaders()
      });

      if (response.status === 200) {
        setTrainees(response.data.trainees);
        setPagination(response.data.pagination);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus]);

  useEffect(() => { fetchTrainees(); }, [fetchTrainees]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      salutation: 'Mr.',
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      timezone: '',
      password: '',
      specialization: '',
      experience: '',
      qualification: '',
      notes: ''
    });
  };

  const openModal = (type, trainee = null) => {
    setModalType(type);
    setSelectedTrainee(trainee);
    if (trainee && type === 'edit') {
      setFormData({
        salutation: trainee.salutation || 'Mr.',
        firstName: trainee.firstName || '',
        lastName: trainee.lastName || '',
        email: trainee.email || '',
        mobile: trainee.mobile || '',
        timezone: trainee.timezone || '',
        password: '',
        specialization: trainee.specialization || '',
        experience: trainee.experience || '',
        qualification: trainee.qualification || '',
        notes: trainee.notes || ''
      });
    } else if (type === 'add') {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedTrainee(null);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = modalType === 'edit';
      const url = isEdit
        ? `${API_BASE_URL}/api/admin/trainees/${selectedTrainee._id}`
        : `${API_BASE_URL}/api/admin/trainees`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await axios({ method, url, data: formData, headers: getAuthHeaders() });

      if (response.status === 200) {
        alert(response.data.message);
        closeModal();
        fetchTrainees();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error.response?.data?.message || 'An error occurred. Please try again.');
    }
  };

  const handleApproval = async (id, status) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/admin/trainees/${id}/status`, { status }, {
        headers: getAuthHeaders()
      });
      alert(response.data.message);
      fetchTrainees();
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Something went wrong while updating faculty status.');
    }
  };

  const handleRejectClick = (trainee) => {
    setSelectedTrainee(trainee);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (feedback) => {
    if (!selectedTrainee) return;
    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/admin/trainees/${selectedTrainee._id}/status`, { status: "Rejected",feedback }, {
        headers: getAuthHeaders()
      });
      alert(response.data.message);
      fetchTrainees();
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Something went wrong while rejecting faculty.');
    } finally {
      setShowRejectModal(false);
      setSelectedTrainee(null);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this faculty member? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/trainees/${id}`, {
        headers: getAuthHeaders()
      });
      alert('Faculty deleted successfully');
      fetchTrainees();
    } catch (error) {
      console.error('Error deleting faculty:', error);
      alert('Failed to delete faculty');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/admin/trainees/${id}/toggle-status`, {}, {
        headers: getAuthHeaders()
      });
      alert(response.data.message);
      fetchTrainees();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update faculty status');
    }
  };

  const getStatusClass = (trainee) => {
    if (trainee.approvalStatus === 'Rejected') return 'rejected';
    if (!trainee.isApproved) return 'pending';
    return 'approved';
  };

  const getStatusText = (trainee) => {
    if (trainee.approvalStatus === 'Rejected') return 'Rejected';
    if (!trainee.isApproved) return 'Pending';
    return 'Approved';
  };

  return (
    <div className="manage-faculty-modern">
      {/* ── HEADER ── */}
      <div className="mf-header">
        <div className="mf-header-content">
          <h2 className="mf-header-title">
            <FaChalkboardTeacher className="mf-header-icon" />
            Manage Faculty
          </h2>
          <p className="mf-header-subtitle">Manage faculty registrations and approvals</p>
        </div>

        <div className="mf-stats-row">
          <LMSCard className="mf-stat-card" hover>
            <div className="mf-stat-inner">
              <span className="mf-stat-value">{stats.total}</span>
              <span className="mf-stat-label">Total</span>
            </div>
          </LMSCard>
          <LMSCard className="mf-stat-card" hover>
            <div className="mf-stat-inner">
              <span className="mf-stat-value mf-stat-value--pending">{stats.pending}</span>
              <span className="mf-stat-label">Pending</span>
            </div>
          </LMSCard>
          <LMSCard className="mf-stat-card" hover>
            <div className="mf-stat-inner">
              <span className="mf-stat-value mf-stat-value--approved">{stats.approved}</span>
              <span className="mf-stat-label">Approved</span>
            </div>
          </LMSCard>
          <LMSCard className="mf-stat-card" hover>
            <div className="mf-stat-inner">
              <span className="mf-stat-value mf-stat-value--active">{stats.active}</span>
              <span className="mf-stat-label">Active</span>
            </div>
          </LMSCard>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="mf-controls">
        <div className="mf-controls-row">
          <div className="mf-search-wrap">
            <FaSearch className="mf-search-icon" />
            <input
              type="text"
              placeholder="Search faculty by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mf-search-input"
            />
          </div>

          <div className="mf-controls-right">
            <div className="mf-filter-dropdown" ref={filterRef}>
              <LMSButton variant="secondary" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                <FaFilter /> Filter
              </LMSButton>
              {showFilterMenu && (
                <div className="mf-filter-menu">
                  {filterOptions.map(option => (
                    <div
                      key={option.value}
                      className={`mf-filter-option ${filterStatus === option.value ? 'mf-filter-option--active' : ''}`}
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
              <FaPlus /> Add Faculty
            </LMSButton>
          </div>
        </div>
      </div>

      {/* ── FACULTY GRID ── */}
      <div className="mf-content">
        {loading ? (
          <div className="mf-loading">
            <div className="mf-spinner"></div>
            <p>Loading faculty...</p>
          </div>
        ) : (
          <>
            {trainees.length === 0 ? (
              <div className="mf-empty">
                <FaChalkboardTeacher className="mf-empty-icon" />
                <p>No faculty found</p>
              </div>
            ) : (
              <div className="mf-grid">
                {trainees.map((trainee) => (
                  <LMSCard key={trainee._id} hover className="mf-faculty-card">
                    {/* Card Header */}
                    <div className="mf-card-header">
                      <div className="mf-avatar-wrap">
                        <div className="mf-avatar">
                          <FaGraduationCap />
                        </div>
                        <div className={`mf-status-dot ${trainee.isActive ? 'mf-status-dot--active' : 'mf-status-dot--inactive'}`}></div>
                      </div>

                      <div className="mf-card-info">
                        <div className="mf-card-name-section">
                          <h3 className="mf-card-name">
                            {`${trainee.salutation || ''} ${trainee.firstName} ${trainee.lastName}`.trim()}
                          </h3>
                          <p className="mf-card-role">Faculty</p>
                        </div>
                        <div className="mf-card-meta">
                          <span className={`mf-status-badge mf-status-badge--${getStatusClass(trainee)}`}>
                            {getStatusText(trainee)}
                          </span>
                          <span className="mf-joined-date">
                            <FaCalendarAlt className="mf-meta-icon" />
                            Joined {new Date(trainee.joiningDate || trainee.createdAt).toLocaleDateString('en-US', {
                              month: 'short', year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="mf-card-actions-top">
                        <LMSButton variant="outline" onClick={() => openModal('view', trainee)}>
                          <FaEye />
                        </LMSButton>
                        <LMSButton variant="secondary" onClick={() => openModal('edit', trainee)}>
                          <FaEdit />
                        </LMSButton>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="mf-card-body">
                      <div className="mf-info-row">
                        <div className="mf-info-chip">
                          <FaEnvelope className="mf-chip-icon" />
                          <span>{trainee.email}</span>
                        </div>
                        {trainee.mobile && (
                          <div className="mf-info-chip">
                            <FaMobileAlt className="mf-chip-icon" />
                            <span>{trainee.mobile}</span>
                          </div>
                        )}
                      </div>

                      {trainee.specialization && (
                        <div className="mf-specialization-row">
                          <FaBookOpen className="mf-chip-icon" />
                          <span>{trainee.specialization}</span>
                        </div>
                      )}

                      {trainee.experience && (
                        <div className="mf-experience-row">
                          <FaClock className="mf-chip-icon" />
                          <span>{trainee.experience} experience</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mf-card-footer">
                      <div className="mf-footer-actions">
                        {trainee.approvalStatus === 'Rejected' ? (
                          <LMSButton variant="danger" onClick={() => handleDelete(trainee._id)}>
                            <FaTrash /> Delete
                          </LMSButton>
                        ) : !trainee.isApproved ? (
                          <>
                            <LMSButton variant="success" onClick={() => handleApproval(trainee._id, "Approved")}>
                              <FaCheck /> Approve
                            </LMSButton>
                            <LMSButton variant="danger" onClick={() => handleRejectClick(trainee)}>
                              <FaTimes /> Reject
                            </LMSButton>
                          </>
                        ) : (
                          <>
                            <LMSButton
                              variant={trainee.isActive ? 'warning' : 'success'}
                              onClick={() => toggleStatus(trainee._id)}
                            >
                              {trainee.isActive ? <><FaToggleOn /> Active</> : <><FaToggleOff /> Inactive</>}
                            </LMSButton>
                            <LMSButton variant="danger" onClick={() => handleDelete(trainee._id)}>
                              <FaTrash />
                            </LMSButton>
                          </>
                        )}
                      </div>

                      <div className="mf-rating-section">
                        <div className="mf-stars">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar key={star} className={`mf-star ${star <= (trainee.rating || 4) ? 'mf-star--filled' : 'mf-star--empty'}`} />
                          ))}
                        </div>
                        <span className="mf-student-count">{trainee.studentsCount || 0} students</span>
                      </div>
                    </div>
                  </LMSCard>
                ))}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="mf-pagination">
                <button className="mf-page-btn" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                  <FaChevronLeft />
                </button>
                <span className="mf-page-info">Page {currentPage} of {pagination.totalPages}</span>
                <button className="mf-page-btn" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.totalPages}>
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="mf-modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-label={modalType === 'add' ? 'Add Faculty' : modalType === 'edit' ? 'Edit Faculty' : 'Faculty Details'}>
          <div className="mf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mf-modal-header">
              <h3 className="mf-modal-title">
                {modalType === 'add' ? 'Add New Faculty' : modalType === 'edit' ? 'Edit Faculty' : 'Faculty Details'}
              </h3>
              <button className="mf-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>

            <div className="mf-modal-body">
              {modalType === 'view' ? (
                <div className="mf-view-details">
                  <div className="mf-view-item">
                    <div className="mf-view-icon"><FaGraduationCap /></div>
                    <div className="mf-view-content">
                      <div className="mf-view-label">Full Name</div>
                      <div className="mf-view-value">
                        {`${selectedTrainee?.salutation || ''} ${selectedTrainee?.firstName || ''} ${selectedTrainee?.lastName || ''}`.trim()}
                      </div>
                    </div>
                  </div>

                  <div className="mf-view-item">
                    <div className="mf-view-icon"><FaEnvelope /></div>
                    <div className="mf-view-content">
                      <div className="mf-view-label">Contact</div>
                      <div className="mf-view-value">
                        <div><strong>Email:</strong> {selectedTrainee?.email}</div>
                        <div><strong>Mobile:</strong> {selectedTrainee?.mobile || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>

                  {selectedTrainee?.specialization && (
                    <div className="mf-view-item">
                      <div className="mf-view-icon"><FaBookOpen /></div>
                      <div className="mf-view-content">
                        <div className="mf-view-label">Specialization</div>
                        <div className="mf-view-value">{selectedTrainee.specialization}</div>
                      </div>
                    </div>
                  )}

                  <div className="mf-view-item">
                    <div className="mf-view-icon"><FaUserCheck /></div>
                    <div className="mf-view-content">
                      <div className="mf-view-label">Status</div>
                      <div className="mf-view-value">
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Status:</strong>{' '}
                          <span className={`mf-status-badge mf-status-badge--${getStatusClass(selectedTrainee)}`}>
                            {getStatusText(selectedTrainee)}
                          </span>
                        </div>
                        {selectedTrainee?.experience && (
                          <div><strong>Experience:</strong> {selectedTrainee.experience}</div>
                        )}
                        {selectedTrainee?.qualification && (
                          <div><strong>Qualification:</strong> {selectedTrainee.qualification}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTrainee?.proof && (
                    <div className="mf-view-item">
                      <div className="mf-view-icon"><FaDownload /></div>
                      <div className="mf-view-content">
                        <div className="mf-view-label">Degree Certificate</div>
                        <div className="mf-doc-links">
                          <a href={selectedTrainee.proof} target="_blank" rel="noopener noreferrer" className="mf-doc-link mf-doc-link--view">View</a>
                          <a href={selectedTrainee.proof.replace("/upload/", "/upload/fl_attachment/")} className="mf-doc-link mf-doc-link--download"><FaDownload /> Download</a>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTrainee?.badgeCertificate && (
                    <div className="mf-view-item">
                      <div className="mf-view-icon"><FaDownload /></div>
                      <div className="mf-view-content">
                        <div className="mf-view-label">Badge Certificate</div>
                        <div className="mf-doc-links">
                          <a href={selectedTrainee.badgeCertificate} target="_blank" rel="noopener noreferrer" className="mf-doc-link mf-doc-link--view">View</a>
                          <a href={selectedTrainee.proof.replace("/upload/", "/upload/fl_attachment/")} className="mf-doc-link mf-doc-link--download"><FaDownload /> Download</a>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTrainee?.achievements?.document && (
                    <div className="mf-view-item">
                      <div className="mf-view-icon"><FaDownload /></div>
                      <div className="mf-view-content">
                        <div className="mf-view-label">Achievement</div>
                        <div className="mf-doc-links">
                          <a href={selectedTrainee.achievements.document} target="_blank" rel="noopener noreferrer" className="mf-doc-link mf-doc-link--view">View</a>
                          <a href={selectedTrainee.proof.replace("/upload/", "/upload/fl_attachment/")} className="mf-doc-link mf-doc-link--download"><FaDownload /> Download</a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mf-view-item">
                    <div className="mf-view-icon"><FaCalendarAlt /></div>
                    <div className="mf-view-content">
                      <div className="mf-view-label">Registered</div>
                      <div className="mf-view-value">
                        {selectedTrainee?.registeredAt
                          ? new Date(selectedTrainee.registeredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mf-form-row">
                    <div className="mf-form-group">
                      <label className="mf-form-label">Salutation</label>
                      <select name="salutation" value={formData.salutation} onChange={handleInputChange} className="input-lms">
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                    </div>
                    <div className="mf-form-group">
                      <label className="mf-form-label">First Name <span className="mf-required">*</span></label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="input-lms" required placeholder="Enter first name" />
                    </div>
                  </div>

                  <div className="mf-form-row">
                    <div className="mf-form-group">
                      <label className="mf-form-label">Last Name <span className="mf-required">*</span></label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="input-lms" required placeholder="Enter last name" />
                    </div>
                    <div className="mf-form-group">
                      <label className="mf-form-label">Email <span className="mf-required">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input-lms" required placeholder="Enter email address" />
                    </div>
                  </div>

                  <div className="mf-form-row">
                    <div className="mf-form-group">
                      <label className="mf-form-label">Mobile</label>
                      <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} className="input-lms" placeholder="Enter mobile number" />
                    </div>
                    <div className="mf-form-group">
                      <label className="mf-form-label">Timezone</label>
                      <input type="text" name="timezone" value={formData.timezone} onChange={handleInputChange} className="input-lms" placeholder="e.g., Asia/Kolkata" />
                    </div>
                  </div>

                  <div className="mf-form-row">
                    <div className="mf-form-group">
                      <label className="mf-form-label">Password {modalType === 'edit' ? '(optional)' : <span className="mf-required">*</span>}</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="input-lms" required={modalType === 'add'} placeholder={modalType === 'edit' ? 'Enter new password (optional)' : 'Enter password'} />
                    </div>
                    <div className="mf-form-group">
                      <label className="mf-form-label">Experience</label>
                      <input type="text" name="experience" value={formData.experience} onChange={handleInputChange} className="input-lms" placeholder="e.g., 2 years" />
                    </div>
                  </div>

                  <div className="mf-form-group">
                    <label className="mf-form-label">Specialization</label>
                    <input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} className="input-lms" placeholder="e.g., Web Development, Data Science" />
                  </div>

                  <div className="mf-form-group">
                    <label className="mf-form-label">Qualification</label>
                    <input type="text" name="qualification" value={formData.qualification} onChange={handleInputChange} className="input-lms" placeholder="e.g., B.Tech, MBA" />
                  </div>

                  <div className="mf-form-group">
                    <label className="mf-form-label">Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="input-lms textarea-lms" placeholder="Additional notes about the faculty member" rows="3" />
                  </div>

                  <div className="mf-form-actions">
                    <LMSButton variant="secondary" onClick={closeModal} type="button">Cancel</LMSButton>
                    <LMSButton variant="primary" type="submit">
                      {modalType === 'add' ? 'Add Faculty' : 'Update Faculty'}
                    </LMSButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <RejectFeedbackModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSubmit={handleRejectSubmit}
        loading={loading}
        facultyName={selectedTrainee ? `${selectedTrainee.firstName} ${selectedTrainee.lastName}` : ""}
      />
    </div>
  );
};

export default ManageFaculty;