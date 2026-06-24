const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  studentName: {
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    default: 'Absent'
  },
  joinTime: {
    type: Date
  },
  leaveTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0 // Duration in minutes
  },
  // New fields for tracking multiple join/leave cycles
  sessionHistory: [{
    joinedAt: Date,
    leftAt: Date,
    durationMinutes: Number
  }],
  firstJoinTime: Date, // Track first join time
  lastLeaveTime: Date, // Track last leave time
  totalDuration: {
    type: Number,
    default: 0 // Total duration across all sessions
  },
  isAutoTracked: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceRecordSchema.index({ class: 1, subject: 1, createdAt: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
