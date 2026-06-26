const express = require('express');
const mongoose = require('mongoose');
const Schedule = require('../models/schedule');
const Employee = require('../models/Employee');
const Teacher = require('../models/Teacher');
const transporter = require('../config/email');

const router = express.Router();

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

const getEndDateTime = (endDate, time) => {
  const date = new Date(endDate);
  const timeStr = String(time || '').trim();
  let [hours, minutes] = timeStr.split(':').map(Number);

  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const period = timeStr.includes('AM') ? 'AM' : 'PM';
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
};

const normalizeExact = (value) => String(value || '').trim().toLowerCase();

const getDefaultDays = (scheduleType) => {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weekends = ['Saturday', 'Sunday'];
  const normalized = String(scheduleType || '').trim().toLowerCase();

  if (normalized === 'weekday' || normalized === 'weekdays') {
    return [...weekdays];
  }
  if (normalized === 'weekend') {
    return [...weekends];
  }
  return [...weekdays];
};

const DAY_TO_RRULE = {
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
  Sunday: 'SU'
};

const toPlain = (value) => {
  if (!value) return value;
  if (typeof value.toObject === 'function') return value.toObject();
  if (typeof value.toJSON === 'function') return value.toJSON();
  return value;
};

const getGoogleDateTime = (date, time) => {
  console.log('Input Date:', date);
  console.log('Input Time:', time);
  console.log('Date Type:', typeof date);
  console.log('Date instanceof Date:', date instanceof Date);

  const baseDate = new Date(date);

  if (isNaN(baseDate.getTime())) {
    console.error('Invalid base date:', date);
    return null;
  }

  const [hours, minutes] = String(time || '').split(':').map(Number);

  baseDate.setHours(hours, minutes, 0, 0);

  if (isNaN(baseDate.getTime())) {
    console.error('Invalid date after time adjustment:', baseDate);
    return null;
  }

  console.log('Generated Date:', baseDate);

  return baseDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const getGoogleCalendarLink = (schedule) => {
  console.log('Generating Calendar Event');
  console.log('Start Date Raw:', schedule.startDate);
  console.log('End Date Raw:', schedule.endDate);
  console.log('Start Time Raw:', schedule.startTime);
  console.log('End Time Raw:', schedule.endTime);
  console.log('Days Raw:', schedule.days);

  const plain = toPlain(schedule);

  if (!plain.startDate) throw new Error('Missing schedule.startDate');
  if (!plain.endDate) throw new Error('Missing schedule.endDate');
  if (!plain.startTime) throw new Error('Missing schedule.startTime');
  if (!plain.endTime) throw new Error('Missing schedule.endTime');

  const eventStart = getGoogleDateTime(plain.startDate, plain.startTime);
  const eventEnd = getGoogleDateTime(plain.startDate, plain.endTime);
  const rruleUntil = getGoogleDateTime(plain.endDate, plain.endTime);

  console.log('Calendar Start:', plain.startDate);
  console.log('Calendar End:', plain.endDate);
  console.log('Calendar Start Time:', plain.startTime);
  console.log('Calendar End Time:', plain.endTime);
  console.log('Calendar Days:', plain.days);
  console.log('First Event Start:', eventStart);
  console.log('First Event End:', eventEnd);

  const daysText = plain.days && plain.days.length > 0 ? plain.days.join(', ') : 'Not Specified';
  const details = [
    `Batch Name: ${plain.batchName}`,
    `Subject: ${plain.subject}`,
    `Schedule Type: ${plain.scheduleType}`,
    `Days: ${daysText}`,
    `Time: ${plain.startTime} - ${plain.endTime}`,
    `Meet Link: ${plain.meetLink || 'Not provided'}`,
    `Faculty: ${plain.facultyName}`
  ].join('\n');

  const rrule = plain.days && plain.days.length > 0
    ? `RRULE:FREQ=WEEKLY;BYDAY=${plain.days.map((d) => DAY_TO_RRULE[d] || d).join(',')};UNTIL=${rruleUntil}`
    : '';

  console.log('Generated RRULE:', rrule);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Live Class - ${plain.subject}`,
    details,
    location: plain.meetLink || ''
  });

  if (rrule) {
    params.set('recur', rrule);
  }

  params.set('dates', `${eventStart}/${eventEnd}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const findEligibleParticipants = async (courseCode, subject) => {
  const selectedSubject = String(subject || '').trim();
  const selectedCourseCode = String(courseCode || '').trim();

  console.log('Database Name:', mongoose.connection.name);
  console.log('Employee Collection:', Employee.collection.name);
  console.log('Teacher Collection:', Teacher.collection.name);
  console.log('Schedule Collection:', Schedule.collection.name);
  console.log('Expected Schedule Collection: schedules');

  const employeeCount = await Employee.countDocuments();
  const teacherCount = await Teacher.countDocuments();
  const scheduleCount = await Schedule.countDocuments();

  console.log('Employee Count:', employeeCount);
  console.log('Teacher Count:', teacherCount);
  console.log('Schedule Count:', scheduleCount);

  const participantQuery = {
    courseCode: selectedCourseCode,
    isApproved: true,
    paymentStatus: 'Paid',
    isActive: true,
    email: { $exists: true, $ne: null }
  };

  console.log('Schedule Subject:', selectedSubject);
  console.log('Schedule Course Code:', selectedCourseCode);
  console.log('Participant Query:', participantQuery);

  const participants = await Employee.find(participantQuery).maxTimeMS(8000);
  const emails = participants.map((participant) => participant.email);

  console.log('Matched Participants:', participants.length);
  console.log('Matched Emails:', emails);

  console.log('Schedule Course Code:', selectedCourseCode);
  console.log(
    'Matched Participants:',
    participants.map((p) => ({
      name: p.firstName,
      email: p.email,
      courseCode: p.courseCode
    }))
  );
  console.log({
    courseCode: selectedCourseCode,
    days: undefined,
    emails
  });

  return participants;
};

const findEligibleFaculty = async (courseCode) => {
  const normalizedCourseCode = String(courseCode || '').trim();
  const facultyCandidates = await Teacher.find({
    'assignedCourses.courseCode': normalizedCourseCode,
    isApproved: true,
    isActive: true
  }).maxTimeMS(8000);

  return facultyCandidates[0] || null;
};

const buildScheduleEmailHtml = ({ schedule, calendarLink, participant }) => {
  const meetLink = schedule.meetLink || 'Not provided';
  const daysText =
    Array.isArray(schedule.days) && schedule.days.length > 0
      ? schedule.days.join(', ')
      : 'Not Specified';

  console.log('[EMAIL TEMPLATE] schedule.days =', schedule.days);
  console.log('[EMAIL TEMPLATE] daysText =', daysText);

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="color: #2563eb;">New Live Class Scheduled</h2>
      <p>Hello ${participant.firstName || 'Student'},</p>
      <p>A new live class has been scheduled.</p>

      <table style="border-collapse: collapse; width: 100%; max-width: 560px; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Batch Name:</td>
          <td style="padding: 8px 0;">${schedule.batchName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Subject:</td>
          <td style="padding: 8px 0;">${schedule.subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Schedule Type:</td>
          <td style="padding: 8px 0;">${schedule.scheduleType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Days:</td>
          <td style="padding: 8px 0;">${daysText}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Duration:</td>
          <td style="padding: 8px 0;">${schedule.startDate} - ${schedule.endDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Time:</td>
          <td style="padding: 8px 0;">${schedule.startTime} - ${schedule.endTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Meet Link:</td>
          <td style="padding: 8px 0;">
            ${schedule.meetLink ? `<a href="${schedule.meetLink}">${meetLink}</a>` : meetLink}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Faculty:</td>
          <td style="padding: 8px 0;">${schedule.facultyName}</td>
        </tr>
      </table>

      <p>Please join the class using the meeting link above.</p>

      <p style="margin-top: 24px;">
        <a href="${calendarLink}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Add to Google Calendar
        </a>
      </p>

      <p>Thank you.</p>
    </div>
  `;
};

const sendScheduleNotifications = async (schedule) => {
  console.log('=== EMAIL FUNCTION INPUT ===');
  console.log(JSON.stringify(toPlain(schedule), null, 2));
  console.log('schedule.days =', schedule.days);

  const participants = await findEligibleParticipants(schedule.courseCode, schedule.subject);

  const faculty = await findEligibleFaculty(schedule.courseCode);
  console.log('Eligible Faculty:', faculty ? `${faculty.firstName || ''} ${faculty.lastName || ''}`.trim() : 'Not found');

  const calendarLink = getGoogleCalendarLink(schedule);

  const schedulePlain = toPlain(schedule);
  const scheduleWithEmailContext = {
    ...schedulePlain,
    facultyName: faculty ? `${faculty.firstName || ''} ${faculty.lastName || ''}`.trim() : 'Online Tuition Faculty'
  };

  console.log('=== EMAIL CONTEXT ===');
  console.log(JSON.stringify(scheduleWithEmailContext, null, 2));
  console.log('Email Context Days:', scheduleWithEmailContext.days);

  console.log('Days passed to email:', scheduleWithEmailContext.days);
  console.log('Days type:', typeof scheduleWithEmailContext.days);
  console.log('Days array:', Array.isArray(scheduleWithEmailContext.days));

  if (participants.length === 0) {
    console.log('Emails Sent: 0');
    console.log('Failed: 0');
    return {
      success: true,
      message: 'Schedule created and notification emails sent successfully',
      matchedParticipants: 0,
      emailsSent: 0,
      failed: 0
    };
  }

  const results = await Promise.allSettled(participants.map((participant) => {
    console.log('Sending Email To:', participant.email);
    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: participant.email,
      subject: `New Live Class Scheduled - ${schedule.subject}`,
      html: buildScheduleEmailHtml({
        schedule: scheduleWithEmailContext,
        calendarLink,
        participant
      })
    }).then(() => {
      console.log('Email Sent:', participant.email);
      return { success: true };
    }).catch((error) => {
      console.error('Email Failed:', participant.email);
      console.error(error);
      throw error;
    });
  }));

  const sentResults = results.filter((result) => result.status === 'fulfilled');
  const failedResults = results.filter((result) => result.status === 'rejected');

  console.log('Emails Sent:', sentResults.length);
  console.log('Failed:', failedResults.length);

  if (failedResults.length > 0) {
    failedResults.forEach((result) => {
      console.error('Schedule notification email failed:', result.reason?.message || result.reason);
    });
  }

  return {
    success: failedResults.length === 0,
    message: failedResults.length === 0
      ? 'Schedule created and notification emails sent successfully'
      : 'Schedule created but email sending failed.',
    matchedParticipants: participants.length,
    emailsSent: sentResults.length,
    failed: failedResults.length
  };
};

router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find();
    const now = new Date();
    const activeSchedules = schedules.filter((s) => {
      const endDateTime = getEndDateTime(s.endDate, s.endTime);
      return endDateTime > now;
    });
    res.json(activeSchedules);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { batchName, scheduleType, subject, courseCode, teacherId, startDate, endDate, startTime, endTime, meetLink, days } = req.body;

    console.log('=== STEP 1 - VERIFY SUBJECT RESOLUTION ===');
    console.log('Selected Subject:', subject);

    if (!batchName || !scheduleType || !subject || !teacherId || !startDate || !endDate || !startTime || !endTime || !days || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const startTimeVal = String(startTime || '').trim();
    const endTimeVal = String(endTime || '').trim();
    if (startTimeVal && endTimeVal && endTimeVal <= startTimeVal) {
      return res.status(400).json({ success: false, message: 'End Time must be later than Start Time.' });
    }

    const teacher = await Teacher.findById(teacherId).maxTimeMS(8000);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    console.log('Teacher Assigned Courses:', teacher.assignedCourses);

    const selectedCourse = Array.isArray(teacher.assignedCourses)
      ? teacher.assignedCourses.find((course) => normalizeExact(course?.courseName) === normalizeExact(subject))
      : null;

    if (!selectedCourse || !selectedCourse.courseCode) {
      console.log('Resolved Course Code: undefined');
      return res.status(400).json({ success: false, message: 'Course code not found' });
    }

    const resolvedCourseCode = String(selectedCourse.courseCode).trim();
    console.log('Resolved Course Code:', resolvedCourseCode);

    const normalizedDays = days.map((d) => String(d || '').trim()).filter(Boolean);

    const scheduleData = {
      batchName,
      scheduleType,
      subject,
      courseCode: resolvedCourseCode,
      teacherId,
      startDate,
      endDate,
      startTime: startTimeVal,
      endTime: endTimeVal,
      meetLink,
      days: normalizedDays
    };
    console.log('=== STEP 2 - VERIFY SCHEDULE SAVE ===');
    console.log('Schedule Data:', scheduleData);

    const schedule = new Schedule(scheduleData);
    const savedSchedule = await schedule.save();

    console.log('=== SAVED SCHEDULE ===');
    console.log(JSON.stringify(savedSchedule, null, 2));
    console.log('Saved Schedule Days:', savedSchedule.days);

    const verifySchedule = await Schedule.findById(savedSchedule._id);
    console.log('MongoDB Verification Result:', verifySchedule);
    if (!verifySchedule) {
      console.error('Schedule not stored in MongoDB');
    }

    console.log('=== SCHEDULE PASSED TO EMAIL ===');
    console.log(JSON.stringify(savedSchedule, null, 2));
    console.log('Schedule Days for Email:', savedSchedule.days);

    let notificationResult = {
      success: true,
      message: 'Schedule created and notification emails sent successfully',
      matchedParticipants: 0,
      emailsSent: 0,
      failed: 0
    };

    try {
      notificationResult = await sendScheduleNotifications(savedSchedule);
    } catch (emailError) {
      console.error('Email error:', emailError.message);
      notificationResult = {
        success: false,
        message: 'Schedule created but email sending failed.',
        matchedParticipants: 0,
        emailsSent: 0,
        failed: 0
      };
    }

    res.json({
      success: true,
      schedule: savedSchedule,
      message: notificationResult.message,
      notificationFailed: !notificationResult.success,
      notification: notificationResult
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/cleanup', async (req, res) => {
  try {
    const schedules = await Schedule.find();
    const now = new Date();
    const expiredIds = [];
    schedules.forEach((s) => {
      const endDateTime = getEndDateTime(s.endDate, s.endTime);
      if (endDateTime <= now) {
        expiredIds.push(s._id);
      }
    });
    if (expiredIds.length > 0) {
      await Schedule.deleteMany({ _id: { $in: expiredIds } });
    }
    res.json({ success: true, message: 'Expired schedules removed automatically.', deletedCount: expiredIds.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});





router.get("/employee/:employeeId", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    if(employee.paymentStatus !== "Paid") {
      return res.status(403).json({
        message: "Employee is not eligible to view schedules"
      });
    }

    console.log("Employee Course Code:", employee.courseCode);

    const allSchedules = await Schedule.find({});
    console.log(
      "All Schedule Course Codes:",
      allSchedules.map(s => s.courseCode)
    );

    const schedules = await Schedule.find({
      courseCode: employee.courseCode
    });

    console.log("Matched Schedules:", schedules.length);

    res.status(200).json(schedules);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET SCHEDULES BY COURSECODES (for participants)
// GET /api/schedules/by-codes?codes=Python01,MERN01
// ─────────────────────────────────────────────────────────────────────────────
router.get("/by-codes", async (req, res) => {
  try {
    const { codes } = req.query;
    if (!codes) {
      return res.status(400).json({ message: "No course codes provided" });
    }
    
    const codeArray = codes.split(",").map(c => c.trim()).filter(c => c);
    if (codeArray.length === 0) {
      return res.status(400).json({ message: "Invalid course codes" });
    }

    const schedules = await Schedule.find({
      courseCode: { $in: codeArray },
      isActive: true
    }).sort({ startDate: 1 }).maxTimeMS(8000);

    res.status(200).json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET SCHEDULES BY TEACHER ID
// GET /api/schedules/teacher/:teacherId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/teacher/:teacherId", async (req, res) => {
  try {
    const schedules = await Schedule.find({
      teacherId: req.params.teacherId,
      isActive: true
    }).sort({ startDate: 1 }).maxTimeMS(8000);
    res.status(200).json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SCHEDULE
// PUT /api/schedules/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const {
      batchName,
      scheduleType,
      subject,
      courseCode,
      teacherId,
      startDate,
      endDate,
      startTime,
      endTime,
      meetLink,
      days
    } = req.body;

    const updated = await Schedule.findByIdAndUpdate(
      req.params.id,
      { batchName, subject, courseCode, startDate, endDate, time, meetLink },
      { new: true }
    ).maxTimeMS(8000);

    if (!updated) return res.status(404).json({ message: "Schedule not found" });
    res.status(200).json({ message: "Schedule updated", schedule: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;