const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Employee = require('../models/Employee');
const multer = require('multer');
const path = require("path");
const fs = require("fs");
const os = require("os");

const uploadDir =
  process.env.VERCEL === "1"
    ? path.join(os.tmpdir(), "uploads", "assignments")
    : path.resolve("uploads/assignments/");
fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// GET /api/assignments - Get all assignments for teacher
router.get('/', async (req, res) => {
  try {
    const { teacherId, class: studentClass, courseCode } = req.query;
    let query = {};
    
    if (teacherId) {
      query.teacherId = teacherId;
    }
    if (courseCode) {
      query.courseCode = courseCode;
    }
    if (studentClass) {
      query.class = studentClass;
    }

    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

// GET /api/assignments/student/:studentId - Get assignments for a specific student
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { class: studentClass, courseCodes } = req.query;

    // Fetch student to get enrolled course codes
    const employee = await Employee.findById(studentId).maxTimeMS(8000);
    
    let query = {};
    
    // Get course codes from enrolled subjects or main course
    let studentCourseCodes = [];
    if (employee) {
      // Main course
      if (employee.courseCode) {
        studentCourseCodes.push(employee.courseCode);
      }
      // Enrolled subjects
      if (Array.isArray(employee.enrolledSubjects)) {
        employee.enrolledSubjects.forEach(subject => {
          if (subject.courseCode) {
            studentCourseCodes.push(subject.courseCode);
          }
        });
      }
    }

    // If courseCodes provided as query param, use those; otherwise use from employee
    if (courseCodes) {
      studentCourseCodes = courseCodes.split(',').map(c => c.trim()).filter(Boolean);
    }

    // Filter by courseCode if available
    if (studentCourseCodes.length > 0) {
      query.courseCode = { $in: studentCourseCodes };
    }

    const assignments = await Assignment.find(query)
      .sort({ dueDate: 1 });

    // Add submission status for this student
    const assignmentsWithStatus = assignments.map(assignment => {
      const studentSubmission = assignment.submissions.find(
        sub => sub.studentId.toString() === studentId
      );
      
      return {
        ...assignment.toObject(),
        hasSubmitted: !!studentSubmission,
        submissionDate: studentSubmission?.submittedDate,
        submissionFile: studentSubmission?.fileName
      };
    });

    res.status(200).json({
      success: true,
      assignments: assignmentsWithStatus
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

// POST /api/assignments - Create new assignment
router.post('/', upload.single('file'), async (req, res) => {
  console.log('===== CREATE ASSIGNMENT =====');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  console.log('============================');
  console.log('subject:', req.body.subject);
  console.log('title:', req.body.title);
  console.log('dueDate:', req.body.dueDate);
  console.log('teacherId:', req.body.teacherId);
  try {
    const {
      subject,
      title,
      description,
      fromDate,
      dueDate,
      priority,
      teacherId,
      teacherName,
      courseCode,
      class: assignmentClass,
      totalStudents
    } = req.body;

    if (!subject || !title || !dueDate || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Subject, title, due date, and teacher ID are required'
      });
    }

    const newAssignment = new Assignment({
      subject,
      title,
      description,
      fromDate,
      dueDate,
      priority: priority || 'Medium',
      teacherId,
      teacherName,
      courseCode,
      class: assignmentClass,
      totalStudents: totalStudents || 30,
      assignmentFile: req.file ? req.file.originalname : undefined,
      assignmentFilePath: req.file ? req.file.path : undefined,
      assignmentFileSize: req.file ? (req.file.size / (1024 * 1024)).toFixed(2) : undefined
    });

    await newAssignment.save();

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment: newAssignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment'
    });
  }
});

// POST /api/assignments/:id/submit - Submit assignment
router.post('/:id/submit', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, studentName } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if student already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.studentId.toString() === studentId
    );

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Assignment already submitted'
      });
    }

    // Add submission
    const submission = {
      studentId,
      studentName,
      fileName: req.file.originalname,
      fileSize: (req.file.size / (1024 * 1024)).toFixed(2), // Convert to MB
      filePath: req.file.path
    };

    assignment.submissions.push(submission);
    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully',
      submission
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment'
    });
  }
});

// GET /api/assignments/:id/download/:submissionId - Download submission
router.get('/:id/download/:submissionId', async (req, res) => {
  try {
    const { id, submissionId } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    const submission = assignment.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const filePath = path.resolve(submission.filePath);
    res.download(filePath, submission.fileName);
  } catch (error) {
    console.error('Error downloading submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download submission'
    });
  }
});

// GET /api/assignments/:id/download - Download faculty assignment PDF
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (!assignment.assignmentFilePath) {
      return res.status(404).json({
        success: false,
        message: 'Assignment file not found'
      });
    }

    const filePath = path.resolve(assignment.assignmentFilePath);
    res.download(filePath, assignment.assignmentFile);
  } catch (error) {
    console.error('Error downloading assignment PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download assignment PDF'
    });
  }
});

// PUT /api/assignments/:assignmentId/evaluate/:submissionId - Evaluate submission
router.put('/:assignmentId/evaluate/:submissionId', async (req, res) => {
  console.log('===== EVALUATE =====');
  console.log('req.params:', req.params);
  console.log('req.body:', req.body);
  try {
    const { assignmentId, submissionId } = req.params;
    const { marks, feedback, teacherId } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    console.log('assignment found?', !!assignment);
    if (assignment) {
      console.log('assignment.teacherId:', assignment.teacherId?.toString());
    }
    console.log('incoming teacherId:', teacherId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.teacherId.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Only the assignment owner can evaluate submissions'
      });
    }

    const submission = assignment.submissions.id(submissionId);
    console.log('submission found?', !!submission);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    submission.marks = marks;
    submission.feedback = feedback;
    submission.evaluated = true;
    submission.evaluatedDate = new Date();
    submission.evaluatedBy = teacherId;

    try {
      await assignment.save();
    } catch (saveError) {
      console.error('ERROR during assignment.save():', saveError);
      throw saveError;
    }

    res.status(200).json({
      success: true,
      message: 'Evaluation saved successfully',
      submission
    });
  } catch (error) {
    console.error('Error evaluating submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to evaluate submission'
    });
  }
});

// GET /api/assignments/stats - Get assignment statistics
router.get('/stats', async (req, res) => {
  try {
    const { teacherId } = req.query;
    let query = {};
    
    if (teacherId) {
      query.teacherId = teacherId;
    }

    const assignments = await Assignment.find(query);
    
    const totalSubmissions = assignments.reduce((sum, assignment) => 
      sum + assignment.submissions.length, 0
    );
    
    const totalPossibleSubmissions = assignments.reduce((sum, assignment) => 
      sum + assignment.totalStudents, 0
    );
    
    const pendingSubmissions = totalPossibleSubmissions - totalSubmissions;
    
    const averageSubmissionRate = assignments.length > 0 
      ? Math.round((totalSubmissions / totalPossibleSubmissions) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        total: assignments.length,
        totalSubmissions,
        pendingSubmissions,
        averageSubmissionRate
      }
    });
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment statistics'
    });
  }
});

module.exports = router;
