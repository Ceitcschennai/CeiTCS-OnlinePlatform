  import React, { useState, useEffect, useCallback } from 'react';
  import API_BASE_URL from '../config/api';
  import '../styles/manageSubjects.css';
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
        if (!event.target.closest('.custom-dropdown-container')) {
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
          headers: { 'Content-Type': 'application/json' },
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
          method: 'DELETE'
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
        const response = await fetch(`${API_BASE_URL}/api/admin/teachers-dropdown`);
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
          method: 'PATCH'
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
      <div className="custom-dropdown-container">
        <div
          className={`custom-dropdown-trigger ${show ? 'active' : ''}`}
          onClick={onToggle}
        >
          <div className="selected-category">
            <div
              className="category-indicator"
              style={{
                backgroundColor: getCategoryOption(formData.category)?.bgColor,
                color: getCategoryOption(formData.category)?.color
              }}
            >
              <div
                className="category-dot"
                style={{ backgroundColor: getCategoryOption(formData.category)?.color }}
              ></div>
            </div>
            <div className="category-text">
              <span className="category-label">
                {getCategoryOption(formData.category)?.label || 'Select Category'}
              </span>
              <span className="category-description">
                {getCategoryOption(formData.category)?.description}
              </span>
            </div>
          </div>
          <FaChevronDown className={`dropdown-arrow ${show ? 'rotated' : ''}`} />
        </div>

        {show && (
          <div className="custom-dropdown-menu">
            {categoryOptions.map((option) => (
              <div
                key={option.value}
                className={`dropdown-option ${formData.category === option.value ? 'selected' : ''}`}
                onClick={() => onSelect(option.value)}
              >
                <div className="option-content">
                  <div
                    className="category-indicator"
                    style={{ backgroundColor: option.bgColor, color: option.color }}
                  >
                    <div className="category-dot" style={{ backgroundColor: option.color }}></div>
                  </div>
                  <div className="option-text">
                    <span className="option-label">{option.label}</span>
                    <span className="option-description">{option.description}</span>
                  </div>
                </div>
                {formData.category === option.value && <FaCheck className="check-icon" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );

    return (
      <div className="manage-Courses-page">
        {/* Header */}
        <div className="Courses-page-header">
          <div className="header-content">
            <h2><FaBook className="header-icon" />Manage Courses</h2>
            <p>Create, edit, and manage educational Courses for your institution</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{pagination.totalCourses || 0}</span>
              <span className="stat-label">Total Courses</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{courses.filter(c => c.isActive).length}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <div className="filters">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search Courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <button onClick={toggleAddForm} className="add-btn">
            {showAddForm ? <FaTimes className="btn-icon" /> : <FaPlus className="btn-icon" />}
            {showAddForm ? 'Cancel' : 'Add Course'}
          </button>
        </div>

        {/* Add Course Form */}
        {showAddForm && (
          <div className="add-Course-form-container">
            <div className="add-form-header">
              <h3><FaPlus className="form-icon" />Add New Course</h3>
            </div>
            <form onSubmit={handleSubmit} className="add-Course-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Course Name *</label>
                  <input
                    type="text"
                    name="courseName"
                    value={formData.courseName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter Course name"
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <CategoryDropdown
                    show={showCategoryDropdown}
                    onToggle={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    onSelect={handleCategorySelect}
                  />
                </div>

                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g., Free, ₹500, ₹1000"
                  />
                </div>

                <div className="form-group">
                  <label>Course Duration *</label>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                  >
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

                <div className="form-group">
                  <label>Session Type</label>
                  <select
                    name="sessionType"
                    value={formData.sessionType}
                    onChange={handleInputChange}
                  >
                    <option value="Live">Live</option>
                    <option value="Recorded">Recorded</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Course Type</label>
                  <select
                    name="courseType"
                    value={formData.courseType}
                    onChange={handleInputChange}
                  >
                    <option value="WeekDays">Week Days</option>
                    <option value="WeekEnd">Week End</option>
                  </select>
                </div>
                {/* Replace your current faculty form-group block with this */}
                <div className="form-group">
                  <label>Assign Faculty *</label>
                  <select
                    name="facultyId"
                    value={formData.facultyId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Faculty</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.firstName} {teacher.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group description-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Enter course description"
                  />
                </div>
              </div>

              <div className="form-actions-inline">
                <button type="button" onClick={toggleAddForm} className="cancel-btn-inline">
                  Cancel
                </button>
                <button type="submit" className="submit-btn-inline">
                  Add Course
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Courses Table */}
        <div className="Courses-container">
          {loading ? (
            <div className="Courses-loading-spinner">
              <div className="Courses-spinner"></div>
              <p>Loading Courses...</p>
            </div>
          ) : (
            <div className="Courses-table-container">
              <table className="Courses-table">
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Assigned Faculty</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>SessionType</th>
                    <th>CourseType</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course._id}>
                      <td>
                        <div className="Course-info">
                          {course.image ? (
                            <img
                              src={`${API_BASE_URL}/uploads/${course.image}`}
                              alt={course.courseName}
                              className="Course-image"
                            />
                          ) : (
                            <div className="Course-placeholder">
                              <FaBook />
                            </div>
                          )}
                          <div className="Course-details">
                            <span className="Course-name">
                              {course.courseName}
                            </span>

                            <span className="course-subtitle">
                              Code: {course.courseCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                        
                      
                      <td>
                        {course.facultyId
                          ? `${course.facultyId.firstName || ''} ${course.facultyId.lastName || ''}`.trim()
                          : 'Not assigned'}
                      </td>
                      <td>{course.price || '—'}</td>
                      <td>{course.duration || '—'}</td>
                      <td>{course.sessionType || '—'}</td>
                      <td>{course.courseType || '—'}</td>
                      <td>
                        <span className={`status-badge ${course.isActive ? 'active' : 'inactive'}`}>
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="Course-action-buttons">
                          <button
                            onClick={() => openModal('edit', course)}
                            className="Course-action-btn edit-btn"
                            title="Edit Course"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => toggleStatus(course._id)}
                            className="Course-action-btn toggle-btn"
                            title={course.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {course.isActive ? <FaToggleOn /> : <FaToggleOff />}
                          </button>
                          <button
                            onClick={() => handleDelete(course._id)}
                            className="Course-action-btn delete-btn"
                            title="Delete Course"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {courses.length === 0 && (
                <div className="no-data">
                  <FaBook className="no-data-icon" />
                  <p>No Courses found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                <FaChevronLeft />
              </button>
              <span className="pagination-info">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage === pagination.totalPages}
                className="pagination-btn"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Edit Course</h3>
                <button onClick={closeModal} className="close-btn">
                  <FaTimes />
                </button>
              </div>

              <div className="modal-content">
                <form onSubmit={handleSubmit} className="Course-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Course Name *</label>
                      <input
                        type="text"
                        name="courseName"
                        value={formData.courseName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter Course name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Category *</label>
                      <CategoryDropdown
                        show={showModalCategoryDropdown}
                        onToggle={() => setShowModalCategoryDropdown(!showModalCategoryDropdown)}
                        onSelect={handleModalCategorySelect}
                      />
                    </div>

                    <div className="form-group">
                      <label>Price</label>
                      <input
                        type="text"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="e.g., Free, ₹500, ₹1000"
                      />
                    </div>

                    <div className="form-group">
                      <label>Course Duration *</label>
                      <select
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        required
                      >
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

                    <div className="form-group">
                      <label>Session Type</label>
                      <select
                        name="sessionType"
                        value={formData.sessionType}
                        onChange={handleInputChange}
                      >
                        <option value="Recorded">Recorded</option>
                        <option value="Live">Live</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Course Type</label>
                      <select
                        name="courseType"
                        value={formData.courseType}
                        onChange={handleInputChange}
                      >
                        <option value="WeekDays">Week Days</option>
                        <option value="Weekend">Weekend</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Assign Faculty *</label>
                      <select
                        name="facultyId"
                        value={formData.facultyId}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Faculty</option>
                        {teachers.map((teacher) => (
                          <option key={teacher._id} value={teacher._id}>
                            {teacher.firstName} {teacher.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="4"
                        placeholder="Enter course description"
                      />
                    </div>
                  </div>

                  <div className="modal-form-actions">
                    <button type="button" onClick={closeModal} className="modal-cancel-btn">
                      Cancel
                    </button>
                    <button type="submit" className="modal-submit-btn">
                      Update Course
                    </button>
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