import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaBook, FaArrowLeft, FaPlayCircle, FaFileAlt, FaClipboardList,
  FaDownload, FaClock, FaStar, FaEye, FaUpload, FaCheckCircle,
  FaTimes, FaChevronLeft, FaChevronRight, FaPlay, FaPause,
  FaVolumeUp, FaVolumeMute, FaCheck, FaExclamationCircle,
  FaEdit, FaTrash
} from 'react-icons/fa';
import '../styles/subjects.css';

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// PDF VIEWER MODAL
// ─────────────────────────────────────────────────────────────────────────────
const PDFViewerModal = ({ material, onClose }) => {
  const totalPages = parseInt(material.duration) || 15;
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.pdfBox} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={ms.pdfHeader}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <FaFileAlt style={{ color:'#0d9488' }} />
            <span style={ms.modalTitle}>{material.title}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:'0.85rem', color:'#6b7280' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button style={ms.closeBtn} onClick={onClose}><FaTimes /></button>
          </div>
        </div>

        {/* PDF Content */}
        <div style={ms.pdfContent}>
          {material.fileUrl ? (
            // ✅ Real PDF from Cloudinary renders here
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(material.fileUrl)}&embedded=true`}
              style={{ width:'100%', height:'520px', border:'none', borderRadius:8 }}
              title={material.title}
            />
          ) : (
            <div style={ms.placeholder}>
              <FaFileAlt style={{ fontSize:64, color:'#0d9488', marginBottom:16, opacity:0.6 }} />
              <h3 style={{ color:'#1f2937', marginBottom:8 }}>{material.title}</h3>
              <p style={{ color:'#6b7280', marginBottom:20 }}>{material.duration} • PDF Document</p>
              <div style={ms.warnBanner}>
                <FaExclamationCircle style={{ color:'#f59e0b', marginRight:8 }} />
                No file uploaded yet. Faculty needs to upload this material.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={ms.pdfFooter}>
          <button
            style={{ ...ms.navBtn, opacity: currentPage <= 1 ? 0.4 : 1 }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <FaChevronLeft /> Previous
          </button>
          <div style={{ display:'flex', gap:6 }}>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <button
                key={i}
                style={{
                  ...ms.pageBtn,
                  background: currentPage === i+1 ? '#0d9488' : 'white',
                  color:      currentPage === i+1 ? 'white'   : '#374151',
                }}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 5 && <span style={{ color:'#6b7280', alignSelf:'center' }}>...</span>}
          </div>
          <button
            style={{ ...ms.navBtn, opacity: currentPage >= totalPages ? 0.4 : 1 }}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO PLAYER MODAL
// ─────────────────────────────────────────────────────────────────────────────
const VideoPlayerModal = ({ video, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted,   setIsMuted]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else           videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (videoRef.current) videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.videoBox} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={ms.videoHeader}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <FaPlayCircle style={{ color:'#7c3aed' }} />
            <span style={{ ...ms.modalTitle, color:'white' }}>{video.title}</span>
          </div>
          <button style={{ ...ms.closeBtn, background:'rgba(255,255,255,0.1)', color:'white' }} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Video */}
        <div style={ms.videoContent}>
          {video.videoUrl ? (
            // ✅ Real video from Cloudinary
            <video
              ref={videoRef}
              src={video.videoUrl}
              style={{ width:'100%', height:'100%', objectFit:'contain' }}
              onTimeUpdate={e =>
                setProgress((e.target.currentTime / e.target.duration) * 100 || 0)
              }
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <div style={ms.videoPlaceholder}>
              <div style={ms.videoIconRing}>
                <FaPlayCircle style={{ fontSize:64, color:'#7c3aed' }} />
              </div>
              <h3 style={{ color:'white', marginBottom:8 }}>{video.title}</h3>
              <p style={{ color:'rgba(255,255,255,0.6)', marginBottom:20 }}>{video.duration}</p>
              <div style={ms.warnBannerDark}>
                <FaExclamationCircle style={{ color:'#fbbf24', marginRight:8 }} />
                No video uploaded yet. Faculty needs to upload this video.
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={ms.videoControls}>
          <div style={ms.progressBar}>
            <div style={{ ...ms.progressFill, width:`${progress}%` }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, paddingTop:8 }}>
            <button style={ms.controlBtn} onClick={togglePlay}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button style={ms.controlBtn} onClick={toggleMute}>
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <span style={{ color:'#9ca3af', fontSize:'0.85rem', marginLeft:'auto' }}>
              {video.duration}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ MODAL
// ─────────────────────────────────────────────────────────────────────────────
const makeQuestions = (subjectName, count) =>
  Array.from({ length: Math.min(parseInt(count) || 5, 5) }, (_, i) => ({
    id: i + 1,
    question: `Q${i+1}: Which of the following is a core concept in ${subjectName}?`,
    options: [
      `${subjectName} uses interpreted execution`,
      `${subjectName} does not support OOP`,
      `${subjectName} only runs on Windows`,
      `${subjectName} cannot handle data`,
    ],
    correct: 0,
  }));

const QuizModal = ({ test, subjectName, onClose }) => {
  const questions = makeQuestions(subjectName, test.questions);
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);

  const q     = questions[current];
  const score = submitted
    ? questions.filter(q => answers[q.id] === q.correct).length
    : 0;
  const pct = Math.round((score / questions.length) * 100);

  if (submitted) {
    return (
      <div style={ms.overlay} onClick={onClose}>
        <div style={ms.quizBox} onClick={e => e.stopPropagation()}>
          <div style={{ padding:'40px 32px', textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>
              {pct >= 80 ? '🏆' : pct >= 60 ? '✅' : '📚'}
            </div>
            <h2 style={{ color:'#1f2937', fontSize:'1.5rem', marginBottom:8 }}>
              {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good Job!' : 'Keep Practicing!'}
            </h2>
            <p style={{ color:'#6b7280', marginBottom:24 }}>
              Score: <strong style={{ color:'#2563eb', fontSize:'1.2rem' }}>
                {score}/{questions.length}
              </strong> ({pct}%)
            </p>
            <div style={{ height:10, background:'#e5e7eb', borderRadius:10, overflow:'hidden', marginBottom:28 }}>
              <div style={{
                height:'100%', borderRadius:10,
                width:`${pct}%`,
                background: pct >= 60 ? '#059669' : '#ef4444',
                transition:'width 0.6s ease'
              }} />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button
                style={{ flex:1, padding:'12px', borderRadius:10, background:'#2563eb', color:'white', border:'none', cursor:'pointer', fontWeight:700 }}
                onClick={() => { setAnswers({}); setSubmitted(false); setCurrent(0); }}
              >
                Try Again
              </button>
              <button
                style={{ flex:1, padding:'12px', borderRadius:10, background:'white', color:'#374151', border:'2px solid #e5e7eb', cursor:'pointer', fontWeight:600 }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.quizBox} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={ms.quizHeader}>
          <div>
            <div style={{ fontWeight:700, color:'#1f2937' }}>{test.title}</div>
            <div style={{ color:'#6b7280', fontSize:'0.8rem', marginTop:2 }}>
              Question {current+1} of {questions.length}
            </div>
          </div>
          <button style={ms.closeBtn} onClick={onClose}><FaTimes /></button>
        </div>

        {/* Progress */}
        <div style={{ height:4, background:'#e5e7eb' }}>
          <div style={{
            height:'100%',
            background:'linear-gradient(90deg,#2563eb,#7c3aed)',
            width:`${((current+1)/questions.length)*100}%`,
            transition:'width 0.3s ease'
          }} />
        </div>

        {/* Question */}
        <div style={{ padding:'24px 28px', flex:1, overflow:'auto' }}>
          <p style={{ fontSize:'1.05rem', fontWeight:600, color:'#1f2937', marginBottom:20, lineHeight:1.6 }}>
            {q.question}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                style={{
                  width:'100%', padding:'12px 16px', borderRadius:10,
                  border: `2px solid ${answers[q.id] === idx ? '#2563eb' : '#e5e7eb'}`,
                  background: answers[q.id] === idx ? '#2563eb' : 'white',
                  color: answers[q.id] === idx ? 'white' : '#374151',
                  cursor:'pointer', fontSize:'0.9rem', textAlign:'left',
                  display:'flex', alignItems:'center', gap:12,
                  fontWeight:500, transition:'all 0.15s'
                }}
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: idx }))}
              >
                <span style={{
                  width:26, height:26, borderRadius:'50%',
                  background:'rgba(0,0,0,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.75rem', fontWeight:700, flexShrink:0
                }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={ms.quizFooter}>
          <button
            style={{ ...ms.navBtn, opacity: current === 0 ? 0.4 : 1 }}
            onClick={() => setCurrent(p => Math.max(0, p - 1))}
            disabled={current === 0}
          >
            <FaChevronLeft /> Previous
          </button>
          {current < questions.length - 1 ? (
            <button
              style={{ ...ms.navBtn, background:'#2563eb', color:'white', border:'none' }}
              onClick={() => setCurrent(p => p + 1)}
            >
              Next <FaChevronRight />
            </button>
          ) : (
            <button
              style={{ ...ms.navBtn, background:'#059669', color:'white', border:'none' }}
              onClick={() => setSubmitted(true)}
            >
              <FaCheck /> Submit Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SubjectDetails = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { subjectName } = location.state || {};

  const userRole = localStorage.getItem('userRole');
  const isFaculty = userRole === 'trainee';
  const token     = localStorage.getItem('token');

  // ── Upload / file state ──
  // Shape: { [materialTitle]: { name, url, publicId, resourceType } }
  const [uploadedFiles,  setUploadedFiles]  = useState({});
  const [uploadSuccess,  setUploadSuccess]  = useState({});
  const [isUploading,    setIsUploading]    = useState({});
  const [isUpdating,     setIsUpdating]     = useState({}); // ← update mode flag
  const fileInputRefs = useRef({});
  const updateInputRefs = useRef({});

  // ── Modal state ──
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [watchingVideo,   setWatchingVideo]   = useState(null);
  const [takingTest,      setTakingTest]      = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // UPLOAD — new file
  // ─────────────────────────────────────────────────────────────────────────
  const handleUpload = async (materialTitle, file) => {
    if (!file) return;
    setIsUploading(prev => ({ ...prev, [materialTitle]: true }));

    try {
      const formData = new FormData();
      formData.append('file',    file);
      formData.append('subject', subjectName);
      formData.append('title',   materialTitle);

      const res  = await fetch(`${API}/api/materials/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');

      // Detect resource type
      const resourceType = file.type.startsWith('video/') ? 'video'
                         : file.type.startsWith('image/') ? 'image'
                         : 'raw';

      setUploadedFiles(prev => ({
        ...prev,
        [materialTitle]: {
          name: file.name, url: data.fileUrl,
          publicId: data.publicId, resourceType,
        },
      }));
      setUploadSuccess(prev => ({ ...prev, [materialTitle]: true }));
      setTimeout(() =>
        setUploadSuccess(prev => ({ ...prev, [materialTitle]: false })), 3000);

    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(prev => ({ ...prev, [materialTitle]: false }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE — replace existing file
  // ─────────────────────────────────────────────────────────────────────────
  const handleUpdate = async (materialTitle, newFile) => {
    if (!newFile) return;
    setIsUpdating(prev => ({ ...prev, [materialTitle]: true }));

    try {
      const existing = uploadedFiles[materialTitle];
      const formData = new FormData();
      formData.append('file',            newFile);
      formData.append('subject',         subjectName);
      formData.append('title',           materialTitle);
      formData.append('oldPublicId',     existing?.publicId     || '');
      formData.append('oldResourceType', existing?.resourceType || 'raw');

      const res  = await fetch(`${API}/api/materials/update`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Update failed');

      const resourceType = newFile.type.startsWith('video/') ? 'video'
                         : newFile.type.startsWith('image/') ? 'image'
                         : 'raw';

      setUploadedFiles(prev => ({
        ...prev,
        [materialTitle]: {
          name: newFile.name, url: data.fileUrl,
          publicId: data.publicId, resourceType,
        },
      }));
      setUploadSuccess(prev => ({ ...prev, [materialTitle]: true }));
      setTimeout(() =>
        setUploadSuccess(prev => ({ ...prev, [materialTitle]: false })), 3000);

      alert('✅ Material updated successfully!');

    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdating(prev => ({ ...prev, [materialTitle]: false }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE uploaded file
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteFile = async (materialTitle) => {
    const existing = uploadedFiles[materialTitle];
    if (!existing?.publicId) {
      setUploadedFiles(prev => { const n = { ...prev }; delete n[materialTitle]; return n; });
      return;
    }
    const confirmed = window.confirm(`Remove "${existing.name}" from this material?`);
    if (!confirmed) return;

    try {
      const res  = await fetch(`${API}/api/materials/delete`, {
        method:  'DELETE',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body:    JSON.stringify({
          publicId:     existing.publicId,
          resourceType: existing.resourceType || 'raw',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed');

      setUploadedFiles(prev => {
        const n = { ...prev };
        delete n[materialTitle];
        return n;
      });
      alert('🗑️ File removed.');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // View / Watch / Download helpers
  // ─────────────────────────────────────────────────────────────────────────
  const handleView = (material) => {
    const uploaded = uploadedFiles[material.title];
    setViewingMaterial({ ...material, fileUrl: uploaded?.url || material.fileUrl || null });
  };

  const handleWatch = (video) => {
    const uploaded = uploadedFiles[video.title];
    setWatchingVideo({ ...video, videoUrl: uploaded?.url || video.videoUrl || null });
  };

  const handleDownload = (material) => {
    const url = uploadedFiles[material.title]?.url || material.fileUrl;
    if (url) {
      const a = document.createElement('a');
      a.href = url; a.download = material.title; a.target = '_blank';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      alert('No file available yet. Faculty needs to upload this material.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Data
  // ─────────────────────────────────────────────────────────────────────────
  if (!subjectName) {
    return (
      <div style={{ padding:'40px', textAlign:'center' }}>
        <h2>Subject not found</h2>
        <button onClick={() => navigate('/subjects')}
          style={{ marginTop:16, padding:'10px 24px', background:'#0d9488', color:'white',
            border:'none', borderRadius:8, cursor:'pointer', fontSize:'1rem' }}>
          Back to Subjects
        </button>
      </div>
    );
  }

  const materials = [
    { title:`${subjectName} - Introduction`,   type:'PDF', duration:'15 pages', icon:<FaFileAlt />, fileUrl:null },
    { title:`${subjectName} - Core Concepts`,  type:'PDF', duration:'32 pages', icon:<FaFileAlt />, fileUrl:null },
    { title:`${subjectName} - Advanced Topics`,type:'PDF', duration:'28 pages', icon:<FaFileAlt />, fileUrl:null },
  ];
  const videos = [
    { title:`${subjectName} - Beginner Tutorial`,    duration:'45 mins',    icon:<FaPlayCircle />, videoUrl:null },
    { title:`${subjectName} - Intermediate Guide`,   duration:'1h 10 mins', icon:<FaPlayCircle />, videoUrl:null },
    { title:`${subjectName} - Project Walkthrough`,  duration:'55 mins',    icon:<FaPlayCircle />, videoUrl:null },
  ];
  const tests = [
    { title:`${subjectName} - Quiz 1`,           questions:'10 Questions', icon:<FaClipboardList /> },
    { title:`${subjectName} - Practice Test`,    questions:'25 Questions', icon:<FaClipboardList /> },
    { title:`${subjectName} - Final Assessment`, questions:'50 Questions', icon:<FaClipboardList /> },
  ];

  // const backRoute = isFaculty ? '/teacher-subjects' : '/subjects';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="student-subjects-wrapper">

      {/* Modals */}
      {viewingMaterial && <PDFViewerModal material={viewingMaterial} onClose={() => setViewingMaterial(null)} />}
      {watchingVideo   && <VideoPlayerModal video={watchingVideo}    onClose={() => setWatchingVideo(null)}   />}
      {takingTest      && <QuizModal test={takingTest} subjectName={subjectName} onClose={() => setTakingTest(null)} />}

      {/* Header */}
      <div className="student-subjects-header" style={{ position:'relative' }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            left: "24px",
            top: "50%",
            transform: "translateY(-50%)",
            
            display: "flex",
            alignItems: "center",
            gap: "8px",

            padding: "10px 18px",
            borderRadius: "12px",

            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",

            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            letterSpacing: "0.3px",

            cursor: "pointer",
            zIndex: "999",

            boxShadow:
              "0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)",

            transition: "all 0.25s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform =
              "translateY(-50%) translateX(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            e.currentTarget.style.transform = "translateY(-50%)";
          }}
        >
          <FaArrowLeft size={14} />
          Back
        </button>

        
        <h2 className="student-subjects-title">{subjectName}</h2>
        <p className="student-subjects-description">
          {isFaculty
            ? 'Upload and manage study materials for your students'
            : 'Study materials, practice tests and video lessons'}
        </p>
      </div>

      <div style={{ padding:24, display:'flex', flexDirection:'column', gap:28 }}>

        {/* Stats */}
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {[
            { icon:<FaFileAlt />,     label:'Study Materials', value:materials.length, color:'#0d9488' },
            { icon:<FaPlayCircle />,  label:'Video Lessons',   value:videos.length,    color:'#7c3aed' },
            { icon:<FaClipboardList />,label:'Practice Tests', value:tests.length,     color:'#2563eb' },
            { icon:<FaStar />,        label:'Rating',          value:'4.8 / 5',        color:'#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{
              flex:'1 1 150px', background:'white', borderRadius:12, padding:20,
              boxShadow:'0 2px 12px rgba(0,0,0,0.08)', display:'flex',
              alignItems:'center', gap:14, border:`2px solid ${s.color}22`
            }}>
              <div style={{
                width:44, height:44, borderRadius:'50%',
                background:`${s.color}18`, display:'flex', alignItems:'center',
                justifyContent:'center', color:s.color, fontSize:'1.2rem'
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:'1.4rem', fontWeight:700, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'0.8rem', color:'#6b7280', fontWeight:500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Study Materials */}
        <Section title="Study Materials" icon={<FaBook />} color="#0d9488">
          {materials.map((item, i) => (
            <MaterialCard
              key={i}
              item={item}
              color="#0d9488"
              isFaculty={isFaculty}
              uploaded={uploadedFiles[item.title]}
              uploadSuccess={uploadSuccess[item.title]}
              isUploading={isUploading[item.title]}
              isUpdating={isUpdating[item.title]}
              onView={() => handleView(item)}
              onDownload={() => handleDownload(item)}
              onUploadClick={() => fileInputRefs.current[item.title]?.click()}
              onUpdateClick={() => updateInputRefs.current[item.title]?.click()}
              onDelete={() => handleDeleteFile(item.title)}
              uploadRef={el => fileInputRefs.current[item.title] = el}
              updateRef={el => updateInputRefs.current[item.title] = el}
              onFileChange={e  => handleUpload(item.title, e.target.files[0])}
              onUpdateChange={e => handleUpdate(item.title, e.target.files[0])}
            />
          ))}
        </Section>

        {/* Video Lessons */}
        <Section title="Video Lessons" icon={<FaPlayCircle />} color="#7c3aed">
          {videos.map((item, i) => (
            isFaculty ? (
              // Faculty: upload video
              <MaterialCard
                key={i}
                item={{ ...item, duration: item.duration }}
                color="#7c3aed"
                isFaculty={isFaculty}
                uploaded={uploadedFiles[item.title]}
                uploadSuccess={uploadSuccess[item.title]}
                isUploading={isUploading[item.title]}
                isUpdating={isUpdating[item.title]}
                onView={() => handleWatch(item)}
                onDownload={() => handleDownload(item)}
                onUploadClick={() => fileInputRefs.current[item.title]?.click()}
                onUpdateClick={() => updateInputRefs.current[item.title]?.click()}
                onDelete={() => handleDeleteFile(item.title)}
                uploadRef={el => fileInputRefs.current[item.title] = el}
                updateRef={el => updateInputRefs.current[item.title] = el}
                onFileChange={e   => handleUpload(item.title, e.target.files[0])}
                onUpdateChange={e => handleUpdate(item.title, e.target.files[0])}
                viewLabel="Preview"
                viewIcon={<FaPlayCircle />}
              />
            ) : (
              // Student: watch video
              <ResourceCard
                key={i}
                item={item}
                actionLabel="Watch"
                actionIcon={<FaPlayCircle />}
                color="#7c3aed"
                onAction={() => handleWatch(item)}
              />
            )
          ))}
        </Section>

        {/* Practice Tests */}
        <Section title="Practice Tests" icon={<FaClipboardList />} color="#2563eb">
          {tests.map((item, i) => (
            <ResourceCard
              key={i}
              item={item}
              actionLabel="Start Test"
              actionIcon={<FaClipboardList />}
              color="#2563eb"
              onAction={() => setTakingTest(item)}
            />
          ))}
        </Section>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
const Section = ({ title, icon, color, children }) => (
  <div style={{
    background:'white', borderRadius:16, padding:24,
    boxShadow:'0 2px 12px rgba(0,0,0,0.08)', border:`1px solid ${color}22`
  }}>
    <h3 style={{
      fontSize:'1.2rem', fontWeight:700, color:'#1f2937', marginBottom:16,
      display:'flex', alignItems:'center', gap:10,
      borderBottom:`2px solid ${color}33`, paddingBottom:12
    }}>
      <span style={{ color }}>{icon}</span>{title}
    </h3>
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL CARD — faculty sees Upload + Update + Delete, others see View + Download
// ─────────────────────────────────────────────────────────────────────────────
const MaterialCard = ({
  item, color, isFaculty,
  uploaded, uploadSuccess, isUploading, isUpdating,
  onView, onDownload, onUploadClick, onUpdateClick, onDelete,
  uploadRef, updateRef, onFileChange, onUpdateChange,
  viewLabel = 'View', viewIcon = <FaEye />
}) => (
  <div
    style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px', background:'#f9fafb', borderRadius:10,
      border:'1px solid #e5e7eb', flexWrap:'wrap', gap:10,
      transition:'all 0.2s'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
  >
    {/* Left */}
    <div style={{ display:'flex', alignItems:'center', gap:12, flex:1 }}>
      <div style={{
        width:36, height:36, borderRadius:8, background:`${color}18`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color, fontSize:'1rem', flexShrink:0
      }}>{item.icon}</div>
      <div>
        <div style={{ fontWeight:600, color:'#1f2937', fontSize:'0.95rem' }}>{item.title}</div>
        <div style={{ fontSize:'0.8rem', color:'#6b7280', marginTop:2, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <FaClock style={{ fontSize:'0.7rem' }} />
          {item.duration}
          {/* Show uploaded filename */}
          {uploaded && (
            <span style={{ color:'#059669', fontWeight:600 }}>📎 {uploaded.name}</span>
          )}
        </div>
      </div>
    </div>

    {/* Right — Buttons */}
    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>

      {/* VIEW — all roles */}
      <button onClick={onView} style={{
        background:'white', color, border:`2px solid ${color}`,
        padding:'8px 14px', borderRadius:8, cursor:'pointer',
        display:'flex', alignItems:'center', gap:6,
        fontSize:'0.82rem', fontWeight:600, whiteSpace:'nowrap'
      }}
        onMouseEnter={e => { e.currentTarget.style.background=color; e.currentTarget.style.color='white'; }}
        onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color=color; }}
      >
        {viewIcon} {viewLabel}
      </button>

      {isFaculty ? (
        <>
          {/* Hidden file inputs */}
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm"
            ref={uploadRef} onChange={onFileChange} style={{ display:'none' }} />
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm"
            ref={updateRef} onChange={onUpdateChange} style={{ display:'none' }} />

          {/* UPLOAD — only if no file yet */}
          {!uploaded && (
            <button onClick={onUploadClick} disabled={isUploading} style={{
              background: isUploading ? '#9ca3af'
                : 'linear-gradient(135deg,#f97316,#ea580c)',
              color:'white', border:'none', padding:'8px 14px',
              borderRadius:8, cursor: isUploading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', gap:6,
              fontSize:'0.82rem', fontWeight:600, whiteSpace:'nowrap'
            }}>
              {isUploading ? <>⏳ Uploading...</> : <><FaUpload /> Upload</>}
            </button>
          )}

          {/* UPDATE — only if file already uploaded */}
          {uploaded && (
            <button onClick={onUpdateClick} disabled={isUpdating} style={{
              background: isUpdating ? '#9ca3af'
                : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color:'white', border:'none', padding:'8px 14px',
              borderRadius:8, cursor: isUpdating ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', gap:6,
              fontSize:'0.82rem', fontWeight:600, whiteSpace:'nowrap'
            }}>
              {isUpdating ? <>⏳ Updating...</> : <><FaEdit /> Update</>}
            </button>
          )}

          {/* DELETE — only if file uploaded */}
          {uploaded && (
            <button onClick={onDelete} style={{
              background:'linear-gradient(135deg,#ef4444,#dc2626)',
              color:'white', border:'none', padding:'8px 12px',
              borderRadius:8, cursor:'pointer',
              display:'flex', alignItems:'center', gap:4,
              fontSize:'0.82rem', fontWeight:600, whiteSpace:'nowrap'
            }}>
              <FaTrash />
            </button>
          )}

          {/* Success badge */}
          {uploadSuccess && (
            <span style={{ color:'#059669', fontWeight:600, fontSize:'0.82rem',
              display:'flex', alignItems:'center', gap:4 }}>
              <FaCheckCircle /> Done!
            </span>
          )}
        </>
      ) : (
        /* DOWNLOAD — employee / admin */
        <button onClick={onDownload} style={{
          background:`linear-gradient(135deg,${color},${color}cc)`,
          color:'white', border:'none', padding:'8px 14px',
          borderRadius:8, cursor:'pointer', display:'flex',
          alignItems:'center', gap:6, fontSize:'0.82rem', fontWeight:600, whiteSpace:'nowrap'
        }}>
          <FaDownload /> Download
        </button>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE CARD (Video watch / Quiz start — for students)
// ─────────────────────────────────────────────────────────────────────────────
const ResourceCard = ({ item, actionLabel, actionIcon, color, onAction }) => (
  <div
    style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px', background:'#f9fafb', borderRadius:10,
      border:'1px solid #e5e7eb', transition:'all 0.2s'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
  >
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{
        width:36, height:36, borderRadius:8, background:`${color}18`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color, fontSize:'1rem'
      }}>{item.icon}</div>
      <div>
        <div style={{ fontWeight:600, color:'#1f2937', fontSize:'0.95rem' }}>{item.title}</div>
        <div style={{ fontSize:'0.8rem', color:'#6b7280', marginTop:2,
          display:'flex', alignItems:'center', gap:4 }}>
          <FaClock style={{ fontSize:'0.7rem' }} />
          {item.duration || item.questions}
        </div>
      </div>
    </div>
    <button onClick={onAction} style={{
      background:`linear-gradient(135deg,${color},${color}cc)`,
      color:'white', border:'none', padding:'8px 16px', borderRadius:8,
      cursor:'pointer', display:'flex', alignItems:'center', gap:6,
      fontSize:'0.85rem', fontWeight:600, whiteSpace:'nowrap', transition:'all 0.2s'
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {actionIcon} {actionLabel}
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MODAL STYLES
// ─────────────────────────────────────────────────────────────────────────────
const ms = {
  overlay: {
    position:'fixed', top:0, left:0, right:0, bottom:0,
    background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:9999, backdropFilter:'blur(4px)', padding:20
  },
  // PDF
  pdfBox: {
    background:'white', borderRadius:16, width:'100%', maxWidth:860,
    maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden',
    boxShadow:'0 24px 64px rgba(0,0,0,0.25)'
  },
  pdfHeader: {
    padding:'16px 20px', borderBottom:'1px solid #e5e7eb',
    display:'flex', alignItems:'center', justifyContent:'space-between',
    background:'#f9fafb'
  },
  pdfContent: { flex:1, overflow:'auto', padding:24 },
  pdfFooter: {
    padding:'14px 20px', borderTop:'1px solid #e5e7eb',
    display:'flex', alignItems:'center', justifyContent:'space-between',
    background:'#f9fafb'
  },
  placeholder: {
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', minHeight:300, textAlign:'center'
  },
  warnBanner: {
    display:'flex', alignItems:'center', background:'#fffbeb',
    border:'1px solid #fde68a', color:'#92400e',
    padding:'12px 20px', borderRadius:10, fontSize:'0.88rem'
  },
  // Video
  videoBox: {
    background:'#111', borderRadius:16, width:'100%', maxWidth:800,
    maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden',
    boxShadow:'0 24px 64px rgba(0,0,0,0.5)'
  },
  videoHeader: {
    padding:'14px 18px', borderBottom:'1px solid #333',
    display:'flex', alignItems:'center', justifyContent:'space-between'
  },
  videoContent: { flex:1, minHeight:300, position:'relative' },
  videoPlaceholder: {
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', minHeight:300, textAlign:'center', padding:32
  },
  videoIconRing: {
    width:120, height:120, borderRadius:'50%',
    background:'rgba(124,58,237,0.15)', display:'flex',
    alignItems:'center', justifyContent:'center', marginBottom:20
  },
  warnBannerDark: {
    display:'flex', alignItems:'center', background:'rgba(251,191,36,0.1)',
    border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24',
    padding:'10px 18px', borderRadius:10, fontSize:'0.85rem', marginTop:20
  },
  videoControls: { padding:'12px 18px 16px', background:'#1a1a1a', borderTop:'1px solid #333' },
  progressBar:   { height:4, background:'#333', borderRadius:4, overflow:'hidden' },
  progressFill:  { height:'100%', background:'#7c3aed', borderRadius:4, transition:'width 0.3s' },
  controlBtn:    { background:'none', border:'none', color:'white', fontSize:'1.1rem', cursor:'pointer', padding:'4px 8px' },
  // Quiz
  quizBox: {
    background:'white', borderRadius:16, width:'100%', maxWidth:640,
    maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden',
    boxShadow:'0 24px 64px rgba(0,0,0,0.2)'
  },
  quizHeader: {
    padding:'16px 20px', borderBottom:'1px solid #e5e7eb',
    display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f9fafb'
  },
  quizFooter: {
    padding:'14px 20px', borderTop:'1px solid #e5e7eb',
    display:'flex', justifyContent:'space-between', gap:10, background:'#f9fafb'
  },
  // Shared
  modalTitle: { fontWeight:700, color:'#1f2937', fontSize:'1rem' },
  closeBtn: {
    background:'#f3f4f6', border:'none', color:'#6b7280',
    width:32, height:32, borderRadius:8, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem'
  },
  navBtn: {
    padding:'8px 16px', borderRadius:8, border:'1.5px solid #e5e7eb',
    background:'white', cursor:'pointer', fontSize:'0.88rem', fontWeight:600,
    color:'#374151', display:'flex', alignItems:'center', gap:6
  },
  pageBtn: {
    width:32, height:32, borderRadius:6, border:'1px solid #e5e7eb',
    cursor:'pointer', fontSize:'0.8rem', fontWeight:600
  },
};

export default SubjectDetails;