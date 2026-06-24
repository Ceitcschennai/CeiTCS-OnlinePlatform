const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    unique: true
  },

  courseName: {
    type: String,
    required: true
  },

  description: {
    type: String,
    default: ""
  },

  category: {
    type: String,
    default: ""
  },

  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher"
  },


  price: {
    type: Number,
    default: 0
  },

  duration: {
    type: String,
    default: ""
  },

  sessionType: {
    type: String,
    enum: ["Live", "Recorded"],
    default: "Live"
  },

  courseType: {
    type: String,
    enum: ["WeekDays", "Weekend"],
    default: "WeekDays"
    },

    startDate: Date,

    endDate: Date,

    classDays: [String],

    startTime: String,

    endTime: String,

    meetingLink: String,

  isPublished: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

courseSchema.index({ courseCode: 1 });
courseSchema.index({ courseName: 1 });


module.exports = mongoose.model("Course", courseSchema);