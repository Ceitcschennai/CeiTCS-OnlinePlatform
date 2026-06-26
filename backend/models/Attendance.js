const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  class: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkInTime: {
    type: Date,
    required: false
  },
  checkOutTime: {
    type: Date,
    required: false
  },
  duration: {
    type: Number, // Duration in minutes
    required: false
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Partial', 'Late'],
    default: 'Absent'
  },
  notes: {
    type: String,
    required: false
  },
  sessionId: {
    type: String, // For live class session tracking
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
attendanceSchema.index({ studentId: 1, teacherId: 1, date: 1, class: 1 });
attendanceSchema.index({ teacherId: 1, class: 1, date: 1 });
attendanceSchema.index({ date: 1, class: 1 });

// Pre-save middleware to calculate duration and status
attendanceSchema.pre('save', function(next) {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = new Date(this.checkOutTime) - new Date(this.checkInTime);
    this.duration = Math.floor(diffMs / (1000 * 60)); // Duration in minutes
    
    // Determine status based on duration
    if (this.duration >= 45) {
      this.status = 'Present';
    } else if (this.duration > 0) {
      this.status = 'Partial';
    } else {
      this.status = 'Absent';
    }
  } else if (this.checkInTime) {
    // Calculate current duration if still in session
    const now = new Date();
    const diffMs = now - new Date(this.checkInTime);
    const currentDuration = Math.floor(diffMs / (1000 * 60));
    
    if (currentDuration >= 45) {
      this.status = 'Present';
    } else if (currentDuration > 0) {
      this.status = 'Partial';
    }
  }
  
  next();
});

// Static methods
attendanceSchema.statics.getAttendanceByDateRange = function(teacherId, className, startDate, endDate) {
  return this.find({
    teacherId,
    class: className,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).populate('studentId', 'firstName lastName rollNo');
};

attendanceSchema.statics.getClassAttendanceStats = function(teacherId, className, date) {
  return this.aggregate([
    {
      $match: {
        teacherId: new mongoose.Types.ObjectId(teacherId),
        class: className,
        date: new Date(date)
      }
    },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        presentStudents: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Present'] }, 1, 0]
          }
        },
        partialStudents: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Partial'] }, 1, 0]
          }
        },
        absentStudents: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0]
          }
        },
        averageDuration: { $avg: '$duration' }
      }
    }
  ]);
};

// Instance methods
attendanceSchema.methods.calculateCurrentDuration = function() {
  if (this.checkInTime) {
    const endTime = this.checkOutTime || new Date();
    const diffMs = endTime - new Date(this.checkInTime);
    return Math.floor(diffMs / (1000 * 60));
  }
  return 0;
};

attendanceSchema.methods.isPresent = function() {
  return this.status === 'Present' || this.calculateCurrentDuration() >= 45;
};

module.exports = mongoose.model('Attendance', attendanceSchema);