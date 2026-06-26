import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/footer.css';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-container">
        <div className="footer-content">

          <div className="footer-brand">
            <h2>Online Tuition</h2>
            <p>Empowering learning from anywhere, anytime.</p>
          </div>

          <div className="footer-links">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/subjects">Subjects</Link></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h3>Contact Us</h3>
            <p><strong>Email:</strong> support@onlinetuition.com</p>
            <p><strong>Phone:</strong> +91 98765 43210</p>
          </div>

        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Online Tuition. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
