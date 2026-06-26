import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaChartBar,
  FaBookOpen,
  FaTasks,
  FaQuestionCircle,
  FaCreditCard,
  FaUserCheck,
  FaChevronRight,
  FaTimes,
  FaVideo,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaExclamationTriangle,
  FaCalendarAlt
} from 'react-icons/fa';

import '../styles/sidebar.css';

const menuConfig = {
  common: [],

  employee: [
    { to: '/employee-dashboard', icon: FaChartBar, label: 'Dashboard' },
    { to: '/subjects', icon: FaBookOpen, label: 'Courses' },
    { to: '/assignments', icon: FaTasks, label: 'Assignments' },
    { to: '/queries', icon: FaQuestionCircle, label: 'Queries' },
    { to: '/payments', icon: FaCreditCard, label: 'Payments' },
    { to: '/live-class', icon: FaVideo, label: 'Live Class' }
  ],

  teacher: [
    { to: '/teacher-subjects', icon: FaBookOpen, label: 'Courses' },
    { to: '/teacher-assignments', icon: FaTasks, label: 'Assignments' },
    { to: '/take-attendance', icon: FaUserCheck, label: 'Attendance' },
    { to: '/student-queries', icon: FaQuestionCircle, label: 'Queries' },
    { to: '/live-class', icon: FaVideo, label: 'Live Class' }
  ],

  trainee: [
    { to: '/teacher-dashboard', icon: FaChartBar, label: 'Dashboard' },
    { to: '/teacher-subjects', icon: FaBookOpen, label: 'Courses' },
    { to: '/teacher-assignments', icon: FaTasks, label: 'Assignments' },
    { to: '/take-attendance', icon: FaUserCheck, label: 'Attendance' },
    { to: '/student-queries', icon: FaQuestionCircle, label: 'Queries' },
    { to: '/live-class', icon: FaVideo, label: 'Live Class' },
    { to: '/teacher-schedule', icon: FaCalendarAlt, label: 'Schedule' }
  ],

  admin: [
    { to: '/admin-dashboard', icon: FaChartBar, label: 'Dashboard' },
    { to: '/manage-employee', icon: FaUserGraduate, label: 'Participants' },
    { to: '/manage-teachers', icon: FaChalkboardTeacher, label: 'Faculty' },
    { to: '/manage-subjects', icon: FaBookOpen, label: 'Courses' },
    { to: '/payments', icon: FaCreditCard, label: 'Payments' },
    { to: '/alerts', icon: FaExclamationTriangle, label: 'System Alerts' }
  ]
};

const Sidebar = ({ isOpen, setIsOpen, isMobile }) => {
  const userRole = localStorage.getItem('userRole');
  if (!userRole) return null;

  const handleLinkClick = () => {
    if (isMobile) setIsOpen(false);
  };

  const getMenuItems = () => [
    ...(menuConfig.common || []),
    ...(menuConfig[userRole] || [])
  ];

  return (
    <>
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}
      <aside
        className={`sidebar ${isOpen ? 'open' : ''} ${
          isMobile ? 'mobile' : 'desktop'
        }`}
      >
        <div className="sidebar-header">
          {isMobile ? (
            <button
              className="sidebar-toggle-mobile"
              onClick={() => setIsOpen(false)}
            >
              <FaTimes />
            </button>
          ) : (
            <button
              className="sidebar-toggle-desktop"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <FaTimes /> : <FaChevronRight />}
            </button>
          )}
        </div>
        <nav className="sidebar-nav">
          {getMenuItems().map((item, index) => (
            <NavLink
              key={index}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={handleLinkClick}
            >
              <item.icon className="nav-icon" />
              {(isOpen || isMobile) && (
                <span className="nav-label">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
