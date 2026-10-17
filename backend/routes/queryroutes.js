const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Teacher = require('../models/Teacher');
const upload = require('../middleware/upload');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  hasCourseAccess,
  accessibleCourseCodes
} = require('../utils/courseAccess');

// Case-insensitive exact course code match (kept consistent with
// the enrollment checks already used by paymentroutes.js)
const sameCourseCode = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// @route   POST /api/queries
router.post('/', protect, authorize('employee'), upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      studentName,
      courseName, courseCode, question, priority = 'Medium', tags, isPublic = false
    } = req.body;

    // Step 13 H1/Issue 3: identity comes from the authenticated JWT only
    const studentId = String(req.user._id);

    if (!studentName || !courseName || !question) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      mimetype: file.mimetype
    })) : [];

    const processedTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()))
      : [];

    const newQuery = new Query({
      studentId, studentName,
      courseName, courseCode: String(courseCode || '').trim(), question, priority,
      tags: processedTags, attachments, isPublic
    });

    await newQuery.save();
    res.status(201).json({ message: 'Query submitted successfully', query: newQuery });

  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ message: 'Failed to submit query' });
  }
});

// @route   GET /api/queries/stats  ← MUST be before /:id routes
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total: await Query.countDocuments(),
      pending: await Query.countDocuments({ status: 'Pending' }),
      answered: await Query.countDocuments({ status: 'Answered' }),
      resolved: await Query.countDocuments({ status: 'Resolved' }),
      bycourseName: await Query.aggregate([
        { $group: { _id: '$courseName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]),
      byPriority: await Query.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      recent: await Query.find()
        .sort({ createdAt: -1 }).limit(5)
        .select('studentName courseName status createdAt')
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// @route   GET /api/queries/student/:studentId
// Step 13 H1/Issue 3: authenticated participant reads OWN queries
// (req.params.studentId is never trusted as identity)
router.get('/student/:studentId', protect, authorize('employee'), async (req, res) => {
  try {
    const studentId = String(req.user._id);
    const { page = 1, limit = 10, status } = req.query;

    let filter = { studentId };
    if (status && status !== 'All') filter.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const queries = await Query.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Query.countDocuments(filter);

    res.json({
      queries,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalQueries: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching student queries:', error);
    res.status(500).json({ message: 'Failed to fetch queries' });
  }
});

// @route   GET /api/queries/teacher/:teacherId
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const teacher = await Teacher.findById(teacherId).maxTimeMS(8000);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const facultyCourseCodes = Array.isArray(teacher.assignedCourses)
      ? teacher.assignedCourses.map(course => String(course?.courseCode || '').trim()).filter(Boolean)
      : [];

    console.log('Faculty Assigned Course Codes:', facultyCourseCodes);

    let filter = { courseCode: { $in: facultyCourseCodes } };
    if (status && status !== 'All') filter.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const queries = await Query.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Query.countDocuments(filter);

    console.log('Queries Found:', queries.length);
    console.log('Query Course Codes:', queries.map(q => q.courseCode));

    const stats = {
      total: await Query.countDocuments({ courseCode: { $in: facultyCourseCodes } }),
      pending: await Query.countDocuments({ courseCode: { $in: facultyCourseCodes }, status: 'Pending' }),
      answered: await Query.countDocuments({ courseCode: { $in: facultyCourseCodes }, status: 'Answered' }),
      resolved: await Query.countDocuments({ courseCode: { $in: facultyCourseCodes }, status: 'Resolved' })
    };

    res.json({
      queries,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalQueries: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching teacher queries:', error);
    res.status(500).json({ message: 'Failed to fetch queries' });
  }
});

// @route   GET /api/queries
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 10, status, courseName, priority,
      studentId, teacherId, search,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    let filter = {};
    if (status && status !== 'All') filter.status = status;
    if (courseName && courseName !== 'All') filter.courseName = courseName;
    if (priority && priority !== 'All') filter.priority = priority;
    if (studentId) filter.studentId = studentId;
    if (teacherId) filter.teacherId = teacherId;

    if (search) {
      filter.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } },
        { question: { $regex: search, $options: 'i' } },
        { reply: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const sortConfig = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // ✅ NO populate — studentName is already stored as a string field
    const queries = await Query.find(filter)
      .sort(sortConfig)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Query.countDocuments(filter);

    const stats = {
      total: await Query.countDocuments(),
      pending: await Query.countDocuments({ status: 'Pending' }),
      answered: await Query.countDocuments({ status: 'Answered' }),
      resolved: await Query.countDocuments({ status: 'Resolved' })
    };

    res.json({
      queries,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalQueries: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ message: 'Failed to fetch queries' });
  }
});

// @route   PUT /api/queries/:id/reply
router.put('/:id/reply', async (req, res) => {
  try {
    const { reply, teacherId, status = 'Answered' } = req.body;
    if (!reply || !teacherId) {
      return res.status(400).json({ message: 'Reply and teacher ID are required' });
    }

    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { reply, teacherId, status, repliedAt: new Date() },
      { new: true }
    );

    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.json({ message: 'Reply submitted successfully', query });

  } catch (error) {
    console.error('Error replying:', error);
    res.status(500).json({ message: 'Failed to submit reply' });
  }
});

// @route   PUT /api/queries/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Answered', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const query = await Query.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.json({ message: 'Status updated successfully', query });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// @route   PUT /api/queries/:id/assign
router.put('/:id/assign', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ message: 'Teacher ID is required' });

    const query = await Query.findByIdAndUpdate(
      req.params.id, { teacherId }, { new: true }
    );
    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.json({ message: 'Query assigned successfully', query });

  } catch (error) {
    console.error('Error assigning query:', error);
    res.status(500).json({ message: 'Failed to assign query' });
  }
});

// @route   PUT /api/queries/:id/views
router.put('/:id/views', async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { new: true }
    );
    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.json({ message: 'Views updated', views: query.views });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update views' });
  }
});

// @route   DELETE /api/queries/:id
router.delete('/:id', async (req, res) => {
  try {
    const query = await Query.findByIdAndDelete(req.params.id);
    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete query' });
  }
});





router.get('/participant/:employeeId/subjects', protect, authorize('employee'), async (req, res) => {
  try {
    // Step 13 H1/Issue 3: identity comes from the JWT — the URL id
    // is never trusted as the participant identity
    const employee = await Employee.findById(req.user._id);


    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Registration approval gate (unchanged)
    if (employee.approvalStatus !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: 'Account not approved or payment pending'
      });
    }

    // Candidate courses = existing enrollment structure (unchanged)
    const candidates = [];

    if (employee.courseCode && employee.courseName) {
      candidates.push({
        courseCode: employee.courseCode,
        courseName: employee.courseName
      });
    }

    if (Array.isArray(employee.enrolledSubjects)) {
      employee.enrolledSubjects.forEach((subject) => {
        if (subject && subject.courseCode && subject.courseName) {
          candidates.push({
            courseCode: subject.courseCode,
            courseName: subject.courseName
          });
        }
      });
    }

    // Approved access rule (A1+B2+C1+D1): the manual flag is
    // account-level; otherwise the LATEST payment for the exact
    // course must be PAID. Never broadcasts across courses.
    const accessible = await accessibleCourseCodes(
      req.user._id,
      candidates.map((c) => c.courseCode)
    );

    const subjects = candidates.filter((c) =>
      accessible.has(String(c.courseCode).trim().toLowerCase())
    );

    // No accessible paid/enrolled subjects -> original
    // 403 "payment pending" answer is returned.
    if (subjects.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Account not approved or payment pending'
      });
    }

    const uniqueSubjects = [
      ...new Map(
        subjects.map(item => [item.courseCode, item])
      ).values()
    ];

    res.json({
      success: true,
      subjects: uniqueSubjects
    });


  } catch (err) {
    console.error('Error fetching participant subjects:', err);

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });


  }
});



router.post('/participant', protect, authorize('employee'), async (req, res) => {
  try {

    const {
      courseCode,
      question,
      priority = 'Medium'
    } = req.body;

    // Step 13 H1/Issue 3: identity from the authenticated JWT only
    // (any client-supplied studentId is ignored)
    const employee = await Employee.findById(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Registration approval gate (unchanged)
    if (employee.approvalStatus !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: 'Account not approved or payment pending'
      });
    }

    const selectedCode = String(courseCode || '').trim();

    if (!selectedCode || !question) {
      return res.status(400).json({
        success: false,
        message: 'Course Code and Question are required'
      });
    }

    // Approved course-level access rule (A1+B2+C1+D1)
    const allowed = await hasCourseAccess(req.user._id, selectedCode);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Account not approved or payment pending'
      });
    }

    let courseName = '';

    // Enrollment resolution (existing structure, case-insensitive —
    // consistent with the paymentroutes enrollment checks)
    if (
      employee.courseCode &&
      sameCourseCode(employee.courseCode, selectedCode) &&
      employee.courseName
    ) {
      courseName = employee.courseName;
    }

    const selectedSubject = (employee.enrolledSubjects || []).find(
      (subject) =>
        subject &&
        sameCourseCode(subject.courseCode, selectedCode) &&
        subject.courseName
    );

    if (selectedSubject) {
      courseName = selectedSubject.courseName;
    }

    // Step 13 H1/Issue 4: never expose authorization internals
    // (paymentStatus / enrolledSubjects) in the response
    if (!courseName) {
      return res.status(400).json({
        success: false,
        message: 'Selected course is not part of your enrollment'
      });
    }

    const query = new Query({
      studentId: employee._id,
      studentName: `${employee.firstName} ${employee.lastName}`,
      courseName,
      courseCode: selectedCode,
      question,
      priority,
      status: 'Pending'
    });

    await query.save();

    res.status(201).json({
      success: true,
      message: 'Query submitted successfully',
      query
    });


  }catch (err) {
    console.error('Error submitting query:', err);

    res.status(500).json({
      success: false,
      message: err.message
    });


  }
});




module.exports = router;