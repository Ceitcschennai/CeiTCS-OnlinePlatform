const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory store (resets on each cold start - acceptable for live classes)
let liveClasses = [];

router.get('/', (req, res) => {
  res.json(liveClasses);
});

router.post('/start', (req, res) => {
  try {
    const { subject, teacher, teacherId, class: className, roomName, jitsiUrl } = req.body;
    if (!subject || !teacher || !teacherId || !className) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const newLiveClass = {
      id: uuidv4(),
      meetingId: uuidv4(),
      subject, teacher, teacherId,
      class: className,
      roomName: roomName || `${subject}-${className}-${Date.now()}`,
      jitsiUrl: jitsiUrl || `https://meet.jit.si/${roomName}`,
      isLive: true,
      startTime: new Date(),
      participants: []
    };
    liveClasses.push(newLiveClass);
    res.json({ success: true, liveClass: newLiveClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/join', (req, res) => {
  try {
    const { classId, studentId, studentName, studentEmail } = req.body;
    if (!classId || !studentId || !studentName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const liveClass = liveClasses.find(cls => cls.id === classId);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }
    const existing = liveClass.participants.find(p => p.studentId === studentId);
    if (!existing) {
      liveClass.participants.push({ studentId, name: studentName, email: studentEmail, joinTime: new Date() });
    }
    res.json({ success: true, message: 'Joined successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/leave', (req, res) => {
  try {
    const { classId, studentId } = req.body;
    const liveClass = liveClasses.find(cls => cls.id === classId);
    if (liveClass) {
      liveClass.participants = liveClass.participants.filter(p => p.studentId !== studentId);
    }
    res.json({ success: true, message: 'Left successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/end/:classId', (req, res) => {
  try {
    liveClasses = liveClasses.filter(cls => cls.id !== req.params.classId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/class/:className', (req, res) => {
  const classes = liveClasses.filter(cls => cls.class === req.params.className && cls.isLive);
  res.json(classes);
});

router.get('/teacher/:teacherId', (req, res) => {
  const classes = liveClasses.filter(cls => cls.teacherId === req.params.teacherId && cls.isLive);
  res.json(classes);
});

module.exports = router;