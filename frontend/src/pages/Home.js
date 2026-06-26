import React, { useState, useEffect, useCallback } from "react";
import "../styles/home.css";
import { useNavigate } from "react-router-dom";
import { IoSearchOutline } from "react-icons/io5";

import hero1 from "../assets/HeroBanner.jpg";
import hero2 from "../assets/HeroBanner2.jpg";
import hero3 from "../assets/HeroBanner3.jpg";

/* ── Data ─────────────────────────────────────────── */
const heroSlides = [
  {
    image: hero1,
    tag: "🚀 Industry-Led Training",
    title: (
      <>
        Helping you become outstanding by Making Tech{" "}
        <span className="hero-highlight">Unforgettable</span>
      </>
    ),
    desc: "Master in-demand IT skills with expert-led training from top engineers.",
    cta: "Start Learning",
    action: "courses",
  },
  {
    image: hero2,
    tag: "🌐 Learn Anywhere",
    title: (
      <>
        Learn <span className="hero-highlight">Tech Skills</span> From Anywhere
      </>
    ),
    desc: "Upskill on your own schedule with flexible live and recorded classes.",
    cta: "Browse Courses",
    action: "courses",
  },
  {
    image: hero3,
    tag: "🤝 Expert Guidance",
    title: (
      <>
        Work with <span className="hero-highlight">Industry Experts</span>
      </>
    ),
    desc: "Train with engineers actively working at top companies.",
    cta: "Meet Mentors",
    action: "mentors",
  },
];

const techSubjects = [
  "Java","JavaScript","HTML","CSS","Python","MERN Stack",
  "Cloud Computing","Automation Testing","Data Science","DSA","AI",
];

const stats = [
  { number: "5000+", label: "Impact on Students" },
  { number: "1.5M+", label: "Digitally Reached" },
  { number: "47M+",  label: "Viewers Globally" },
  { number: "15 LPA",label: "Highest CTC" },
];

const companyLogos = [
  "Tata", "PickMyAd", "Resulticks", "Eurofins", "Handbuilt Apps", "7 Eagles",
];

const programs = [
  {
    icon: "🧱",
    title: "Full Stack Web Development Bootcamp",
    desc: "Industry-led Full Stack Training designed to help you transition to the next phase of your career with a proven track record of success.",
    tags: ["HTML","CSS","JavaScript","TailwindCSS","ReactJS","NodeJS","ExpressJS","MongoDB"],
    tagColors: ["#FEF3C7","#DBEAFE","#FEF9C3","#CCFBF1","#EDE9FE","#DCFCE7","#E0F2FE","#D1FAE5"],
    tagTextColors: ["#92400E","#1E40AF","#854D0E","#0F766E","#6D28D9","#166534","#0E7490","#065F46"],
    badges: ["Online","4 Months","Placement Assistance","Live Mentor Support"],
    color: "#0E7490",
  },
  {
    icon: "☁️",
    title: "DevOps with AWS Cloud Bootcamp",
    desc: "DevOps with AWS Cloud Bootcamp offers industry-led training to fast-track your shift to high-demand cloud and automation roles.",
    tags: ["AWS","Docker","Kubernetes","CI/CD","Linux","Terraform"],
    tagColors: ["#FEF3C7","#DBEAFE","#DCFCE7","#FEE2E2","#F3F4F6","#EDE9FE"],
    tagTextColors: ["#92400E","#1E40AF","#166534","#991B1B","#374151","#6D28D9"],
    badges: ["Online","5 Months","Placement Assistance","Live Mentor Support"],
    color: "#7C3AED",
  },
  {
    icon: "🐍",
    title: "Python & Data Science Bootcamp",
    desc: "Gain hands-on expertise in Python programming, data analysis, machine learning, and data visualization with real projects.",
    tags: ["Python","NumPy","Pandas","Matplotlib","Scikit-learn","TensorFlow"],
    tagColors: ["#FEF3C7","#DBEAFE","#DCFCE7","#FEE2E2","#CCFBF1","#EDE9FE"],
    tagTextColors: ["#92400E","#1E40AF","#166534","#991B1B","#0F766E","#6D28D9"],
    badges: ["Online","3 Months","Placement Assistance","Live Mentor Support"],
    color: "#D97706",
  },
];

const features = [
  {
    title: "Simplified Teaching:",
    desc: "90% of our students love our easy-to-understand teaching methods.",
    bg: "#BBFACC",
  },
  {
    title: "24/7 Doubt Support",
    desc: "Get your doubts cleared anytime through various channels.",
    bg: "#FEF9C3",
  },
  {
    title: "Experienced Educators",
    desc: "Learn from experts who've worked at top companies like Zoho, Accenture, and Infosys.",
    bg: "#BFDBFE",
  },
  {
    title: "Placement Assistance:",
    desc: "Our programs include mock interviews, quizzes, internships, and live projects to prepare you for job placement.",
    bg: "#EDE9FE",
  },
];

const testimonials = [
  {
    text: "CEITCS completely transformed my career. Got placed at a top MNC within 3 months of completing the Full Stack course!",
    name: "Karthik R.",
    platform: "@Google",
    avatar: "KR",
    bg: "#0E7490",
  },
  {
    text: "The live sessions with industry mentors were priceless. I will plan to learn Python next for upgrade my skills. Thanks for the Error Makes Clever team.",
    name: "Velu Mani",
    platform: "@Google",
    avatar: "VM",
    bg: "#7C3AED",
  },
  {
    text: "They are awesome because they provide free python course in YouTube with interactive way of teaching. Everyone here motivates you!",
    name: "Mohammed Akmal",
    platform: "@Google",
    avatar: "MA",
    bg: "#D97706",
  },
  {
    text: "I have been working as a Tech Lead and Mentor for the past two years. We have a great atmosphere and a friendly team — it feels like heaven.",
    name: "Arjun",
    platform: "@Google",
    avatar: "AJ",
    bg: "#059669",
  },
  {
    text: "First of all, great appreciation from my side. This course taught programming in our native language for great understanding. The topics covered by EMC are truly vast and needed.",
    name: "Nakash Shafiey",
    platform: "@Google",
    avatar: "NS",
    bg: "#DC2626",
  },
  {
    text: "Error Makes Clever conducted an event that was a 10x value. I have learned so many takeaways from industry experts. Truly recommended.",
    name: "Sam",
    platform: "@Google",
    avatar: "SM",
    bg: "#0891B2",
  },
];

const communityAvatars = [
  { initials: "AK", bg: "#0E7490" },
  { initials: "PS", bg: "#7C3AED" },
  { initials: "RM", bg: "#D97706" },
  { initials: "SN", bg: "#059669" },
  { initials: "VK", bg: "#DC2626" },
  { initials: "DM", bg: "#0891B2" },
  { initials: "RJ", bg: "#6D28D9" },
  { initials: "MK", bg: "#0E7490" },
];

const footerCourses = ["Mern Stack","Data Science","DSA","Python","Java","GitHub","HTML","CSS","JavaScript","Cloud Computing"];
const footerQuickLinks = ["Home","Courses","Mentors"];
const footerCompany = ["Contact","Privacy Policy","Refund Policy","Terms Of Use","Student Reviews","Careers"];

/* ── Component ─────────────────────────────────────── */
function Home() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const goTo = useCallback((idx) => {
    if (transitioning) return;
    setTransitioning(true);
    setSlide(idx);
    setTimeout(() => setTransitioning(false), 650);
  }, [transitioning]);

  const next = useCallback(() => goTo((slide + 1) % heroSlides.length), [goTo, slide]);
  const prev = useCallback(() => goTo(slide === 0 ? heroSlides.length - 1 : slide - 1), [goTo, slide]);

  useEffect(() => {
    if (searchFocused) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, searchFocused]);

  function handleSearch(q) {
    const query = q ?? searchQuery;
    if (!query.trim()) { setResults([]); return; }
    setResults(techSubjects.filter(s => s.toLowerCase().includes(query.toLowerCase())));
  }

  function handleResultClick(subject) {
    navigate("/courses", { state: { selectedCourse: subject } });
  }

  return (
    <div className="home-container">

      {/* ════════ HERO ════════ */}
      <section className="hero-section">
        {heroSlides.map((s, i) => (
          <div
            key={i}
            className={`hero-slide${i === slide ? " hero-slide--active" : ""}`}
            style={{ backgroundImage: `url(${s.image})` }}
          >
            <div className="hero-overlay" />
            <div className="hero-content">
              <span className="hero-badge">{s.tag}</span>
              <h1 className="hero-title">{s.title}</h1>
              <p className="hero-desc">{s.desc}</p>

              {/* Stats */}
              <div className="hero-stats-row">
                {stats.map((st, idx) => (
                  <div key={idx} className="hero-stat">
                    <span className="hero-stat-num">{st.number}</span>
                    <span className="hero-stat-lbl">{st.label}</span>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="hero-search-wrap">
                <div className="hero-search-box">
                  <IoSearchOutline className="hero-search-icon" />
                  <input
                    type="text"
                    placeholder="Search skills, courses..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                    onKeyDown={e => e.key === "Enter" && navigate("/courses", { state: { selectedCourse: searchQuery } })}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => { setSearchFocused(false); setResults([]); }, 200)}
                  />
                  <button
                    className="hero-search-btn"
                    onClick={() => navigate("/courses", { state: { selectedCourse: searchQuery } })}
                  >
                    Find Courses
                  </button>
                </div>
                {results.length > 0 && searchFocused && (
                  <div className="search-dropdown">
                    {results.map(r => (
                      <div key={r} className="search-dropdown-item" onMouseDown={() => handleResultClick(r)}>
                        <IoSearchOutline style={{ opacity: 0.4, marginRight: 8 }} /> {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <button className="hero-arrow hero-arrow--left" onClick={prev}>&#10094;</button>
        <button className="hero-arrow hero-arrow--right" onClick={next}>&#10095;</button>

        <div className="hero-dots">
          {heroSlides.map((_, i) => (
            <button key={i} className={`hero-dot${i === slide ? " hero-dot--active" : ""}`} onClick={() => goTo(i)} />
          ))}
        </div>
      </section>

      {/* ════════ WHERE DO STUDENTS WORK ════════ */}
      <section className="companies-section">
        <p className="companies-label">Where do our students work?</p>
        <div className="companies-ticker-wrap">
          <div className="companies-ticker">
            {[...companyLogos, ...companyLogos].map((c, i) => (
              <div key={i} className="company-chip">{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ OUR PROGRAMS ════════ */}
      <section className="programs-section">
        <div className="section-container">
          <p className="section-overline">OUR PROGRAM</p>
          <h2 className="section-title-xl">
            Discover Our Premier, Top-Rated<br />Learning Program
          </h2>

          <div className="programs-list">
            {programs.map((p, i) => (
              <div key={i} className="program-card">
                <div className="program-card-top">
                  <div className="program-icon-wrap" style={{ background: p.color + "18" }}>
                    <span className="program-icon">{p.icon}</span>
                  </div>
                  <div className="program-card-info">
                    <h3 className="program-title">{p.title}</h3>
                    <p className="program-desc">{p.desc}</p>
                    <div className="program-tags">
                      {p.tags.map((tag, ti) => (
                        <span
                          key={ti}
                          className="program-tag"
                          style={{ background: p.tagColors[ti] || "#F3F4F6", color: p.tagTextColors[ti] || "#374151" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="program-card-bottom">
                  <div className="program-badges">
                    {p.badges.map((b, bi) => (
                      <span key={bi} className="program-badge">
                        <span className="program-badge-dot" />
                        {b}
                      </span>
                    ))}
                  </div>
                  <button
                    className="program-enroll-btn"
                    style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)` }}
                    onClick={() => navigate("/courses")}
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ TESTIMONIALS MASONRY ════════ */}
      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="testimonials-heading">Hear from students like you</h2>
          <div className="testimonials-masonry">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: t.bg }}>
                    {t.initials || t.avatar}
                  </div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>Rated by {t.platform}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FEATURES + COMMUNITY ════════ */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="features-title">Supercharge<br/>Your Learning</h2>
          <div className="features-pastel-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-pastel-card" style={{ background: f.bg }}>
                <h4 className="feature-pastel-title">{f.title}</h4>
                <p className="feature-pastel-desc">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Community */}
          <div className="community-block">
            <p className="community-overline">COMMUNITY</p>
            <h2 className="community-heading">Join a global movement.</h2>
            <p className="community-sub">
              Our vibrant community produces content, teaches courses, and leads events all over
            </p>
            <div className="community-avatars">
              {communityAvatars.map((a, i) => (
                <div key={i} className="community-avatar" style={{ background: a.bg }}>
                  {a.initials}
                </div>
              ))}
              <div className="community-avatar community-avatar--more">+2k</div>
            </div>
            <button className="community-join-btn" onClick={() => navigate("/register")}>
              Join Community →
            </button>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="home-footer">
        <div className="footer-brand-bg">
          <span className="footer-brand-text">CEITCS</span>
        </div>
        <div className="footer-content">
          <div className="footer-col">
            <h4>Our Courses</h4>
            {footerCourses.map((c, i) => <a key={i} href="/courses">{c}</a>)}
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            {footerQuickLinks.map((l, i) => <a key={i} href="/">{l}</a>)}
          </div>
          <div className="footer-col">
            <h4>CEITCS Academy</h4>
            {footerCompany.map((l, i) => <a key={i} href="/">{l}</a>)}
          </div>
          <div className="footer-col">
            <div className="footer-rating-card">
              <span className="footer-rating-stars">★★★★★</span>
              <span className="footer-rating-label">Google (4.8)</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 CEITCS Professional Academy</span>
          <div className="footer-bottom-links">
            <a href="/">Terms of Use</a>
            <a href="/">Privacy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;