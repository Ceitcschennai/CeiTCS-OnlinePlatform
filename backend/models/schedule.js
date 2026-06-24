// const mongoose = require('mongoose');

// const scheduleSchema = new mongoose.Schema({
//   batchName: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   subject: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   courseCode: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   startDate: {
//     type: Date,
//     required: true
//   },
//   endDate: {
//     type: Date,
//     required: true
//   },
//   time: {
//     type: String,
//     required: true
//   },
//   meetLink: {
//     type: String,
//     required: true
//   },
//   teacherId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Teacher'
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('Schedule', scheduleSchema);



const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: true,
    trim: true
  },
  scheduleType: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  courseCode: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    trim: true
  },
  endTime: {
    type: String,
    required: true,
    trim: true
  },
  meetLink: {
    type: String,
    trim: true,
    default: ''
  },
  days: {
    type: [String],
    default: undefined
  }
}, {
  timestamps: true
});

scheduleSchema.index({ subject: 1, courseCode: 1, startDate: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);