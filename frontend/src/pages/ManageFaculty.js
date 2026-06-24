import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/managefaculty.css';
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

const RejectFeedbackModal = ({ isOpen, onClose, onSubmit, loading, facultyName }) => {
  const [feedback, setFeedback] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    onSubmit(feedback);
    setFeedback("");
  };

  return (
    <div className="reject-modal-overlay">
      <div className="reject-modal">
        <h3>Rejection Feedback for {facultyName}</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Enter feedback for rejection..."
          rows={4}
          disabled={loading}
        />
        <div className="reject-modal-actions">
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !feedback.trim()} className="submit-reject-btn">
            {loading ? "Processing..." : "Submit Rejection"}
          </button>
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

      const response = await axios.get(`${API_BASE_URL}/api/admin/trainees?${queryParams}`);

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

      const response = await axios({ method, url, data: formData });

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
      const response = await axios.put(`${API_BASE_URL}/api/admin/trainees/${id}/status`, { status });
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
      const response = await axios.put(`${API_BASE_URL}/api/admin/trainees/${selectedTrainee._id}/status`, { status: "Rejected",feedback });
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
      await axios.delete(`${API_BASE_URL}/api/admin/trainees/${id}`);
      alert('Faculty deleted successfully');
      fetchTrainees();
    } catch (error) {
      console.error('Error deleting faculty:', error);
      alert('Failed to delete faculty');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/admin/trainees/${id}/toggle-status`);
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
    <div className="teacher-management-container">
      {/* Header */}
      <div className="teacher-management-header">
        <div className="teacher-header-content">
          <h2>
            <FaChalkboardTeacher className="teacher-header-icon" />
            Manage Faculty
          </h2>
          <p>Manage faculty registrations and approvals</p>
        </div>

        <div className="teacher-statistics-row">
          <div className="teacher-stat-card1">
            <span className="teacher-stat-number">{stats.total}</span>
            <span className="teacher-stat-label">Total</span>
          </div>
          <div className="teacher-stat-card1">
            <span className="teacher-stat-number">{stats.pending}</span>
            <span className="teacher-stat-label">Pending</span>
          </div>
          <div className="teacher-stat-card1">
            <span className="teacher-stat-number">{stats.approved}</span>
            <span className="teacher-stat-label">Approved</span>
          </div>
          <div className="teacher-stat-card1">
            <span className="teacher-stat-number">{stats.active}</span>
            <span className="teacher-stat-label">Active</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="teachers-controls">
        <div className="teachers-controls-left">
          <div className="teachers-search-container">
            <FaSearch className="teachers-search-icon" />
            <input
              type="text"
              placeholder="Search faculty by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="teachers-search-input"
            />
          </div>
        </div>

        <div className="teachers-controls-right">
          <div className="teachers-filter-dropdown" ref={filterRef}>
            <button className="teachers-filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <FaFilter /> Filter
            </button>
            {showFilterMenu && (
              <div className="teachers-filter-menu">
                {filterOptions.map(option => (
                  <div
                    key={option.value}
                    className={`teachers-filter-option ${filterStatus === option.value ? 'active' : ''}`}
                    onClick={() => { setFilterStatus(option.value); setShowFilterMenu(false); }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => openModal('add')} className="add-teacher-btn">
            <FaPlus className="teacher-btn-icon" />
            Add Faculty
          </button>
        </div>
      </div>

      {/* Faculty Grid */}
      <div className="teachers-main-container">
        {loading ? (
          <div className="teachers-loading-spinner">
            <div className="teachers-spinner"></div>
            <p>Loading faculty...</p>
          </div>
        ) : (
          <div className="teachers-cards-grid">
            {trainees.length === 0 ? (
              <div className="teachers-no-data">
                <FaChalkboardTeacher className="teachers-no-data-icon" />
                <p>No faculty found</p>
              </div>
            ) : (
              trainees.map((trainee, index) => (
                <div
                  key={trainee._id}
                  className="concise-teacher-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Card Header */}
                  <div className="concise-card-header">
                    <div className="teacher-avatar">
                      <FaGraduationCap />
                      <div className={`status-indicator ${trainee.isActive ? 'active' : 'inactive'}`}></div>
                    </div>

                    <div className="teacher-info">
                      <div className="teacher-name-section">
                        <h3 className="teacher-name">
                          {`${trainee.salutation || ''} ${trainee.firstName} ${trainee.lastName}`.trim()}
                        </h3>
                        <p className="teacher-role">Faculty</p>
                      </div>
                      <div className="teacher-meta">
                        <span className={`status-badge ${getStatusClass(trainee)}`}>
                          {getStatusText(trainee)}
                        </span>
                        <span className="joined-date">
                          <FaCalendarAlt className="date-icon" />
                          Joined {new Date(trainee.joiningDate || trainee.createdAt).toLocaleDateString('en-US', {
                            month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="card-right-section">
                      <div className="card-actions">
                        <button onClick={() => openModal('view', trainee)} className="action-btn-sm view" title="View Details">
                          <FaEye />
                        </button>
                        <button onClick={() => openModal('edit', trainee)} className="action-btn-sm edit" title="Edit">
                          <FaEdit />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="concise-card-body">
                    <div className="info-row">
                      <div className="info-item">
                        <FaEnvelope className="icon" />
                        <span>{trainee.email}</span>
                      </div>
                      {trainee.mobile && (
                        <div className="info-item">
                          <FaMobileAlt className="icon" />
                          <span>{trainee.mobile}</span>
                        </div>
                      )}
                    </div>

                    {trainee.specialization && (
                      <div className="subjects-row">
                        <FaBookOpen className="icon" />
                        <span>{trainee.specialization}</span>
                      </div>
                    )}

                    <div className="meta-row">
                      {trainee.experience && (
                        <div className="meta-item">
                          <FaClock className="icon" />
                          <span>{trainee.experience} experience</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="concise-card-footer">
                    {trainee.approvalStatus === 'Rejected' ? (
                      <div className="management-actions">
                        <button onClick={() => handleDelete(trainee._id)} className="btn-delete">
                          <FaTrash />
                        </button>
                      </div>
                    ) : !trainee.isApproved ? (
                      <div className="approval-actions">
                        <button onClick={() => handleApproval(trainee._id, "Approved")} className="btn-approve">
                          <FaCheck /> Approve
                        </button>
                        <button onClick={() => handleRejectClick(trainee)} className="btn-reject">
                          <FaTimes /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="management-actions">
                        <button
                          onClick={() => toggleStatus(trainee._id)}
                          className={`btn-toggle ${trainee.isActive ? 'active' : 'inactive'}`}
                        >
                          {trainee.isActive ? <FaToggleOn /> : <FaToggleOff />}
                          {trainee.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => handleDelete(trainee._id)} className="btn-delete">
                          <FaTrash />
                        </button>
                      </div>
                    )}
                    {/* rating section unchanged */}
                    <div className="rating-section">
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar key={star} className={`star ${star <= (trainee.rating || 4) ? 'filled' : 'empty'}`} />
                        ))}
                      </div>
                      <span className="student-count">{trainee.studentsCount || 0} students</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="teachers-pagination">
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="teachers-pagination-btn">
              <FaChevronLeft />
            </button>
            <span className="teachers-pagination-info">Page {currentPage} of {pagination.totalPages}</span>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.totalPages} className="teachers-pagination-btn">
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="teacher-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-modal-header">
              <h3 className="modal-title">
                {modalType === 'add' ? 'Add New Faculty' : modalType === 'edit' ? 'Edit Faculty' : 'Faculty Details'}
              </h3>
              <button className="modal-close" onClick={closeModal}><FaTimes /></button>
            </div>

            <div className="teacher-modal-body">
              {modalType === 'view' ? (
                <div className="teacher-view-details">
                  <div className="teacher-view-item">
                    <div className="teacher-view-icon"><FaGraduationCap /></div>
                    <div className="teacher-view-content">
                      <div className="teacher-view-label">Full Name</div>
                      <div className="teacher-view-value">
                        {`${selectedTrainee?.salutation || ''} ${selectedTrainee?.firstName || ''} ${selectedTrainee?.lastName || ''}`.trim()}
                      </div>
                    </div>
                  </div>

                  <div className="teacher-view-item">
                    <div className="teacher-view-icon"><FaEnvelope /></div>
                    <div className="teacher-view-content">
                      <div className="teacher-view-label">Contact Information</div>
                      <div className="teacher-view-value">
                        <div style={{ marginBottom: '8px' }}><strong>Email:</strong> {selectedTrainee?.email}</div>
                        <div><strong>Mobile:</strong> {selectedTrainee?.mobile || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>

                  {selectedTrainee?.specialization && (
                    <div className="teacher-view-item">
                      <div className="teacher-view-icon"><FaBookOpen /></div>
                      <div className="teacher-view-content">
                        <div className="teacher-view-label">Specialization</div>
                        <div className="teacher-view-value">{selectedTrainee.specialization}</div>
                      </div>
                    </div>
                  )}

                  <div className="teacher-view-item">
                    <div className="teacher-view-icon"><FaUserCheck /></div>
                    <div className="teacher-view-content">
                      <div className="teacher-view-label">Status Information</div>
                      <div className="teacher-view-value">
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Current Status:</strong>
                          <div className="teacher-view-badge" style={{ marginTop: '8px' }}>
                            <span className={`status-badge status-${getStatusClass(selectedTrainee)}`}>
                              {getStatusText(selectedTrainee)}
                            </span>
                          </div>
                        </div>
                        {selectedTrainee?.experience && (
                          <div style={{ marginBottom: '8px' }}><strong>Experience:</strong> {selectedTrainee.experience}</div>
                        )}
                        {selectedTrainee?.qualification && (
                          <div><strong>Qualification:</strong> {selectedTrainee.qualification}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTrainee?.proof && (
                    <div className="teacher-view-item">
                      <div className="teacher-view-icon">
                        <FaDownload />
                      </div>
                      <div className="teacher-view-content">
                        <div className="teacher-view-label">
                          Degree Certificate
                        </div>
                        <div className="certificate-actions">
                          <a
                            href={selectedTrainee.proof}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Certificate
                          </a>
                          <a
                            href={selectedTrainee.proof.replace(
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

                  {selectedTrainee?.badgeCertificate && (
                    <div className="teacher-view-item">
                      <div className="teacher-view-icon">
                        <FaDownload />
                      </div>
                      <div className="teacher-view-content">
                        <div className="teacher-view-label">
                          Badge Certificate
                        </div>
                        <div className="certificate-actions">
                          <a
                            href={selectedTrainee.badgeCertificate}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Certificate
                          </a>
                          <a
                            href={selectedTrainee.proof.replace(
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


                  {selectedTrainee?.achievements?.document && (
                    <div className="teacher-view-item">
                      <div className="teacher-view-icon">
                          <FaDownload />
                      </div>
                      <div className="teacher-view-content">
                          <div className="teacher-view-label">
                            Achievement Document
                          </div>
                          <div className="certificate-actions">
                            <a
                              href={selectedTrainee.achievements.document}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Achievement
                            </a>
                            <a
                              href={selectedTrainee.proof.replace(
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

                  <div className="teacher-view-item">
                    <div className="teacher-view-icon">
                      <FaCalendarAlt />
                    </div>

                    <div className="teacher-view-content">
                      <div className="teacher-view-label">
                        Registration Date
                      </div>

                      <div className="teacher-view-value">
                        {selectedTrainee?.registeredAt
                          ? new Date(selectedTrainee.registeredAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              }
                            )
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Salutation</label>
                      <select name="salutation" value={formData.salutation} onChange={handleInputChange} className="form-select">
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="form-input" required placeholder="Enter first name" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="form-input" required placeholder="Enter last name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-input" required placeholder="Enter email address" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Mobile</label>
                      <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} className="form-input" placeholder="Enter mobile number" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Timezone</label>
                      <input type="text" name="timezone" value={formData.timezone} onChange={handleInputChange} className="form-input" placeholder="e.g., Asia/Kolkata" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Password {modalType === 'edit' ? '(optional)' : '*'}</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="form-input" required={modalType === 'add'} placeholder={modalType === 'edit' ? 'Enter new password (optional)' : 'Enter password'} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Experience</label>
                      <input type="text" name="experience" value={formData.experience} onChange={handleInputChange} className="form-input" placeholder="e.g., 2 years" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} className="form-input" placeholder="e.g., Web Development, Data Science" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Qualification</label>
                    <input type="text" name="qualification" value={formData.qualification} onChange={handleInputChange} className="form-input" placeholder="e.g., B.Tech, MBA" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="form-textarea" placeholder="Additional notes about the faculty member" rows="3" />
                  </div>

                  <div className="form-actions">
                    <button type="button" onClick={closeModal} className="btn-cancel">Cancel</button>
                    <button type="submit" className="btn-submit">
                      {modalType === 'add' ? 'Add Faculty' : 'Update Faculty'}
                    </button>
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