import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/facultyDetails.css';

const FacultyDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectName, teachers } = location.state || {};

  if (!subjectName || !teachers) return <p>Invalid subject</p>;

  const handleJoinClass = (traineeName) => {
    const roomName = encodeURIComponent(`${subjectName}-${traineeName}`);
    navigate(`/classroom/${roomName}`);
  };

  return (
    <div className="teacher-details-container">
      <h2 className='teacher-heading'>{subjectName} - Available Tutors</h2>
      <button className="back-btn" onClick={() => navigate(-1)}>Back</button>

      <div className="teacher-list">
        {teachers.map((trainee, idx) => (
          <div className="teacher-card" key={idx}>
            <h3>{trainee.name}</h3>
            <p>⭐ Rating: {trainee.rating} / 5</p>
            <p>📧 Email: {trainee.email}</p>
            <button className="join-btn" onClick={() => handleJoinClass(trainee.name)}>
              Join Class
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacultyDetails;