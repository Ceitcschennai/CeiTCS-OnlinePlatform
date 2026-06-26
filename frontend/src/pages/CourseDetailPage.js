import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

// ─── HARDCODED COURSES (unchanged) ───────────────────────────────────────────
const courses = [
  {
    id: 1, name: "Java", icon: "☕", color: "#e67e22",
    tagline: "Build robust enterprise applications",
    description: "Master Java from the ground up — OOP, collections, concurrency, Spring Boot, and real-world project development.",
    duration: "12 Weeks", level: "Beginner to Advanced", lessons: 84, projects: 6,
    price: "₹", originalPrice: "₹",
    topics: ["Core Java & OOP Concepts","Data Structures & Algorithms","Java Collections Framework","Multithreading & Concurrency","Spring Boot & REST APIs","Database Integration (JDBC/JPA)","Unit Testing with JUnit","Real-world Project"],
    badge: "🔥 Most Popular",
    subjectKeywords: ["java"],
  },
  {
    id: 2, name: "JavaScript", icon: "⚡", color: "#f5a623",
    tagline: "The language of the web",
    description: "From fundamentals to advanced JS — closures, promises, async/await, ES6+, DOM manipulation, and modern JavaScript patterns used at top companies.",
    duration: "10 Weeks", level: "Beginner to Intermediate", lessons: 70, projects: 5,
    price: "₹", originalPrice: "₹",
    topics: ["JS Fundamentals & ES6+","DOM Manipulation","Async JS & Promises","Fetch API & REST","Closures & Prototypes","Event Loop Deep Dive","Error Handling","Mini Projects"],
    badge: "⭐ Top Rated",
    subjectKeywords: ["javascript", "js"],
  },
  {
    id: 3, name: "HTML", icon: "🌐", color: "#e74c3c",
    tagline: "The backbone of the web",
    description: "Master semantic HTML5, accessibility best practices, forms, media embedding, and SEO-friendly markup.",
    duration: "4 Weeks", level: "Beginner", lessons: 28, projects: 3,
    price: "₹", originalPrice: "₹",
    topics: ["HTML5 Structure & Semantics","Forms & Validation","Media & Embedding","Accessibility & ARIA","SEO Basics","HTML Best Practices"],
    badge: "🚀 Quick Start",
    subjectKeywords: ["html"],
  },
  {
    id: 4, name: "CSS", icon: "🎨", color: "#2980b9",
    tagline: "Style the world with code",
    description: "Go from basic styling to advanced CSS with Flexbox, Grid, animations, responsive design, and CSS variables.",
    duration: "6 Weeks", level: "Beginner to Intermediate", lessons: 40, projects: 4,
    price: "₹", originalPrice: "₹",
    topics: ["CSS Fundamentals","Flexbox & Grid","Responsive Design","CSS Variables","Animations & Transitions","CSS Architecture (BEM)","Dark Mode Implementation"],
    badge: null,
    subjectKeywords: ["css"],
  },
  {
    id: 5, name: "Python", icon: "🐍", color: "#27ae60",
    tagline: "Versatile, powerful, in-demand",
    description: "Learn Python for web development, automation, data science, and scripting.",
    duration: "10 Weeks", level: "Beginner to Advanced", lessons: 72, projects: 5,
    price: "₹", originalPrice: "₹",
    topics: ["Python Basics & OOP","File Handling & I/O","Libraries: NumPy, Pandas","Web Scraping","Django Fundamentals","REST API Development","Automation Scripts","Data Pipelines"],
    badge: "🔥 Trending",
    subjectKeywords: ["python"],
  },
  {
    id: 6, name: "MERN Stack", icon: "⚛️", color: "#6c63ff",
    tagline: "Full-stack mastery in one course",
    description: "Build complete web apps with MongoDB, Express, React, and Node.js.",
    duration: "16 Weeks", level: "Intermediate to Advanced", lessons: 112, projects: 8,
    price: "₹", originalPrice: "₹",
    topics: ["React & Hooks","Node.js & Express","MongoDB & Mongoose","REST API Design","JWT Authentication","Redux State Management","File Uploads","Deployment (Vercel/Render)"],
    badge: "🏆 Premium",
    subjectKeywords: ["mern", "react", "node", "mongodb"],
  },
  {
    id: 7, name: "Cloud Computing", icon: "☁️", color: "#1abc9c",
    tagline: "Scale globally with the cloud",
    description: "Master AWS core services — EC2, S3, Lambda, RDS, VPC, and CloudFormation.",
    duration: "12 Weeks", level: "Intermediate", lessons: 88, projects: 6,
    price: "₹", originalPrice: "₹",
    topics: ["AWS Fundamentals","EC2 & Auto Scaling","S3 & CloudFront","Lambda & Serverless","RDS & DynamoDB","VPC & Networking","CloudFormation / IaC","Certification Prep"],
    badge: "☁️ High Demand",
    subjectKeywords: ["cloud", "aws"],
  },
  {
    id: 8, name: "Automation Testing", icon: "🤖", color: "#e74c3c",
    tagline: "Test smarter, ship faster",
    description: "Learn end-to-end automation with Selenium, TestNG, Appium, and CI/CD integration.",
    duration: "10 Weeks", level: "Intermediate", lessons: 66, projects: 5,
    price: "₹", originalPrice: "₹",
    topics: ["Manual Testing Fundamentals","Selenium WebDriver","TestNG Framework","Page Object Model","API Testing with Postman","Appium (Mobile Testing)","CI/CD with Jenkins","Test Reports"],
    badge: null,
    subjectKeywords: ["testing", "automation", "selenium", "qa"],
  },
  {
    id: 9, name: "Data Science", icon: "📊", color: "#8e44ad",
    tagline: "Turn data into decisions",
    description: "Master the data science lifecycle — data wrangling, EDA, visualization, machine learning, and model deployment.",
    duration: "14 Weeks", level: "Beginner to Advanced", lessons: 98, projects: 7,
    price: "₹", originalPrice: "₹",
    topics: ["Python for Data Science","Pandas & NumPy","Data Visualization","Exploratory Data Analysis","Machine Learning Basics","Scikit-learn","Model Evaluation","Capstone Project"],
    badge: "📈 Career Booster",
    subjectKeywords: ["data science", "data", "ml", "machine learning"],
  },
  {
    id: 10, name: "DSA", icon: "🧩", color: "#e67e22",
    tagline: "Crack any coding interview",
    description: "Deep-dive into Data Structures & Algorithms. Arrays, trees, graphs, dynamic programming.",
    duration: "14 Weeks", level: "Intermediate to Advanced", lessons: 100, projects: 0,
    price: "₹", originalPrice: "₹",
    topics: ["Arrays & Strings","Linked Lists & Stacks","Trees & Graphs","Recursion & Backtracking","Dynamic Programming","Greedy Algorithms","Binary Search","Mock Interviews"],
    badge: "🎯 Interview Prep",
    subjectKeywords: ["dsa", "algorithms", "data structures"],
  },
  {
    id: 11, name: "AI", icon: "🧠", color: "#9b59b6",
    tagline: "Build the future with AI",
    description: "From machine learning theory to LLMs — build intelligent systems with TensorFlow, PyTorch, NLP pipelines.",
    duration: "16 Weeks", level: "Advanced", lessons: 110, projects: 7,
    price: "₹", originalPrice: "₹",
    topics: ["ML Fundamentals","Neural Networks","TensorFlow & PyTorch","Computer Vision (CNN)","NLP & Transformers","LLMs & Fine-tuning","RAG Applications","Generative AI Projects"],
    badge: "🤖 Future-Proof",
    subjectKeywords: ["ai", "artificial intelligence", "deep learning"],
  },
<<<<<<< HEAD
  {
  id: 12,
  name: "Career Coaching",
  icon: "🎯",
  color: "#16a085",

  tagline: "Unlock your full career potential",

  description:
    "A comprehensive career coaching program covering SDLC, career development, interview preparation, communication skills, wellbeing coaching, and live mock interviews to prepare candidates for real-world opportunities.",

  duration: "4 Sessions",
  level: "Beginner to Advanced",
  lessons: 24,
  projects: 4,

  price: "₹",
  originalPrice: "₹",

  topics: [
    "Career Development Coaching",
    "Career Goal Setting",
    "Professional Skill Development",
    "Workplace Productivity",
    "Interview Coaching",
    "Resume Preparation",
    "Communication Skills",
    "Interview Dos & Don'ts",
    "Software Development Life Cycle (SDLC)",
    "Real-Time Industry Experience",
    "Requirement Analysis",
    "System Design Basics",
    "Development Process",
    "Software Testing Fundamentals",
    "Deployment & Maintenance",
    "Wellbeing Coaching",
    "Stress Management",
    "Work-Life Balance",
    "Confidence Building",
    "Professional Etiquette",
    "Mock Interview Session 1",
    "Mock Interview Session 2",
    "Performance Evaluation & Feedback",
    "Career Roadmap & Placement Guidance"
  ],

  badge: "🚀 Career Booster",

  subjectKeywords: [
    "career coaching",
    "career development",
    "career guidance",
    "interview coaching",
    "interview preparation",
    "mock interview",
    "resume building",
    "soft skills",
    "communication skills",
    "professional development",
    "wellbeing coaching",
    "stress management",
    "work life balance",
    "confidence building",
    "placement preparation",
    "job readiness",
    "career planning",
    "software development life cycle",
    "sdlc",
    "real time experience"
  ]
  },

  {
  id: 13,
  name: "Interview Coaching",
  icon: "🎤",
  color: "#e67e22",

  tagline: "Ace every interview with confidence",

  description:
    "Prepare for technical, HR, and behavioral interviews through structured coaching, real-time mock interviews, communication enhancement, resume guidance, and expert feedback.",

  duration: "4 Weeks",
  level: "Beginner to Advanced",
  lessons: 20,
  projects: 2,

  price: "₹",
  originalPrice: "₹",

  topics: [
    "Introduction to Interviews",
    "Resume & LinkedIn Optimization",
    "Interview Dos & Don'ts",
    "HR Interview Preparation",
    "Technical Interview Preparation",
    "Behavioral Interview Questions",
    "Communication Skills",
    "Body Language & Professional Etiquette",
    "Common Interview Mistakes",
    "Problem Solving Techniques",
    "Group Discussion Skills",
    "Presentation Skills",
    "Confidence Building",
    "Salary Negotiation",
    "Real-Time Mock Interview 1",
    "Real-Time Mock Interview 2",
    "Expert Feedback & Evaluation",
    "Personal Improvement Plan",
    "Placement Readiness",
    "Career Guidance"
  ],

  badge: "🎤 Interview Ready",

  subjectKeywords: [
    "interview",
    "interview coaching",
    "technical interview",
    "hr interview",
    "behavioral interview",
    "mock interview",
    "resume",
    "linkedin",
    "communication",
    "group discussion",
    "presentation",
    "confidence",
    "salary negotiation",
    "placement",
    "career guidance",
    "job preparation"
  ]
  },
  {
  id: 14,
  name: "Wellbeing Coaching",
  icon: "💚",
  color: "#27ae60",

  tagline: "Achieve balance, confidence, and productivity",

  description:
    "Improve your personal and professional wellbeing by managing stress, maintaining work-life balance, building resilience, and developing healthy habits for long-term success.",

  duration: "4 Weeks",
  level: "Beginner to Advanced",
  lessons: 18,
  projects: 2,

  price: "₹",
  originalPrice: "₹",

  topics: [
    "Introduction to Wellbeing",
    "Stress Management",
    "Work-Life Balance",
    "Mental Wellness",
    "Emotional Intelligence",
    "Time Management",
    "Productivity Techniques",
    "Healthy Lifestyle Habits",
    "Mindfulness & Meditation",
    "Confidence Building",
    "Positive Thinking",
    "Communication & Relationships",
    "Leadership Mindset",
    "Burnout Prevention",
    "Goal Setting",
    "Personal Development Plan",
    "Professional Growth",
    "Long-Term Wellbeing Strategy"
  ],

  badge: "💚 Wellness",

  subjectKeywords: [
    "wellbeing",
    "wellbeing coaching",
    "mental health",
    "stress management",
    "work life balance",
    "mindfulness",
    "meditation",
    "emotional intelligence",
    "confidence",
    "productivity",
    "time management",
    "healthy lifestyle",
    "burnout prevention",
    "personal development",
    "professional growth",
    "wellness"
  ]
  },
  {
  id: 15,
  name: "SDLC Fundamentals",
  icon: "⚙️",
  color: "#3498db",

  tagline: "Learn the complete Software Development Life Cycle",

  description:
    "Gain a practical understanding of the Software Development Life Cycle (SDLC) through real-time industry workflows, project execution, and software engineering best practices.",

  duration: "2 Weeks",
  level: "Beginner",
  lessons: 16,
  projects: 1,

  price: "₹",
  originalPrice: "₹",

  topics: [
    "Introduction to SDLC",
    "Software Development Process",
    "Requirement Gathering",
    "Requirement Analysis",
    "Project Planning",
    "System Design",
    "Architecture Basics",
    "Development Phase",
    "Coding Standards",
    "Software Testing",
    "Deployment Process",
    "Maintenance & Support",
    "Agile Methodology",
    "Waterfall Model",
    "Real-Time Industry Workflow",
    "Case Study & Practical Walkthrough"
  ],

  badge: "💼 Industry Ready",

  subjectKeywords: [
    "sdlc",
    "software development life cycle",
    "software engineering",
    "agile",
    "waterfall",
    "requirement analysis",
    "system design",
    "software testing",
    "deployment",
    "maintenance",
    "real time project",
    "industry workflow",
    "software process",
    "project lifecycle"
  ]
  },
  {
  id: 16,
  name: "Interview Preparation",
  icon: "💼",
  color: "#e67e22",

  tagline: "Prepare to crack every interview",

  description:
    "Master technical, HR, and behavioral interviews with expert guidance. Learn interview strategies, communication skills, resume building, and real-time interview techniques to confidently secure your dream job.",

  duration: "2 Weeks",
  level: "Beginner to Advanced",
  lessons: 18,
  projects: 2,

  price: "₹",
  originalPrice: "₹",

  topics: [
    "Interview Fundamentals",
    "Resume Building",
    "Resume Review",
    "HR Interview Questions",
    "Technical Interview Questions",
    "Behavioral Interview Questions",
    "Communication Skills",
    "Body Language",
    "Interview Etiquette",
    "Problem Solving Techniques",
    "Aptitude Preparation",
    "Logical Reasoning",
    "Group Discussion",
    "Presentation Skills",
    "Common Interview Mistakes",
    "Salary Negotiation",
    "Placement Readiness",
    "Expert Interview Tips"
  ],

  badge: "🎯 Interview Ready",

  subjectKeywords: [
    "interview preparation",
    "technical interview",
    "hr interview",
    "behavioral interview",
    "resume building",
    "resume review",
    "communication skills",
    "body language",
    "group discussion",
    "aptitude",
    "logical reasoning",
    "placement",
    "job preparation",
    "career guidance",
    "interview coaching"
  ]
  },
  {
  id: 17,
  name: "Mock Interview - Session 1",
  icon: "🗣️",
  color: "#8e44ad",

  tagline: "Experience a real technical interview",

  description:
    "Participate in a real-time mock interview designed to simulate actual recruitment processes. Improve your technical knowledge, communication, confidence, and problem-solving skills through expert evaluation and personalized feedback.",

  duration: "1 Week",
  level: "Intermediate",
  lessons: 12,
  projects: 1,

  price: "₹",
  originalPrice: "₹",

  topics: [
    "Mock Interview Introduction",
    "Technical Assessment",
    "Programming Questions",
    "Database & SQL Questions",
    "Web Development Questions",
    "Problem Solving",
    "Coding Round Simulation",
    "HR Round Simulation",
    "Communication Assessment",
    "Confidence Building",
    "Performance Evaluation",
    "Expert Feedback"
  ],

  badge: "🎤 Live Assessment",

  subjectKeywords: [
    "mock interview",
    "technical interview",
    "coding interview",
    "hr interview",
    "live interview",
    "performance evaluation",
    "feedback",
    "communication",
    "problem solving",
    "technical assessment",
    "career preparation",
    "placement"
  ]
},
  

=======
>>>>>>> 76e0e2b040f956a52cde077d882a277d04a60c15
];

// ─── Avatar color palette for backend faculty ────────────────────────────────
const avatarColors = [
  "#6c63ff", "#e67e22", "#27ae60", "#8e44ad",
  "#e74c3c", "#2980b9", "#1abc9c", "#d35400"
];

// ─── Helper: get initials from name ──────────────────────────────────────────
function getInitials(firstName = "", lastName = "") {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

// ─── Helper: match faculty to course by preferredSubjects ────────────────────
function filterFacultyForCourse(facultyList, course) {
  if (!facultyList || facultyList.length === 0) return [];
  const keywords = course.subjectKeywords || [course.name.toLowerCase()];
  const matched = facultyList.filter((f) => {
    const subjects = (f.preferredSubjects || []).map((s) => s.toLowerCase());
    return subjects.some((s) =>
      keywords.some((kw) => s.includes(kw) || kw.includes(s))
    );
  });
  // If no subject match, show all faculty (fallback)
  return matched.length > 0 ? matched : facultyList;
}

// ─── Course Detail View ───────────────────────────────────────────────────────
function CourseDetail({ course, onBack, facultyList, facultyLoading, navigate }) {
  const [activeTab, setActiveTab] = useState("curriculum");

  const savePercent = Math.round(
    (1 -
      parseInt(course.price.replace(/[^\d]/g, "")) /
        parseInt(course.originalPrice.replace(/[^\d]/g, ""))) *
      100
  );

  // ✅ Filter approved faculty relevant to this course
  const courseFaculty = filterFacultyForCourse(facultyList, course);

  return (
    <>
      <style>{detailStyles}</style>
      <div className="cd-page">

        {/* ── Hero Banner ── */}
        <div className="cd-hero">
          <button className="cd-back-btn" onClick={onBack}>← Back to Courses</button>
          <div className="cd-hero-inner">

            {/* LEFT */}
            <div className="cd-left">
              {course.badge && <div className="cd-badge">{course.badge}</div>}
              <div className="cd-icon">{course.icon}</div>
              <h1 className="cd-title">{course.name}</h1>
              <p className="cd-tagline">{course.tagline}</p>
              <p className="cd-desc">{course.description}</p>

              <div className="cd-stats-row">
                <div className="cd-stat">
                  <span className="cd-stat-val">⭐ 4.8</span>
                  <span className="cd-stat-lbl">RATING</span>
                </div>
                <div className="cd-stat">
                  <span className="cd-stat-val">{course.lessons}</span>
                  <span className="cd-stat-lbl">LESSONS</span>
                </div>
                <div className="cd-stat">
                  <span className="cd-stat-val">{course.duration}</span>
                  <span className="cd-stat-lbl">DURATION</span>
                </div>
                {course.projects > 0 && (
                  <div className="cd-stat">
                    <span className="cd-stat-val">{course.projects}</span>
                    <span className="cd-stat-lbl">PROJECTS</span>
                  </div>
                )}
              </div>

              <div className="cd-level-badge">{course.level}</div>
            </div>

            {/* RIGHT — Enrollment Card */}
            <div className="cd-right">
              <div className="cd-enroll-card">
                <div className="cd-price">{course.price}</div>
                <div className="cd-orig-price">{course.originalPrice}</div>
                <div className="cd-save-badge">Save {savePercent}%</div>
                <button className="cd-enroll-btn" onClick={() => {
                  const selectedCourse = {
                    courseId: course.id,
                    courseName: course.name,
                    price: course.price
                  };
                  localStorage.setItem("selectedCourseForEnrollment", JSON.stringify(selectedCourse));
                  navigate("/register");
                }}>🚀 Enroll Now</button>
                <button className="cd-trial-btn">Try Free Preview</button>
                <div className="cd-includes">
                  <div className="cd-include-item">✅ Lifetime Access</div>
                  <div className="cd-include-item">✅ Certificate of Completion</div>
                  <div className="cd-include-item">✅ 1:1 Mentor Sessions</div>
                  <div className="cd-include-item">✅ Project Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="cd-tabs-bar">
          {["curriculum", "mentors"].map((tab) => (
            <button
              key={tab}
              className={`cd-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "curriculum" ? "📋 Curriculum" : "👨‍🏫 Mentors"}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="cd-tab-content">

          {activeTab === "curriculum" && (
            <div className="cd-content-section">
              <div className="cd-section-header">
                <span className="cd-section-icon">📋</span>
                <h2>What You'll Learn</h2>
              </div>
              <div className="cd-topics-grid">
                {course.topics.map((t, i) => (
                  <div key={i} className="cd-topic-item">
                    <span className="cd-topic-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="cd-topic-text">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ MENTORS TAB — now shows real backend faculty */}
          {activeTab === "mentors" && (
            <div className="cd-content-section">
              <div className="cd-section-header">
                <span className="cd-section-icon">👨‍🏫</span>
                <h2>Your Mentors</h2>
              </div>
              <p className="cd-section-sub">
                Learn directly from our registered and approved faculty members
              </p>

              {facultyLoading ? (
                <div className="cd-faculty-loading">Loading faculty...</div>
              ) : courseFaculty.length === 0 ? (
                <div className="cd-faculty-empty">
                  No faculty assigned for this course yet.
                </div>
              ) : (
                <div className="cd-mentors-grid">
                  {courseFaculty.map((faculty, index) => (
                    <div key={faculty._id} className="cd-mentor-card">
                      <div
                        className="cd-mentor-avatar"
                        style={{ background: avatarColors[index % avatarColors.length] }}
                      >
                        {getInitials(faculty.firstName, faculty.lastName)}
                      </div>
                      <div className="cd-mentor-info">
                        <h3>
                          {faculty.salutation} {faculty.firstName} {faculty.lastName}
                        </h3>
                        <p className="cd-mentor-role">
                          {faculty.preferredSubjects?.join(", ") || "Faculty"}
                        </p>
                        <div className="cd-mentor-stats">
                          <span>📧 {faculty.email}</span>
                          {faculty.timezone && (
                            <span>🕐 {faculty.timezone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Courses List View (unchanged) ───────────────────────────────────────────
function CoursesList({ onSelectCourse }) {
  return (
    <>
      <style>{listStyles}</style>
      <div className="cl-page">
        <div className="cl-hero">
          <div className="cl-hero-badge">🎓 All Courses</div>
          <h1 className="cl-title">Learn <span>Tech Skills</span> From Anywhere</h1>
          <p className="cl-sub">Upskill on your own schedule with flexible online classes.</p>
        </div>

        <div className="cl-grid">
          {courses.map((course) => (
            <div
              key={course.id}
              className="cl-card"
              style={{ "--c": course.color }}
              onClick={() => onSelectCourse(course.id)}
            >
              {course.badge && <div className="cl-badge">{course.badge}</div>}
              <div className="cl-card-icon">{course.icon}</div>
              <h3 className="cl-card-name">{course.name}</h3>
              <p className="cl-card-tagline">{course.tagline}</p>
              <div className="cl-card-meta">
                <span>📅 {course.duration}</span>
                <span>📖 {course.lessons} Lessons</span>
                <span>🎓 {course.level}</span>
              </div>
              <div className="cl-price-row">
                <span className="cl-price">{course.price}</span>
                <span className="cl-orig-price">{course.originalPrice}</span>
                <button className="cl-view-btn">View Course →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const location = useLocation();
  const navigate  = useNavigate();

  const incomingCourse = location.state?.selectedCourse;

  const [selectedCourseId, setSelectedCourseId] = useState(() => {
    if (incomingCourse) {
      const found = courses.find(
        (c) => c.name.toLowerCase() === incomingCourse.toLowerCase()
      );
      return found ? found.id : null;
    }
    return null;
  });

  // ✅ NEW: fetch approved faculty from backend
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(true);

  useEffect(() => {
    const fetchApprovedFaculty = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/teacher/approved`);
        const data = await res.json();
        if (data.success) {
          setFacultyList(data.teachers);
        }
      } catch (err) {
        console.error("Failed to fetch faculty:", err);
      } finally {
        setFacultyLoading(false);
      }
    };

    fetchApprovedFaculty();
  }, []);

  useEffect(() => {
    if (incomingCourse) {
      const found = courses.find(
        (c) => c.name.toLowerCase() === incomingCourse.toLowerCase()
      );
      if (found) setSelectedCourseId(found.id);
    }
  }, [incomingCourse]);

  useEffect(() => {
    if (selectedCourseId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCourseId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  function handleBack() {
    setSelectedCourseId(null);
    navigate("/courses", { replace: true, state: {} });
  }

  return selectedCourse ? (
    <CourseDetail
      course={selectedCourse}
      onBack={handleBack}
      facultyList={facultyList}
      facultyLoading={facultyLoading}
      navigate={navigate}
    />
  ) : (
    <CoursesList onSelectCourse={setSelectedCourseId} />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES — unchanged from original
// ════════════════════════════════════════════════════════════════════════════
const base = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; background: #f4f6f9; color: #1a1a2e; }
`;

const detailStyles = base + `

  .cd-page {
    min-height: 100vh;
    background: #f4f6f9;
    font-family: 'Nunito', sans-serif;
  }

  .cd-hero {
    background: linear-gradient(135deg, #1a9e8f 0%, #0e7a6e 40%, #14b8a6 100%);
    margin: 24px 32px 32px;
    border-radius: 16px;
    padding: 36px 40px 44px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(20, 184, 166, 0.25);
  }

  .cd-hero::after {
    content: '';
    position: absolute;
    top: -50px; right: -50px;
    width: 240px; height: 240px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    pointer-events: none;
  }

  .cd-hero::before {
    content: '';
    position: absolute;
    bottom: -70px; right: 80px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: rgba(255,255,255,0.05);
    pointer-events: none;
  }

  .cd-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.2);
    border: 1.5px solid rgba(255,255,255,0.35);
    color: #fff;
    padding: 7px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 28px;
    transition: background 0.2s;
    font-family: 'Nunito', sans-serif;
  }
  .cd-back-btn:hover { background: rgba(255,255,255,0.32); }

  .cd-hero-inner {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 40px;
    align-items: start;
  }

  .cd-badge {
    display: inline-block;
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.35);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }

  .cd-icon { font-size: 52px; margin-bottom: 12px; display: block; }

  .cd-title {
    font-family: 'Nunito', sans-serif;
    font-size: clamp(32px, 4vw, 52px);
    font-weight: 800;
    color: #fff;
    margin-bottom: 6px;
    line-height: 1.1;
  }

  .cd-tagline {
    color: rgba(255,255,255,0.85);
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 14px;
  }

  .cd-desc {
    color: rgba(255,255,255,0.75);
    font-size: 14px;
    line-height: 1.75;
    max-width: 540px;
    margin-bottom: 24px;
  }

  .cd-stats-row {
    display: flex;
    gap: 28px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .cd-stat { display: flex; flex-direction: column; gap: 3px; }

  .cd-stat-val {
    font-family: 'Nunito', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
  }

  .cd-stat-lbl {
    font-size: 10px;
    color: rgba(255,255,255,0.6);
    letter-spacing: 1px;
    font-weight: 600;
  }

  .cd-level-badge {
    display: inline-block;
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.3);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 16px;
    border-radius: 8px;
  }

  .cd-enroll-card {
    background: #fff;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    position: sticky;
    top: 20px;
  }

  .cd-price {
    font-family: 'Nunito', sans-serif;
    font-size: 36px;
    font-weight: 800;
    color: #d97706;
    margin-bottom: 4px;
  }

  .cd-orig-price {
    font-size: 15px;
    color: #aaa;
    text-decoration: line-through;
    margin-bottom: 8px;
  }

  .cd-save-badge {
    display: inline-block;
    background: rgba(20,184,166,0.12);
    border: 1px solid rgba(20,184,166,0.3);
    color: #0e9e8a;
    font-size: 13px;
    font-weight: 700;
    padding: 3px 14px;
    border-radius: 20px;
    margin-bottom: 20px;
  }

  .cd-enroll-btn {
    width: 100%;
    padding: 14px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #6c63ff, #5a52d5);
    color: #fff;
    font-family: 'Nunito', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s;
    margin-bottom: 10px;
  }
  .cd-enroll-btn:hover {
    box-shadow: 0 8px 24px rgba(108,99,255,0.45);
    transform: translateY(-1px);
  }

  .cd-trial-btn {
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: 1.5px solid #ddd;
    background: #fff;
    color: #555;
    font-family: 'Nunito', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 20px;
  }
  .cd-trial-btn:hover { border-color: #0e9e8a; color: #0e9e8a; }

  .cd-includes { display: flex; flex-direction: column; gap: 10px; }

  .cd-include-item {
    font-size: 13px;
    color: #444;
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cd-include-item:last-child { border-bottom: none; }

  .cd-tabs-bar {
    display: flex;
    padding: 0 32px;
    border-bottom: 1.5px solid #e8e8ee;
    background: #fff;
    max-width: 100%;
  }

  .cd-tab-btn {
    padding: 16px 28px;
    border: none;
    background: transparent;
    color: #999;
    font-family: 'Nunito', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2.5px solid transparent;
    margin-bottom: -1.5px;
    transition: all 0.2s;
  }
  .cd-tab-btn:hover { color: #1a1a2e; }
  .cd-tab-btn.active { color: #0e9e8a; border-bottom-color: #0e9e8a; }

  .cd-tab-content {
    padding: 28px 32px 60px;
  }

  .cd-content-section {
    background: #fff;
    border-radius: 16px;
    padding: 28px 32px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    margin-bottom: 24px;
  }

  .cd-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1.5px solid #f0f0f0;
  }

  .cd-section-icon { font-size: 22px; color: #0e9e8a; }

  .cd-section-header h2 {
    font-family: 'Nunito', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #1a1a2e;
  }

  .cd-section-sub { color: #888; font-size: 14px; margin-bottom: 20px; }

  .cd-topics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
    margin-top: 8px;
  }

  .cd-topic-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: #f8fffe;
    border: 1px solid #e0f5f2;
    border-radius: 10px;
    transition: all 0.2s;
    cursor: default;
  }
  .cd-topic-item:hover {
    background: rgba(20,184,166,0.07);
    border-color: #0e9e8a;
    transform: translateX(4px);
  }

  .cd-topic-num {
    font-family: 'Nunito', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #0e9e8a;
    min-width: 26px;
  }

  .cd-topic-text { font-size: 14px; color: #333; font-weight: 500; }

  .cd-mentors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    margin-top: 8px;
  }

  .cd-mentor-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: #f8fffe;
    border: 1px solid #e0f5f2;
    border-radius: 12px;
    transition: all 0.2s;
  }
  .cd-mentor-card:hover {
    border-color: #0e9e8a;
    box-shadow: 0 4px 16px rgba(14,158,138,0.12);
    transform: translateY(-2px);
  }

  .cd-mentor-avatar {
    width: 56px; height: 56px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Nunito', sans-serif;
    font-size: 18px; font-weight: 700; color: #fff;
    flex-shrink: 0;
  }

  .cd-mentor-info h3 {
    font-family: 'Nunito', sans-serif;
    font-size: 16px; font-weight: 700; margin-bottom: 3px; color: #1a1a2e;
  }

  .cd-mentor-role { color: #888; font-size: 12px; margin-bottom: 8px; }

  .cd-mentor-stats { display: flex; gap: 8px; flex-wrap: wrap; }
  .cd-mentor-stats span {
    font-size: 11px; color: #555;
    background: #f0f0f5;
    padding: 3px 10px; border-radius: 20px;
  }

  /* ✅ NEW: loading & empty states */
  .cd-faculty-loading,
  .cd-faculty-empty {
    text-align: center;
    padding: 40px 20px;
    color: #888;
    font-size: 15px;
    font-weight: 500;
  }

  .cd-faculty-loading::before { content: "⏳ "; }
  .cd-faculty-empty::before  { content: "👨‍🏫 "; }

  @media (max-width: 900px) {
    .cd-hero { margin: 16px 16px 24px; padding: 28px 20px 36px; }
    .cd-hero-inner { grid-template-columns: 1fr; }
    .cd-enroll-card { position: static; }
    .cd-tabs-bar { padding: 0 16px; overflow-x: auto; }
    .cd-tab-content { padding: 20px 16px 50px; }
    .cd-content-section { padding: 20px 18px; }
  }
`;

const listStyles = base + `

  .cl-page {
    min-height: 100vh;
    background: #f4f6f9;
  }

  .cl-hero {
    text-align: center;
    padding: 60px 20px 36px;
    background: linear-gradient(135deg, #1a9e8f 0%, #0e7a6e 40%, #14b8a6 100%);
    margin: 24px 32px 32px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(20,184,166,0.25);
  }

  .cl-hero-badge {
    display: inline-block;
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.35);
    color: #fff;
    padding: 5px 18px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .cl-title {
    font-family: 'Nunito', sans-serif;
    font-size: clamp(28px, 4vw, 46px);
    font-weight: 800;
    color: #fff;
    margin-bottom: 10px;
  }

  .cl-title span { color: rgba(255,255,255,0.75); }

  .cl-sub { color: rgba(255,255,255,0.8); font-size: 15px; }

  .cl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 20px;
    padding: 0 32px 60px;
    max-width: 1300px;
    margin: 0 auto;
  }

  .cl-card {
    background: #fff;
    border: 1.5px solid #eaeaf0;
    border-radius: 16px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }

  .cl-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: var(--c);
    transform: scaleX(0);
    transition: transform 0.3s ease;
    transform-origin: left;
  }

  .cl-card:hover {
    transform: translateY(-5px);
    border-color: #0e9e8a;
    box-shadow: 0 12px 36px rgba(20,184,166,0.15);
  }

  .cl-card:hover::after { transform: scaleX(1); }

  .cl-badge {
    position: absolute; top: 14px; right: 14px;
    background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.3);
    color: #d97706;
    font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 20px;
  }

  .cl-card-icon { font-size: 36px; margin-bottom: 12px; display: block; }

  .cl-card-name {
    font-family: 'Nunito', sans-serif;
    font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 5px;
  }

  .cl-card-tagline { color: #888; font-size: 13px; margin-bottom: 14px; line-height: 1.5; }

  .cl-card-meta { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }

  .cl-card-meta span {
    font-size: 12px; color: #666;
    background: #f4f6f9;
    padding: 3px 10px; border-radius: 20px;
    border: 1px solid #eaeaf0;
  }

  .cl-price-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  .cl-price {
    font-family: 'Nunito', sans-serif;
    font-size: 20px; font-weight: 700; color: #d97706;
  }

  .cl-orig-price { font-size: 13px; color: #aaa; text-decoration: line-through; }

  .cl-view-btn {
    margin-left: auto;
    padding: 7px 14px; border-radius: 8px;
    border: 1.5px solid #0e9e8a;
    background: transparent; color: #0e9e8a;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.2s; font-family: 'Nunito', sans-serif;
  }
  .cl-view-btn:hover { background: #0e9e8a; color: #fff; }

  @media (max-width: 768px) {
    .cl-hero { margin: 16px 16px 24px; }
    .cl-grid { padding: 0 16px 50px; grid-template-columns: 1fr; }
  }
`;