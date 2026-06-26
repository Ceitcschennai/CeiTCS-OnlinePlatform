import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/teacherAssignmentModal.css';
import { 
  FaTimes, 
  FaChalkboardTeacher, 
  FaBookOpen, 
  FaUserGraduate,
  FaCheck,
  FaInfoCircle,
  FaEdit,
  FaUsers,
  FaGraduationCap,
  FaSpinner
} from 'react-icons/fa';

const TeacherAssignmentModal = ({ 
  isOpen, 
  onClose, 
  teacher, 
  onAssignmentComplete,
  mode = 'assign' // 'assign' or 'edit'
}) => {
  const [formData, setFormData] = useState({
    classesAssigned: [],
    subjects: []
  });
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Class selection, 2: Subject selection, 3: Confirmation

  useEffect(() => {
    if (isOpen && teacher) {
      console.log('Modal opened for teacher:', teacher);
      fetchAvailableData();
      if (mode === 'edit' && (teacher.classesAssigned || teacher.classAssigned)) {
        // Handle both single and multiple class assignments
        let classesArray = [];
        if (teacher.classesAssigned) {
          classesArray = Array.isArray(teacher.classesAssigned) ? teacher.classesAssigned : [teacher.classesAssigned];
        } else if (teacher.classAssigned) {
          classesArray = [teacher.classAssigned];
        }
        
        console.log('Edit mode - loading existing assignment:', {
          teacher: teacher,
          classesArray: classesArray,
          subjects: teacher.subjects || []
        });
        
        setFormData({
          classesAssigned: classesArray,
          subjects: teacher.subjects || []
        });
        setStep(classesArray.length > 0 ? 2 : 1);
      } else {
        setFormData({ classesAssigned: [], subjects: [] });
        setStep(1);
      }
    }
  }, [isOpen, teacher, mode]);

  const fetchAvailableData = async () => {
    setDataLoading(true);
    setError(null);
    try {
      // First, test server connectivity
      console.log('Testing server connectivity...');
      await axios.get(`${API_BASE_URL}/`, { timeout: 5000 });
      console.log('Server is running!');

      // Get token from various possible locations
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') ||
                    sessionStorage.getItem('authToken');
      
      console.log('Token found:', !!token);

      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header only if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('Fetching data with headers:', headers);

      // Test basic admin route first
      try {
        console.log('Testing admin route access...');
        const testResponse = await axios.get(`${API_BASE_URL}/api/admin/teachers?limit=1`, {
          headers,
          timeout: 10000
        });
        console.log('Admin route accessible:', testResponse.status === 200);
      } catch (adminTestError) {
        console.warn('Admin route test failed:', adminTestError.message);
      }

      // Fetch classes and subjects separately to handle errors better
      let classesData = [];
      let subjectsData = [];

      // Fetch available classes
      try {
        console.log('Fetching classes from /api/admin/available-classes...');
        const classesResponse = await axios.get(`${API_BASE_URL}/api/admin/available-classes`, {
          headers,
          timeout: 10000
        });
        console.log('Classes Response Status:', classesResponse.status);
        console.log('Classes Response Data:', classesResponse.data);
        
        classesData = Array.isArray(classesResponse.data) 
          ? classesResponse.data 
          : classesResponse.data.classes || [];
          
        if (classesData.length === 0) {
          console.warn('No classes found, using fallback');
          classesData = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        }
      } catch (classError) {
        console.error('Error fetching classes:', classError.response?.status, classError.message);
        
        // Try alternative routes
        try {
          console.log('Trying alternative student route for classes...');
          const studentResponse = await axios.get(`${API_BASE_URL}/api/student`, {
            headers,
            timeout: 10000
          });
          console.log('Student Response:', studentResponse.data);
          
          const students = Array.isArray(studentResponse.data) 
            ? studentResponse.data 
            : studentResponse.data.students || [];
          classesData = [...new Set(students
            .filter(student => student.approvalStatus === 'Approved')
            .map(student => student.class))]
            .filter(Boolean)
            .sort((a, b) => parseInt(a) - parseInt(b));
            
          if (classesData.length === 0) {
            classesData = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
          }
        } catch (studentError) {
          console.error('Error fetching students for classes:', studentError.message);
          // Fallback: provide common class options
          classesData = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        }
      }

      // Fetch available subjects
      try {
        console.log('Fetching subjects from /api/subjects...');
        const subjectsResponse = await axios.get(`${API_BASE_URL}/api/subjects`, {
          headers,
          timeout: 10000
        });
        console.log('Subjects Response Status:', subjectsResponse.status);
        console.log('Subjects Response Data:', subjectsResponse.data);
        
        // Handle different response formats
        if (subjectsResponse.data.subjects) {
          subjectsData = subjectsResponse.data.subjects;
        } else if (Array.isArray(subjectsResponse.data)) {
          subjectsData = subjectsResponse.data;
        } else {
          subjectsData = [];
        }
        
        if (subjectsData.length === 0) {
          console.warn('No subjects found, using fallback');
          subjectsData = [
            { _id: '1', name: 'Mathematics', category: 'Science' },
            { _id: '2', name: 'English', category: 'Language' },
            { _id: '3', name: 'Science', category: 'Science' },
            { _id: '4', name: 'Social Studies', category: 'Humanities' },
            { _id: '5', name: 'Tamil', category: 'Language' },
            { _id: '6', name: 'Hindi', category: 'Language' }
          ];
        }
      } catch (subjectError) {
        console.error('Error fetching subjects:', subjectError.response?.status, subjectError.message);
        // Provide fallback subjects
        subjectsData = [
          { _id: '1', name: 'Mathematics', category: 'Science' },
          { _id: '2', name: 'English', category: 'Language' },
          { _id: '3', name: 'Science', category: 'Science' },
          { _id: '4', name: 'Social Studies', category: 'Humanities' },
          { _id: '5', name: 'Tamil', category: 'Language' },
          { _id: '6', name: 'Hindi', category: 'Language' }
        ];
      }

      setAvailableClasses(classesData);
      setAvailableSubjects(subjectsData);
      
      console.log('Final Classes Data:', classesData);
      console.log('Final Subjects Data:', subjectsData);

    } catch (error) {
      console.error('Server connection error:', error.message);
      setError(`Server connection failed: ${error.message}. Using default options.`);
      
      // Set fallback data
      setAvailableClasses(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
      setAvailableSubjects([
        { _id: '1', name: 'Mathematics', category: 'Science' },
        { _id: '2', name: 'English', category: 'Language' },
        { _id: '3', name: 'Science', category: 'Science' },
        { _id: '4', name: 'Social Studies', category: 'Humanities' },
        { _id: '5', name: 'Tamil', category: 'Language' },
        { _id: '6', name: 'Hindi', category: 'Language' }
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleClassSelect = (selectedClass) => {
    setFormData(prev => {
      const isSelected = prev.classesAssigned.includes(selectedClass);
      const newClasses = isSelected 
        ? prev.classesAssigned.filter(cls => cls !== selectedClass)
        : [...prev.classesAssigned, selectedClass];
      
      return { ...prev, classesAssigned: newClasses };
    });
  };

  const handleSubjectToggle = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleSubmit = async () => {
    if (formData.classesAssigned.length === 0 || formData.subjects.length === 0) {
      alert('Please select at least one class and at least one subject');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const endpoint = mode === 'edit' 
        ? `${API_BASE_URL}/api/admin/teachers/${teacher._id}/update-assignment`
        : `${API_BASE_URL}/api/admin/teachers/${teacher._id}/assign`;
      
      console.log('Submitting assignment:', { endpoint, formData, headers });
      console.log('Assignment Data being sent:', JSON.stringify(formData, null, 2));
      
      const response = await axios.post(endpoint, formData, { headers });
      
      console.log('Assignment Response:', response.data);
      
      if (response.status === 200 || response.status === 201) {
        onAssignmentComplete(response.data.teacher || response.data);
        onClose();
        alert(`Assignment ${mode === 'edit' ? 'updated' : 'completed'} successfully!`);
      }
    } catch (error) {
      console.error('Assignment error:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
      } else if (error.response?.status === 404) {
        alert('Teacher or assignment endpoint not found. Please check the server.');
      } else if (error.response?.status === 500) {
        alert('Server error occurred. Please try again later.');
      } else {
        const errorMessage = error.response?.data?.message || `Failed to ${mode === 'edit' ? 'update' : 'assign'} teacher. Please try again.`;
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const goToConfirmation = () => {
    if (formData.subjects.length > 0) {
      setStep(3);
    } else {
      alert('Please select at least one subject');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="teacher-assign-modal-overlay">
      <div className="teacher-assign-modal">
        <div className="teacher-assign-modal-header">
          <div className="teacher-assign-modal-header-content">
            <div className="teacher-assign-modal-icon">
              {mode === 'edit' ? <FaEdit /> : <FaChalkboardTeacher />}
            </div>
            <div className="teacher-assign-modal-title-section">
              <h2>{mode === 'edit' ? 'Edit Teacher Assignment' : 'Assign Teacher to Class & Subjects'}</h2>
              <p>
                {teacher?.salutation} {teacher?.firstName} {teacher?.lastName}
              </p>
            </div>
          </div>
          <button className="teacher-assign-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="teacher-assign-modal-body">
          {/* Error Display */}
          {error && (
            <div className="teacher-assign-error-message">
              <FaInfoCircle />
              <p>{error}</p>
              <button onClick={fetchAvailableData} className="teacher-assign-retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="teacher-assign-progress-indicator">
            <div className={`teacher-assign-progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="teacher-assign-step-number">
                {step > 1 ? <FaCheck /> : '1'}
              </div>
              <span>Select Class</span>
            </div>
            <div className="teacher-assign-progress-line"></div>
            <div className={`teacher-assign-progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="teacher-assign-step-number">
                {step > 2 ? <FaCheck /> : '2'}
              </div>
              <span>Select Subjects</span>
            </div>
            <div className="teacher-assign-progress-line"></div>
            <div className={`teacher-assign-progress-step ${step >= 3 ? 'active' : ''}`}>
              <div className="teacher-assign-step-number">3</div>
              <span>Confirm</span>
            </div>
          </div>

          {/* Step Content */}
          <div className="step-content">
            {dataLoading ? (
              <div className="teacher-assign-loading">
                <FaSpinner />
                <p>Loading data...</p>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <div className="teacher-assign-class-selection">
                    <div className="teacher-assign-section-header">
                      <FaUsers className="teacher-assign-section-icon" />
                      <h3>Select Classes</h3>
                      <p>Choose which classes this teacher will manage (you can select multiple)</p>
                    </div>
                    <div className="teacher-assign-class-grid">
                      {availableClasses.length > 0 ? (
                        availableClasses.map((classItem) => (
                          <div
                            key={classItem}
                            className={`teacher-assign-class-card ${formData.classesAssigned.includes(classItem) ? 'selected' : ''}`}
                            onClick={() => handleClassSelect(classItem)}
                          >
                            <div className="teacher-assign-class-icon">
                              <FaGraduationCap />
                            </div>
                            <h4>{classItem}</h4>
                            <p>Available for assignment</p>
                            {formData.classesAssigned.includes(classItem) && (
                              <div className="teacher-assign-selected-indicator">
                                <FaCheck />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="teacher-assign-no-data-message">
                          <FaInfoCircle />
                          <p>No classes available. Please ensure students are approved first.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="teacher-assign-subject-selection">
                    <div className="teacher-assign-section-header">
                      <FaBookOpen className="teacher-assign-section-icon" />
                      <h3>Select Subjects</h3>
                      <p>Choose subjects for the selected classes ({formData.classesAssigned.join(', ')})</p>
                    </div>
                    <div className="teacher-assign-subjects-grid">
                      {availableSubjects.length > 0 ? (
                        availableSubjects.map((subject) => (
                          <div
                            key={subject._id}
                            className={`teacher-assign-subject-card ${formData.subjects.includes(subject.name) ? 'selected' : ''}`}
                            onClick={() => handleSubjectToggle(subject.name)}
                          >
                            <div className="teacher-assign-subject-icon">
                              <FaBookOpen />
                            </div>
                            <h4>{subject.name}</h4>
                            <p>{subject.category}</p>
                            {formData.subjects.includes(subject.name) && (
                              <div className="teacher-assign-selected-indicator">
                                <FaCheck />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="teacher-assign-no-data-message">
                          <FaInfoCircle />
                          <p>No subjects available. Add subjects in Manage Subjects section.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="teacher-assign-confirmation-section">
                    <div className="teacher-assign-section-header">
                      <FaCheck className="teacher-assign-section-icon" />
                      <h3>Confirm Assignment</h3>
                      <p>Review assignment details before confirming</p>
                    </div>
                    
                    <div className="teacher-assign-confirmation-details">
                      <div className="teacher-assign-teacher-info-card">
                        <h4><FaChalkboardTeacher /> Teacher Information</h4>
                        <div className="teacher-assign-info-grid">
                          <div className="teacher-assign-info-item">
                            <label>Name:</label>
                            <span>{teacher?.salutation} {teacher?.firstName} {teacher?.lastName}</span>
                          </div>
                          <div className="teacher-assign-info-item">
                            <label>Email:</label>
                            <span>{teacher?.email}</span>
                          </div>
                          <div className="teacher-assign-info-item">
                            <label>Experience:</label>
                            <span>{teacher?.experience || 'Not specified'}</span>
                          </div>
                          <div className="teacher-assign-info-item">
                            <label>Qualification:</label>
                            <span>{teacher?.qualification || 'Not specified'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="teacher-assign-assignment-info-card">
                        <h4><FaUserGraduate /> Assignment Details</h4>
                        <div className="teacher-assign-info-grid">
                          <div className="teacher-assign-info-item">
                            <label>Classes:</label>
                            <div className="teacher-assign-classes-list">
                              {formData.classesAssigned.map((cls, index) => (
                                <span key={index} className="teacher-assign-class-badge">{cls}</span>
                              ))}
                            </div>
                          </div>
                          <div className="teacher-assign-info-item">
                            <label>Subjects:</label>
                            <div className="teacher-assign-subjects-list">
                              {formData.subjects.map((subject, index) => (
                                <span key={index} className="teacher-assign-subject-badge">{subject}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="teacher-assign-modal-actions">
            {step > 1 && (
              <button className="teacher-assign-btn-secondary" onClick={goBack} disabled={loading}>
                Back
              </button>
            )}
            
            {step === 1 && formData.classesAssigned.length > 0 && (
              <button className="teacher-assign-btn-primary" onClick={() => setStep(2)}>
                Continue to Subjects
              </button>
            )}
            
            {step === 2 && (
              <button 
                className="teacher-assign-btn-primary" 
                onClick={goToConfirmation}
                disabled={formData.subjects.length === 0}
              >
                Review Assignment
              </button>
            )}
            
            {step === 3 && (
              <button 
                className="teacher-assign-btn-success" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="teacher-assign-spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCheck />
                    {mode === 'edit' ? 'Update Assignment' : 'Confirm Assignment'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAssignmentModal;
