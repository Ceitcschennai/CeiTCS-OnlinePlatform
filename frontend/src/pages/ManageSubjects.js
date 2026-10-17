import React, { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/manageSubjects.css';
import LMSCard from '../components/common/LMSCard';
import LMSButton from '../components/common/LMSButton';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch,
  FaToggleOn,
  FaToggleOff,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaBook,
  FaChevronDown,
  FaCheck
} from 'react-icons/fa';

// Existing JWT token stored at login — sent on every protected API call
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showModalCategoryDropdown, setShowModalCategoryDropdown] = useState(false);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    console.log("Courses State:", courses);
  }, [courses]);

  const [formData, setFormData] = useState({
    courseName: '',
    category: '',
    price: '',
    duration: '',
    sessionType: 'Live',
    courseType: 'WeekDays',
    facultyId: '',
    description: ''
  });

  const categoryOptions = [
    { 
      value: 'Beginner', 
      label: 'Beginner', 
      description: 'Standard academic Courses',
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    { 
      value: 'Intermediate', 
      label: 'Intermediate', 
      description: 'Additional learning topics',
      color: '#f59e0b',
      bgColor: '#fffbeb'
    },
    { 
      value: 'Advanced', 
      label: 'Advanced', 
      description: 'High-level specialized courses',
      color: '#ef4444',
      bgColor: '#fef2f2'
    }
  ];

  const handleCategorySelect = (value) => {
    setFormData(prev => ({ ...prev, category: value }));
    setShowCategoryDropdown(false);
  };

  const handleModalCategorySelect = (value) => {
    setFormData(prev => ({ ...prev, category: value }));
    setShowModalCategoryDropdown(false);
  };

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`${API_BASE_URL}/api/courses?${queryParams}`);
      const data = await response.json();

      console.log("Courses API Response:", data);

      if (response.ok) {
        const list = Array.isArray(data)
          ? data
          : (data.courses || []);

        setCourses(list);

        setPagination(
          data.pagination || {
            totalCourses: list.length,
            totalPages: 1
          }
        );
      } else {
        console.error('Failed to fetch courses');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.ms-custom-dropdown')) {
        setShowCategoryDropdown(false);
        setShowModalCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      courseName: '',
      category: '',
      price: '',
      duration: '',
      sessionType: 'Live',
      courseType: 'WeekDays',
      facultyId: '',
      description: ''
    });
  };

  const openModal = (type, course) => {
    setModalType(type);
    setSelectedCourse(course);
    setFormData({
      courseName: course.courseName || '',
      category: course.category || '',
      price: course.price || '',
      duration: course.duration || '',
      sessionType: course.sessionType || 'Live',
      courseType: course.courseType || 'WeekDays',
      facultyId: course.facultyId?._id || course.facultyId || '',
      description: course.description || ''
    });
    setShowModal(true);
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      resetForm();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedCourse(null);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const dataToSend = {
        courseName: formData.courseName,
        category: formData.category,
        price: formData.price,
        duration: formData.duration,
        sessionType: formData.sessionType,
        courseType: formData.courseType,
        facultyId: formData.facultyId,
        description: formData.description
      };

      const isEdit = modalType === 'edit';
      const url = isEdit
        ? `${API_BASE_URL}/api/courses/${selectedCourse._id}`
        : `${API_BASE_URL}/api/courses`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          isEdit
            ? "Course updated successfully"
            : "Course added successfully"
        );
        if (isEdit) {
          closeModal();
        } else {
          setShowAddForm(false);
          resetForm();
        }
        fetchCourses();
      } else {
        alert(data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this Course?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchCourses();
      } else {
        alert(data.message || 'Failed to delete Course');
      }
    } catch (error) {
      console.error('Error deleting Course:', error);
      alert('An error occurred while deleting the Course.');
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/teachers-dropdown`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      console.log("Teachers API:", data);

      if (response.ok) {
        const list = Array.isArray(data)
          ? data
          : (data.teachers || []);

        setTeachers(list);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  useEffect(() => {
    console.log("Teachers State:", teachers);
  }, [teachers]);

  const toggleStatus = async (courseId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/toggle-status`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchCourses();
      } else {
        alert(data.message || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('An error occurred while updating the status.');
    }
  };

  const getCategoryOption = (value) => categoryOptions.find(opt => opt.value === value);

  const CategoryDropdown = ({ show, onToggle, onSelect }) => (
    <div className="ms-custom-dropdown">
      <div
        className={`ms-dropdown-trigger ${show ? 'ms-dropdown-trigger--active' : ''}`}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      >
        <div className="ms-selected-category">
          <div
            className="ms-category-badge"
            style={{
              backgroundColor: getCategoryOption(formData.category)?.bgColor,
              color: getCategoryOption(formData.category)?.color
            }}
          >
            <div
              className="ms-category-dot"
              style={{ backgroundColor: getCategoryOption(formData.category)?.color }}
            />
          </div>
          <div className="ms-category-text">
            <span className="ms-category-label">
              {getCategoryOption(formData.category)?.label || 'Select Category'}
            </span>
            <span className="ms-category-desc">
              {getCategoryOption(formData.category)?.description}
            </span>
          </div>
        </div>
        <FaChevronDown className={`ms-dropdown-arrow ${show ? 'ms-dropdown-arrow--open' : ''}`} />
      </div>

      {show && (
        <div className="ms-dropdown-menu">
          {categoryOptions.map((option) => (
            <div
              key={option.value}
              className={`ms-dropdown-option ${formData.category === option.value ? 'ms-dropdown-option--selected' : ''}`}
              onClick={() => onSelect(option.value)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(option.value); }}
            >
              <div className="ms-option-content">
                <div
                  className="ms-category-badge"
                  style={{ backgroundColor: option.bgColor, color: option.color }}
                >
                  <div className="ms-category-dot" style={{ backgroundColor: option.color }} />
                </div>
                <div className="ms-option-text">
                  <span className="ms-option-label">{option.label}</span>
                  <span className="ms-option-desc">{option.description}</span>
                </div>
              </div>
              {formData.category === option.value && <FaCheck className="ms-check-icon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="ms-page">
      {/* ── HEADER ── */}
      <div className="ms-header">
        <div className="ms-header-content">
          <h2 className="ms-header-title">
            <FaBook className="ms-header-icon" />Manage Courses
          </h2>
          <p className="ms-header-subtitle">Create, edit, and manage educational courses for your institution</p>
        </div>
        <div className="ms-stats-row">
          <LMSCard className="ms-stat-card" hover>
            <div className="ms-stat-inner">
              <span className="ms-stat-value">{pagination.totalCourses || 0}</span>
              <span className="ms-stat-label">Total Courses</span>
            </div>
          </LMSCard>
          <LMSCard className="ms-stat-card" hover>
            <div className="ms-stat-inner">
              <span className="ms-stat-value ms-stat-value--active">{courses.filter(c => c.isActive).length}</span>
              <span className="ms-stat-label">Active</span>
            </div>
          </LMSCard>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="ms-controls">
        <div className="ms-search-wrap">
          <FaSearch className="ms-search-icon" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ms-search-input"
          />
        </div>
        <LMSButton variant="primary" onClick={toggleAddForm}>
          {showAddForm ? <><FaTimes /> Cancel</> : <><FaPlus /> Add Course</>}
        </LMSButton>
      </div>

      {/* ── ADD COURSE FORM ── */}
      {showAddForm && (
        <div className="ms-add-form-container">
          <div className="ms-add-form-header">
            <h3><FaPlus /> Add New Course</h3>
          </div>
          <form onSubmit={handleSubmit} className="ms-add-form">
            <div className="ms-form-grid ms-form-grid--3">
              <div className="ms-form-group">
                <label className="ms-form-label">Course Name *</label>
                <input type="text" name="courseName" value={formData.courseName} onChange={handleInputChange} required placeholder="Enter course name" className="input-lms" />
              </div>
              <div className="ms-form-group">
                <label className="ms-form-label">Category *</label>
                <CategoryDropdown show={showCategoryDropdown} onToggle={() => setShowCategoryDropdown(!showCategoryDropdown)} onSelect={handleCategorySelect} />
              </div>
              <div className="ms-form-group">
                <label className="ms-form-label">Price</label>
                <input type="text" name="price" value={formData.price} onChange={handleInputChange} placeholder="e.g., Free, ₹500, ₹1000" className="input-lms" />
              </div>
              <div className="ms-form-group">
                <label className="ms-form-label">Duration *</label>
                <select name="duration" value={formData.duration} onChange={handleInputChange} required className="input-lms">
                  <option value="">Select Duration</option>
                  <option value="1 Week">1 Week</option>
                  <option value="2 Weeks">2 Weeks</option>
                  <option value="1 Month">1 Month</option>
                  <option value="2 Months">2 Months</option>
                  <option value="3 Months">3 Months</option>
                  <option value="4 Months">4 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="9 Months">9 Months</option>
                  <option value="12 Months">12 Months</option>
                  <option value="Lifetime Access">Lifetime Access</option>
                </select>
              </div>
              <div className="ms-form-group">
                <label className="ms-form-label">Session Type</label>
                <select name="sessionType" value={formData.sessionType} onChange={handleInputChange} className="input-lms">
                  <option value="Live">Live</option>
                  <option value="Recorded">Recorded</option>
                </select>
              </div>
              <div className="ms-form-group">
                <label className="ms-form-label">Course Type</label>
                <select name="courseType" value={formData.courseType} onChange={handleInputChange} className="input-lms">
                  <option value="WeekDays">Week Days</option>
                  <option value="WeekEnd">Week End</option>
                </select>
              </div>
              <div className="ms-form-group">
                <label className="ms-form-label">Assign Faculty *</label>
                <select name="facultyId" value={formData.facultyId} onChange={handleInputChange} required className="input-lms">
                  <option value="">Select Faculty</option>
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ms-form-group ms-form-group--wide">
                <label className="ms-form-label">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" placeholder="Enter course description" className="input-lms textarea-lms" />
              </div>
            </div>
            <div className="ms-form-actions">
              <LMSButton variant="secondary" onClick={toggleAddForm} type="button">Cancel</LMSButton>
              <LMSButton variant="primary" type="submit">Add Course</LMSButton>
            </div>
          </form>
        </div>
      )}

      {/* ── COURSES TABLE ── */}
      <div className="ms-table-wrap">
        {loading ? (
          <div className="ms-loading">
            <div className="ms-spinner"></div>
            <p>Loading courses...</p>
          </div>
        ) : (
          <div className="ms-table-scroll">
            <table className="ms-table">
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Assigned Faculty</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Session</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <tr key={course._id}>
                      <td>
                        <div className="ms-course-cell">
                          {course.image ? (
                            <img src={`${API_BASE_URL}/uploads/${course.image}`} alt={course.courseName} className="ms-course-img" />
                          ) : (
                            <div className="ms-course-img-placeholder"><FaBook /></div>
                          )}
                          <div className="ms-course-details">
                            <span className="ms-course-name">{course.courseName}</span>
                            <span className="ms-course-code">Code: {course.courseCode}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {course.facultyId
                          ? `${course.facultyId.firstName || ''} ${course.facultyId.lastName || ''}`.trim()
                          : '—'}
                      </td>
                      <td>{course.price || '—'}</td>
                      <td>{course.duration || '—'}</td>
                      <td>{course.sessionType || '—'}</td>
                      <td>{course.courseType || '—'}</td>
                      <td>
                        <span className={`ms-status-badge ${course.isActive ? 'ms-status-badge--active' : 'ms-status-badge--inactive'}`}>
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="ms-action-btns">
                          <LMSButton variant="secondary" onClick={() => openModal('edit', course)}>
                            <FaEdit />
                          </LMSButton>
                          <LMSButton variant={course.isActive ? 'warning' : 'success'} onClick={() => toggleStatus(course._id)}>
                            {course.isActive ? <FaToggleOn /> : <FaToggleOff />}
                          </LMSButton>
                          <LMSButton variant="danger" onClick={() => handleDelete(course._id)}>
                            <FaTrash />
                          </LMSButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">
                      <div className="ms-empty">
                        <FaBook className="ms-empty-icon" />
                        <p>No courses found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="ms-pagination">
            <button className="ms-page-btn" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
              <FaChevronLeft />
            </button>
            <span className="ms-page-info">Page {currentPage} of {pagination.totalPages}</span>
            <button className="ms-page-btn" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === pagination.totalPages}>
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      {showModal && (
        <div className="ms-modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Course">
          <div className="ms-modal-content">
            <div className="ms-modal-header">
              <h3 className="ms-modal-title">Edit Course</h3>
              <button className="ms-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="ms-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="ms-form-grid ms-form-grid--2">
                  <div className="ms-form-group">
                    <label className="ms-form-label">Course Name *</label>
                    <input type="text" name="courseName" value={formData.courseName} onChange={handleInputChange} required placeholder="Enter course name" className="input-lms" />
                  </div>
                  <div className="ms-form-group">
                    <label className="ms-form-label">Category *</label>
                    <CategoryDropdown show={showModalCategoryDropdown} onToggle={() => setShowModalCategoryDropdown(!showModalCategoryDropdown)} onSelect={handleModalCategorySelect} />
                  </div>
                  <div className="ms-form-group">
                    <label className="ms-form-label">Price</label>
                    <input type="text" name="price" value={formData.price} onChange={handleInputChange} placeholder="e.g., Free, ₹500, ₹1000" className="input-lms" />
                  </div>
                  <div className="ms-form-group">
                    <label className="ms-form-label">Duration *</label>
                    <select name="duration" value={formData.duration} onChange={handleInputChange} required className="input-lms">
                      <option value="">Select Duration</option>
                      <option value="1 Week">1 Week</option>
                      <option value="2 Weeks">2 Weeks</option>
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="4 Months">4 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="9 Months">9 Months</option>
                      <option value="12 Months">12 Months</option>
                      <option value="Lifetime Access">Lifetime Access</option>
                    </select>
                  </div>
                  <div className="ms-form-group">
                    <label className="ms-form-label">Session Type</label>
                    <select name="sessionType" value={formData.sessionType} onChange={handleInputChange} className="input-lms">
                      <option value="Recorded">Recorded</option>
                      <option value="Live">Live</option>
                    </select>
                  </div>
                  <div className="ms-form-group">
                    <label className="ms-form-label">Course Type</label>
                    <select name="courseType" value={formData.courseType} onChange={handleInputChange} className="input-lms">
                      <option value="WeekDays">Week Days</option>
                      <option value="Weekend">Weekend</option>
                    </select>
                  </div>
                  <div className="ms-form-group">
                    <label className="ms-form-label">Assign Faculty *</label>
                    <select name="facultyId" value={formData.facultyId} onChange={handleInputChange} required className="input-lms">
                      <option value="">Select Faculty</option>
                      {teachers.map((teacher) => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.firstName} {teacher.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ms-form-group">
                    <label className="ms-form-label">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" placeholder="Enter course description" className="input-lms textarea-lms" />
                  </div>
                </div>
                <div className="ms-form-actions">
                  <LMSButton variant="secondary" onClick={closeModal} type="button">Cancel</LMSButton>
                  <LMSButton variant="primary" type="submit">Update Course</LMSButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourses;