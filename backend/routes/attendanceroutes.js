const express = require('express');
const router = express.Router();
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Employee');
const Teacher = require('../models/Teacher');

// Get teacher details with assignments
router.get('/teachers/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      teacher: {
        _id: teacher._id,
        salutation: teacher.salutation,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        classesAssigned: teacher.classesAssigned || (teacher.classAssigned ? [teacher.classAssigned] : []),
        subjects: teacher.subjects || []
      }
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Check for active session
router.get('/attendance/active-session', async (req, res) => {
  try {
    const { teacherId, class: className, subject, date } = req.query;

    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(searchDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const session = await AttendanceSession.findOne({
      teacherId,
      class: className,
      subject,
      date: { $gte: searchDate, $lt: nextDate },
      status: { $in: ['active', 'completed'] }
    });

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error checking active session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Start attendance session
router.post('/attendance/start-session', async (req, res) => {
  try {
    const { teacherId, teacherName, class: className, subject, date, liveClassId, autoStarted } = req.body;

    if (!teacherId || !className || !subject || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: teacherId, class, subject, date'
      });
    }

    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(sessionDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Check if session already exists
    const existingSession = await AttendanceSession.findOne({
      teacherId,
      class: className,
      subject,
      date: { $gte: sessionDate, $lt: nextDate },
      status: 'active'
    });

    if (existingSession) {
      return res.json({
        success: true,
        message: 'Session already active',
        session: existingSession
      });
    }

    // Create new session
    const session = new AttendanceSession({
      teacherId,
      teacherName,
      class: className,
      subject,
      date: sessionDate,
      startTime: new Date(),
      status: 'active',
      liveClassId,
      autoStarted: autoStarted || false
    });

    await session.save();

    console.log(`✅ Attendance session started: ${session._id}`);

    res.status(201).json({
      success: true,
      message: 'Attendance session started successfully',
      session
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// End attendance session
router.post('/attendance/end-session', async (req, res) => {
  try {
    const { sessionId, endTime, autoEnded } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const session = await AttendanceSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.endTime = new Date(endTime);
    session.status = 'completed';
    session.autoEnded = autoEnded || false;
    await session.save();

    // Update all records to mark final leave time
    await AttendanceRecord.updateMany(
      {
        sessionId: session._id,
        status: 'Present',
        leaveTime: { $exists: false }
      },
      {
        $set: {
          leaveTime: new Date(endTime),
          lastLeaveTime: new Date(endTime)
        }
      }
    );

    // Calculate final durations
    const records = await AttendanceRecord.find({ sessionId: session._id });
    for (const record of records) {
      if (record.firstJoinTime) {
        const finalLeaveTime = record.lastLeaveTime || new Date(endTime);
        const totalMinutes = Math.floor((finalLeaveTime - record.firstJoinTime) / 1000 / 60);
        record.duration = totalMinutes;
        record.totalDuration = totalMinutes;
        await record.save();
      }
    }

    console.log(`✅ Attendance session ended: ${sessionId}`);

    res.json({
      success: true,
      message: 'Session ended successfully',
      session
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Mark attendance (join/leave)
router.post('/attendance/mark', async (req, res) => {
  try {
    const {
      sessionId,
      studentId,
      studentName,
      action,
      timestamp,
      class: className,
      subject,
      isAutoTracked
    } = req.body;

    if (!sessionId || !studentId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, studentId, action'
      });
    }

    let record = await AttendanceRecord.findOne({ sessionId, studentId });

    const now = new Date(timestamp);

    if (!record) {
      // Create new record
      record = new AttendanceRecord({
        sessionId,
        studentId,
        studentName,
        class: className,
        subject,
        status: 'Absent',
        sessionHistory: [],
        isAutoTracked: isAutoTracked !== undefined ? isAutoTracked : true
      });
    }

    if (action === 'join') {
      // Set first join time (only once)
      if (!record.firstJoinTime) {
        record.firstJoinTime = now;
        record.joinTime = now;
      }

      // Add to session history
      record.sessionHistory.push({
        joinedAt: now,
        leftAt: null,
        durationMinutes: 0
      });

      // For join actions, don't mark as present immediately
      // Status will be determined based on total duration when they leave or session ends
      record.status = 'Absent'; // Default status until 45 minutes threshold is met

      const currentMinutes = now.getMinutes(); // ✅ Define it before logging
      console.log(`✅ Student ${studentName} joined at ${now.toLocaleTimeString()}, Minute: ${currentMinutes}`);

      // console.log(`✅ Student ${studentName} joined at ${now.toLocaleTimeString()}, Duration: ${currentMinutes} mins`);

    } else if (action === 'leave') {
      // Update last leave time
      record.lastLeaveTime = now;
      record.leaveTime = now;

      // Update the last session in history
      if (record.sessionHistory.length > 0) {
        const lastSession = record.sessionHistory[record.sessionHistory.length - 1];
        if (lastSession && !lastSession.leftAt) {
          lastSession.leftAt = now;
          if (lastSession.joinedAt) {
            lastSession.durationMinutes = Math.floor((now - lastSession.joinedAt) / 1000 / 60);
          }
        }
      }

      // Calculate total duration from first join to last leave
      if (record.firstJoinTime) {
        const totalMinutes = Math.floor((now - record.firstJoinTime) / 1000 / 60);
        record.duration = totalMinutes;
        record.totalDuration = totalMinutes;

        // Apply 45-minute rule: >= 45 minutes = Present, < 45 minutes = Absent
        record.status = totalMinutes >= 45 ? 'Present' : 'Absent';
      } else {
        record.status = 'Absent';
      }

      console.log(`✅ Student ${studentName} left at ${now.toLocaleTimeString()}, Duration: ${record.duration} mins`);
    }

    await record.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      record
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get attendance records for session with live duration calculation
router.get('/attendance/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const records = await AttendanceRecord.find({ sessionId }).sort({ studentName: 1 });

    // Calculate live durations and update status
    const updatedRecords = records.map(record => {
      let currentDuration = record.totalDuration || record.duration || 0;

      // If student has joined but not left yet, calculate current duration
      if (record.firstJoinTime && !record.lastLeaveTime) {
        const now = new Date();
        currentDuration = Math.floor((now - record.firstJoinTime) / 1000 / 60);
      }

      // Apply 45-minute rule
      const status = currentDuration >= 45 ? 'Present' : 'Absent';

      return {
        ...record.toObject(),
        totalDuration: currentDuration,
        duration: currentDuration,
        status: status
      };
    });

    res.json({
      success: true,
      records: updatedRecords
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get attendance records by date range (for historical view)
router.get('/attendance/records', async (req, res) => {
  try {
    const { class: className, subject, startDate, endDate, teacherId } = req.query;

    const query = {};

    if (className) query.class = className;
    if (subject) query.subject = subject;

    // Find sessions in date range
    const sessionQuery = {};
    if (teacherId) sessionQuery.teacherId = teacherId;
    if (className) sessionQuery.class = className;
    if (subject) sessionQuery.subject = subject;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sessionQuery.date = { $gte: start, $lte: end };
    }

    const sessions = await AttendanceSession.find(sessionQuery);
    const sessionIds = sessions.map(s => s._id);

    const records = await AttendanceRecord.find({
      sessionId: { $in: sessionIds }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      records,
      sessions
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Export attendance as CSV
router.get('/attendance/export/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await AttendanceSession.findById(sessionId);
    const records = await AttendanceRecord.find({ sessionId }).sort({ studentName: 1 });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Create CSV with simplified headers (45-minute rule applied)
    let csv = 'Roll No,Student Name,Total Duration (minutes),Status,Date,Subject,Class,Threshold Met\n';

    records.forEach((record, index) => {
      const duration = record.totalDuration || record.duration || 0;
      const status = duration >= 45 ? 'Present' : 'Absent';
      const thresholdMet = duration >= 45 ? 'Yes' : 'No';

      csv += `${index + 1},`;
      csv += `"${record.studentName}",`;
      csv += `${duration},`;
      csv += `${status},`;
      csv += `"${new Date(session.date).toLocaleDateString('en-IN')}",`;
      csv += `"${session.subject}",`;
      csv += `"${session.class}",`;
      csv += `${thresholdMet}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${session.class}_${session.subject}_${new Date(session.date).toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Export attendance by date range
router.post('/attendance/export-range', async (req, res) => {
  try {
    const { class: className, subject, startDate, endDate, teacherId } = req.body;

    // Find sessions in date range
    const sessionQuery = {
      status: 'completed'
    };
    if (teacherId) sessionQuery.teacherId = teacherId;
    if (className) sessionQuery.class = className;
    if (subject) sessionQuery.subject = subject;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sessionQuery.date = { $gte: start, $lte: end };
    }

    const sessions = await AttendanceSession.find(sessionQuery).sort({ date: -1 });

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance records found for the specified criteria'
      });
    }

    const sessionIds = sessions.map(s => s._id);
    const records = await AttendanceRecord.find({
      sessionId: { $in: sessionIds }
    }).sort({ createdAt: 1 });

    // Create CSV with simplified format (45-minute rule applied)
    let csv = 'Date,Class,Subject,Roll No,Student Name,Total Duration (minutes),Status,Threshold Met\n';

    sessions.forEach(session => {
      const sessionRecords = records.filter(r => r.sessionId.toString() === session._id.toString());

      sessionRecords.forEach((record, index) => {
        const duration = record.totalDuration || record.duration || 0;
        const status = duration >= 45 ? 'Present' : 'Absent';
        const thresholdMet = duration >= 45 ? 'Yes' : 'No';

        csv += `"${new Date(session.date).toLocaleDateString('en-IN')}",`;
        csv += `"${session.class}",`;
        csv += `"${session.subject}",`;
        csv += `${index + 1},`;
        csv += `"${record.studentName}",`;
        csv += `${duration},`;
        csv += `${status},`;
        csv += `${thresholdMet}\n`;
      });
    });

    const filename = `attendance_${className}_${subject}_${startDate}_to_${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance range:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
