import React from 'react';
import '../styles/extraClasses.css';
import { FaLock } from 'react-icons/fa';

// You can replace these with actual image imports
import DanceImg from '../assets/dance.jpg';
import MusicImg from '../assets/music.jpg';
import bharatanatyamImg from '../assets/bharatanatyam.jpg';
import KeyboardImg from '../assets/keyboard.jpg';
import FrenchImg from '../assets/French.jpeg';

const extraCourses = [
  { name: 'Communication', price: 500, image: DanceImg, locked: true },
  { name: 'Aptitude', price: 400, image: MusicImg, locked: true },
  { name: 'soft skills', price: 600, image: bharatanatyamImg, locked: true },
  { name: 'personality test', price: 450, image: KeyboardImg, locked: true },
];

const ExtraClasses = () => {
  return (
    <div className="extra-classes-page">
      <h2>Explore Extra Classes</h2>
      <p className="description">These are optional add-on classes you can unlock anytime!</p>
      <div className="extra-grid">
        {extraCourses.map((item, index) => (
          <div className="extra-subject-card" key={index}>
            <img src={item.image} alt={item.name} className="extra-img" />
            <div className="extra-overlay">
              <div className="extra-title">
                {item.locked && <FaLock className="lock-icon" />} {item.name}
              </div>
              <p className="extra-price">₹{item.price}</p>
              <button className="enroll-btn">Buy This Class</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExtraClasses;
