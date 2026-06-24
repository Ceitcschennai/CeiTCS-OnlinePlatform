const mongoose = require("mongoose");

const courseNotificationSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  notificationType: {
    type: String,
    default: "new-course",
    enum: ["new-course"]
  },
  viewedBy: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model("CourseNotification", courseNotificationSchema);