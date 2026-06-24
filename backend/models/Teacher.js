const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  salutation: { type: String, default: "" },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: { type: String },
  mobile: { type: String, trim: true },
  countryCode: {
    type: String,
    trim: true
  },
  fullMobile: {
    type: String,
    trim: true
  },
  timezone: { type: String, trim: true },
  preferredSubjects: { type: [String], default: [] },
  assignedSubjects: { type: [mongoose.Schema.Types.Mixed], default: [] },
  assignedClasses: { type: [String], default: [] },
  
  proof: { type: String, default: null },
  badgeCertificate: { type: String, default: null },
  approvalStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now },
  assignedCourses: [
    {
      _id: false,
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
      },

      courseCode: {
        type: String
      },

      courseName: {
        type: String
      }
    }
  ],
  achievements: {
    hasAchievements: { type: Boolean, default: false },
    document: { type: String, default: null }
  },
  resetOtp: String,
  resetOtpExpiry: Date
});

teacherSchema.index({
  preferredSubjects: 1,
  isApproved: 1,
  isActive: 1
});

teacherSchema.index({
  email: 1
});

module.exports = mongoose.model("Teacher", teacherSchema);
