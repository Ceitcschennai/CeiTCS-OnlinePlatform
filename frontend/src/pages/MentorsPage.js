import React, { useState } from "react";

const mentors = [
  {
    id: 1,
    name: "Siva",
    title: "Software Engineer",
    company: "CEITCS",
    companyLogo: "🔵",
    experience: "6 Years",
    rating: 4.5,
    students: 1240,
    courses: ["Java", "DSA"],
    bio: "Experienced engineer with expertise in distributed systems and algorithms. Passionate about making complex topics easy to understand.",
    avatar: "AS",
    color: "#6c63ff",
    sessions: 320,
  },
  {
    id: 2,
    name: "Pradeep",
    title: "Full Stack Developer",
    company: "CEITCS",
    companyLogo: "🟦",
    experience: "6 Years",
    rating: 4.5,
    students: 980,
    courses: ["MERN Stack", "JavaScript", "HTML", "CSS"],
    bio: "MERN Stack specialist at Ceitcs. Loves building scalable web apps and mentoring the next generation of developers.",
    avatar: "PN",
    color: "#e67e22",
    sessions: 215,
  },
  {
    id: 3,
    name: "Sanjay",
    title: "Cloud Architect",
    company: "CEITCS",
    companyLogo: "🟠",
    experience: "6 Years",
    rating: 4.95,
    students: 1500,
    courses: ["Cloud Computing", "DevOps", "Python"],
    bio: "AWS certified solutions architect with 10+ years of cloud infrastructure experience. Helped 50+ startups scale their infrastructure.",
    avatar: "RK",
    color: "#27ae60",
    sessions: 410,
  },
  {
    id: 4,
    name: "Poovizhi",
    title: "Data Scientist",
    company: "CEITCS",
    companyLogo: "🔷",
    experience: "13 Years",
    rating: 4.85,
    students: 760,
    courses: ["Data Science", "AI", "Python"],
    bio: "Data Science lead at Ceitcs. Specializes in ML pipelines, NLP, and AI-driven product features.",
    avatar: "SP",
    color: "#8e44ad",
    sessions: 180,
  },
  {
    id: 5,
    name: "RajiniKanth",
    title: "Healthcare & Finance",
    company: "CEITCS",
    companyLogo: "🟩",
    experience: "12 Years",
    rating: 4.75,
    students: 620,
    courses: ["Healthcare", "AI","Finance"],
    bio: "Healthcare and AI expert with 7 years at Ceitcs. Led test automation for 20+ enterprise-grade applications.",
    avatar: "KM",
    color: "#e74c3c",
    sessions: 195,
  },
  {
    id: 6,
    name: "Lokesh",
    title: "Full Stack Developer",
    company: "CEITCS",
    companyLogo: "🟡",
    experience: "4 Years",
    rating: 4.7,
    students: 530,
    courses: ["HTML", "CSS", "JavaScript", "MERN Stack"],
    bio: "Frontend engineer at Ceitcs. Passionate about pixel-perfect UIs, accessibility, and performance optimization.",
    avatar: "DR",
    color: "#2980b9",
    sessions: 140,
  },
   {
    id: 7,
    name: "Vinay",
    title: "Python Developer",
    company: "CEITCS",
    companyLogo: "🔷",
    experience: "5 Years",
    rating: 4.5,
    students: 760,
    courses: ["Data Science", "AI", "Python","DSA"],
    bio: "Data Science lead at Ceitcs. Specializes in ML pipelines, NLP, and AI-driven product features.",
    avatar: "SP",
    color: "#8e44ad",
    sessions: 180,
  }
];

const filters = ["All", "Java", "Python", "MERN Stack", "Cloud Computing", "Data Science", "Automation Testing", "AI", "DSA"];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .mp-page {
    min-height: 100vh;
    background: #f4f6f9;
    font-family: 'Nunito', sans-serif;
    color: #1a1a2e;
  }

  /* ── Hero Banner ── */
  .mp-hero {
    background: linear-gradient(135deg, #1a9e8f 0%, #0e7a6e 40%, #14b8a6 100%);
    border-radius: 16px;
    margin: 24px 32px 32px;
    padding: 52px 40px 44px;
    position: relative;
    overflow: hidden;
    text-align: center;
    box-shadow: 0 8px 32px rgba(20, 184, 166, 0.28);
  }

  /* Decorative circles */
  .mp-hero::after {
    content: '';
    position: absolute;
    top: -50px; right: -50px;
    width: 240px; height: 240px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    pointer-events: none;
  }
  .mp-hero::before {
    content: '';
    position: absolute;
    bottom: -70px; right: 80px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: rgba(255,255,255,0.05);
    pointer-events: none;
  }

  /* Badge */
  .mp-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.35);
    color: #fff;
    padding: 5px 18px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }

  /* Title */
  .mp-hero h1 {
    font-family: 'Nunito', sans-serif;
    font-size: clamp(30px, 4vw, 50px);
    font-weight: 900;
    color: #fff;
    margin-bottom: 12px;
    line-height: 1.15;
  }

  /* Subtitle */
  .mp-hero p {
    color: rgba(255,255,255,0.82);
    font-size: 15px;
    font-weight: 500;
    max-width: 500px;
    margin: 0 auto;
    line-height: 1.7;
  }

  /* ── Filter Bar ── */
  .mp-filter-bar {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 32px 32px;
  }

  .mp-filter-btn {
    padding: 9px 22px;
    border-radius: 50px;
    border: 1.5px solid #dde0e8;
    background: #fff;
    color: #555;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.22s ease;
    font-family: 'Nunito', sans-serif;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .mp-filter-btn:hover {
    border-color: #0e9e8a;
    color: #0e9e8a;
    background: rgba(20,184,166,0.06);
  }

  .mp-filter-btn.active {
    background: #0e9e8a;
    border-color: #0e9e8a;
    color: #fff;
    box-shadow: 0 4px 14px rgba(14,158,138,0.35);
  }

  /* ── Mentor Cards Grid ── */
  .mp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    gap: 22px;
    padding: 0 32px 60px;
    max-width: 1300px;
    margin: 0 auto;
  }

  /* Mentor Card */
  .mp-card {
    background: #fff;
    border: 1.5px solid #eaeaf0;
    border-radius: 16px;
    padding: 26px;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }

  .mp-card::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent);
    transform: scaleX(0);
    transition: transform 0.3s ease;
    transform-origin: left;
  }

  .mp-card:hover {
    transform: translateY(-5px);
    border-color: #0e9e8a;
    box-shadow: 0 12px 36px rgba(20,184,166,0.14);
  }

  .mp-card:hover::after {
    transform: scaleX(1);
  }

  /* Card Top Row */
  .mp-card-top {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 18px;
  }

  /* Avatar */
  .mp-avatar {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Nunito', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
    background: var(--accent);
  }

  /* Mentor Name + Title */
  .mp-card-info h3 {
    font-family: 'Nunito', sans-serif;
    font-size: 17px;
    font-weight: 800;
    color: #1a1a2e;
    margin-bottom: 3px;
  }

  .mp-card-info p {
    color: #888;
    font-size: 13px;
    margin-bottom: 7px;
  }

  /* Company Badge */
  .mp-company-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #f4f6f9;
    border: 1px solid #eaeaf0;
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 12px;
    color: #555;
    font-weight: 600;
  }

  /* Bio */
  .mp-bio {
    color: #777;
    font-size: 13.5px;
    line-height: 1.65;
    margin-bottom: 18px;
  }

  /* Stats Row */
  .mp-stats-row {
    display: flex;
    gap: 18px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .mp-stat { display: flex; flex-direction: column; gap: 2px; }

  .mp-stat-val {
    font-family: 'Nunito', sans-serif;
    font-size: 17px;
    font-weight: 800;
    color: #1a1a2e;
  }

  .mp-stat-val.gold { color: #d97706; }

  .mp-stat-lbl {
    font-size: 10px;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 700;
  }

  /* Course Tags */
  .mp-course-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 20px;
  }

  .mp-course-tag {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    background: rgba(20,184,166,0.08);
    border: 1px solid rgba(20,184,166,0.2);
    color: #0e9e8a;
  }

  /* Book Button */
  .mp-book-btn {
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: none;
    background: #0e9e8a;
    color: #fff;
    font-family: 'Nunito', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.22s;
    letter-spacing: 0.2px;
  }

  .mp-book-btn:hover {
    background: #0a8070;
    box-shadow: 0 6px 20px rgba(14,158,138,0.4);
    transform: translateY(-1px);
  }

  /* ══════════════════════════════════════
     MODAL
  ══════════════════════════════════════ */
  .mp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: mpFadeIn 0.2s ease;
  }

  @keyframes mpFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .mp-modal {
    background: #fff;
    border-radius: 20px;
    padding: 36px;
    max-width: 540px;
    width: 100%;
    position: relative;
    box-shadow: 0 24px 60px rgba(0,0,0,0.18);
    animation: mpSlideUp 0.28s ease;
  }

  @keyframes mpSlideUp {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .mp-modal-close {
    position: absolute;
    top: 16px; right: 16px;
    width: 34px; height: 34px;
    border-radius: 50%;
    border: 1.5px solid #eaeaf0;
    background: #f4f6f9;
    color: #555;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-family: 'Nunito', sans-serif;
  }
  .mp-modal-close:hover { background: #ffe0e0; border-color: #e74c3c; color: #e74c3c; }

  /* Modal Avatar */
  .mp-modal-avatar {
    width: 76px; height: 76px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Nunito', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: #fff;
    margin-bottom: 18px;
  }

  .mp-modal h2 {
    font-family: 'Nunito', sans-serif;
    font-size: 24px;
    font-weight: 900;
    color: #1a1a2e;
    margin-bottom: 4px;
  }

  .mp-modal-role {
    color: #888;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 18px;
  }

  /* Bio Block */
  .mp-modal-bio {
    color: #666;
    font-size: 14px;
    line-height: 1.72;
    margin-bottom: 22px;
    padding: 14px 16px;
    background: rgba(20,184,166,0.06);
    border-radius: 10px;
    border-left: 3px solid #0e9e8a;
  }

  /* Modal Stats Grid */
  .mp-modal-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 22px;
  }

  .mp-modal-stat {
    text-align: center;
    padding: 12px 8px;
    background: #f8fffe;
    border-radius: 10px;
    border: 1px solid #e0f5f2;
  }

  .mp-modal-stat-val {
    font-family: 'Nunito', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: #d97706;
    display: block;
  }

  .mp-modal-stat-lbl {
    font-size: 10px;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    display: block;
    margin-top: 3px;
    font-weight: 700;
  }

  /* Modal Courses */
  .mp-modal-courses-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #aaa;
    margin-bottom: 10px;
    font-weight: 700;
  }

  /* Modal Actions */
  .mp-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .mp-modal-btn-primary {
    flex: 1;
    padding: 13px;
    border-radius: 10px;
    border: none;
    background: #0e9e8a;
    color: #fff;
    font-family: 'Nunito', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.22s;
  }
  .mp-modal-btn-primary:hover {
    background: #0a8070;
    box-shadow: 0 6px 20px rgba(14,158,138,0.4);
    transform: translateY(-1px);
  }

  .mp-modal-btn-secondary {
    padding: 13px 20px;
    border-radius: 10px;
    border: 1.5px solid #dde0e8;
    background: #fff;
    color: #555;
    font-family: 'Nunito', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .mp-modal-btn-secondary:hover {
    border-color: #0e9e8a;
    color: #0e9e8a;
    background: rgba(20,184,166,0.06);
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .mp-hero      { margin: 16px 16px 24px; padding: 40px 20px 36px; }
    .mp-filter-bar { padding: 0 16px 24px; }
    .mp-grid      { padding: 0 16px 50px; grid-template-columns: 1fr; }
    .mp-modal     { padding: 24px 18px; }
    .mp-modal-stats { grid-template-columns: repeat(2, 1fr); }
  }
`;

export default function MentorsPage() {
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [activeFilter, setActiveFilter]     = useState("All");

  const filtered =
    activeFilter === "All"
      ? mentors
      : mentors.filter((m) => m.courses.includes(activeFilter));

  return (
    <>
      <style>{styles}</style>
      <div className="mp-page">

        {/* ── Hero ── */}
        <div className="mp-hero">
          <div className="mp-hero-badge">⭐ Industry Experts</div>
          <h1>Meet Our Mentors</h1>
          <p>
            Train with engineers from Google, Microsoft, AWS, and more. Get
            personalized guidance from those who've been there.
          </p>
        </div>

        {/* ── Filter Bar ── */}
        <div className="mp-filter-bar">
          {filters.map((f) => (
            <button
              key={f}
              className={`mp-filter-btn ${activeFilter === f ? "active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Cards Grid ── */}
        <div className="mp-grid">
          {filtered.map((mentor) => (
            <div
              key={mentor.id}
              className="mp-card"
              style={{ "--accent": mentor.color }}
              onClick={() => setSelectedMentor(mentor)}
            >
              {/* Top Row */}
              <div className="mp-card-top">
                <div className="mp-avatar" style={{ background: mentor.color }}>
                  {mentor.avatar}
                </div>
                <div className="mp-card-info">
                  <h3>{mentor.name}</h3>
                  <p>{mentor.title}</p>
                  <span className="mp-company-badge">
                    {mentor.companyLogo} {mentor.company}
                  </span>
                </div>
              </div>

              {/* Bio */}
              <p className="mp-bio">{mentor.bio}</p>

              {/* Stats */}
              <div className="mp-stats-row">
                <div className="mp-stat">
                  <span className="mp-stat-val gold">⭐ {mentor.rating}</span>
                  <span className="mp-stat-lbl">Rating</span>
                </div>
                <div className="mp-stat">
                  <span className="mp-stat-val">{mentor.students.toLocaleString()}</span>
                  <span className="mp-stat-lbl">Students</span>
                </div>
                <div className="mp-stat">
                  <span className="mp-stat-val">{mentor.experience}</span>
                  <span className="mp-stat-lbl">Experience</span>
                </div>
                <div className="mp-stat">
                  <span className="mp-stat-val">{mentor.sessions}</span>
                  <span className="mp-stat-lbl">Sessions</span>
                </div>
              </div>

              {/* Course Tags */}
              <div className="mp-course-tags">
                {mentor.courses.map((c) => (
                  <span key={c} className="mp-course-tag">{c}</span>
                ))}
              </div>

              {/* CTA */}
              <button className="mp-book-btn">View Profile & Book Session</button>
            </div>
          ))}
        </div>

        {/* ══ Modal ══ */}
        {selectedMentor && (
          <div
            className="mp-modal-overlay"
            onClick={() => setSelectedMentor(null)}
          >
            <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="mp-modal-close"
                onClick={() => setSelectedMentor(null)}
              >
                ✕
              </button>

              <div
                className="mp-modal-avatar"
                style={{ background: selectedMentor.color }}
              >
                {selectedMentor.avatar}
              </div>

              <h2>{selectedMentor.name}</h2>
              <p className="mp-modal-role">
                {selectedMentor.title} · {selectedMentor.company} ·{" "}
                {selectedMentor.experience} Exp.
              </p>

              <p className="mp-modal-bio">{selectedMentor.bio}</p>

              {/* Stats */}
              <div className="mp-modal-stats">
                <div className="mp-modal-stat">
                  <span className="mp-modal-stat-val">⭐{selectedMentor.rating}</span>
                  <span className="mp-modal-stat-lbl">Rating</span>
                </div>
                <div className="mp-modal-stat">
                  <span className="mp-modal-stat-val">{selectedMentor.students.toLocaleString()}</span>
                  <span className="mp-modal-stat-lbl">Students</span>
                </div>
                <div className="mp-modal-stat">
                  <span className="mp-modal-stat-val">{selectedMentor.sessions}</span>
                  <span className="mp-modal-stat-lbl">Sessions</span>
                </div>
                <div className="mp-modal-stat">
                  <span className="mp-modal-stat-val">{selectedMentor.experience}</span>
                  <span className="mp-modal-stat-lbl">Exp.</span>
                </div>
              </div>

              {/* Courses */}
              <div className="mp-modal-courses-label">Teaches</div>
              <div className="mp-course-tags">
                {selectedMentor.courses.map((c) => (
                  <span key={c} className="mp-course-tag">{c}</span>
                ))}
              </div>

              {/* Actions */}
              <div className="mp-modal-actions">
                <button className="mp-modal-btn-primary">📅 Book a Session</button>
                <button className="mp-modal-btn-secondary">💬 Message</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
