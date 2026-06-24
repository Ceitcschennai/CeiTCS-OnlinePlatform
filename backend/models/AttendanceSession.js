const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  teacherId: {
    type: String,
    required: true,
    index: true
  },
  teacherName: {
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
attendanceSessionSchema.index({ teacherId: 1, class: 1, subject: 1, date: 1, status: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
