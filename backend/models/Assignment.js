const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  submittedDate: {
    type: Date,
    default: Date.now
  },
  marks: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    default: ""
  },
  evaluated: {
    type: Boolean,
    default: false
  },
  evaluatedDate: {
    type: Date
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }
});

const assignmentSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
description: {
    type: String,
    required: true
  },
   fromDate: {
    type: Date
  },
  dueDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  courseCode: {
    type: String
  },
  class: {
    type: String
  },
  totalStudents: {
    type: Number,
    default: 30
  },
  assignmentFile: {
    type: String
  },
  assignmentFilePath: {
    type: String
  },
  assignmentFileSize: {
    type: String
  },
  submissions: [submissionSchema],
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Closed'],
    default: 'Active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Assignment', assignmentSchema);
