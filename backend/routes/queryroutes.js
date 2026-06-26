const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Teacher = require('../models/Teacher');
const upload = require('../middleware/upload');
const Employee = require('../models/Employee');

// @route   POST /api/queries
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      studentId, studentName,
      courseName, courseCode, question, priority = 'Medium', tags, isPublic = false
    } = req.body;

    if (!studentId || !studentName || !courseName || !question) {
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
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
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





router.get('/participant/:employeeId/subjects', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);


    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Main account validation
    if (
      employee.approvalStatus !== 'Approved' ||
      employee.paymentStatus !== 'Paid'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Account not approved or payment pending'
      });
    }

    const subjects = [];

    // Main Course
    if (
      employee.courseCode &&
      employee.courseName &&
      employee.paymentStatus === 'Paid'
    ) {
      subjects.push({
        courseCode: employee.courseCode,
        courseName: employee.courseName
      });
    }

    // Enrolled Courses
    if (Array.isArray(employee.enrolledSubjects)) {
      employee.enrolledSubjects.forEach(subject => {

        if (
          subject.paymentStatus === 'Paid' &&
          subject.courseCode &&
          subject.courseName
        ) {
          subjects.push({
            courseCode: subject.courseCode,
            courseName: subject.courseName
          });
        }

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



router.post('/participant', async (req, res) => {
  try {

    const {
      studentId,
      courseCode,
      question,
      priority = 'Medium'
    } = req.body;

    if (!studentId || !courseCode || !question) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, Course Code and Question are required'
      });
    }

    const employee = await Employee.findById(studentId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Account validation
    if (
      employee.approvalStatus !== 'Approved' ||
      employee.paymentStatus !== 'Paid'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Account not approved or payment pending'
      });
    }

    let courseName = '';

    const selectedCode = String(courseCode).trim();
    const employeeCode = String(employee.courseCode).trim();

    // Main Course Validation
    if (
      employee.courseCode === courseCode &&
      employee.paymentStatus === 'Paid'
    ) {
      courseName = employee.courseName;
    }

    console.log("Course Name After Main Check:", courseName);

    // Enrolled Course Validation
    const selectedSubject =
      employee.enrolledSubjects?.find(
        subject =>
          subject.courseCode === courseCode &&
          subject.paymentStatus === 'Paid'
      );

    if (selectedSubject) {
      courseName = selectedSubject.courseName;
    }

    console.log("Final Course Name:", courseName);

    if (!courseName) {
      return res.status(400).json({
        success: false,
        message: 'DEBUG',
        employeeCourseCode: employee.courseCode,
        receivedCourseCode: courseCode,
        employeePaymentStatus: employee.paymentStatus,
        enrolledSubjects: employee.enrolledSubjects
      });
    }

    const query = new Query({
      studentId: employee._id,
      studentName: `${employee.firstName} ${employee.lastName}`,
      courseName,
      courseCode,
      question,
      priority,
      status: 'Pending'
    });

    await query.save();

    
    console.log("Received Body:", req.body);

    console.log("Employee Course Code:", employee.courseCode);
    console.log("Selected Course Code:", courseCode);
    console.log("Employee Payment:", employee.paymentStatus);

    console.log(
      "Enrolled Subjects:",
      employee.enrolledSubjects
    );

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