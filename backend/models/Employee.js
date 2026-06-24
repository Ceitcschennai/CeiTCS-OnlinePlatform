const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  salutation: {
    type: String,
    enum: ["Mr", "Ms", "Mrs", ""],
    default: ""
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String
  },
  mobile: {
    type: String,
    trim: true
  },

  courseCode: {
    type: String,
    trim: true
  },

  role: {
    type: String,
    trim: true
  },
  skills: {
    type: String,
    trim: true
  },
  startTime: {          // ✅ added
    type: String,
    trim: true
  },
  endTime: {            // ✅ added
    type: String,
    trim: true
  },
  approvalStatus: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  rejectionFeedback: { type: String, default: ""},
  paymentStatus: {
    type: String,
    enum: ["Paid", "Unpaid"],
    default: "Unpaid"
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  proof: {
    type: String,
    default: null
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },

  otp: {
  type: String
  },
  otpExpiry: {
    type: Date
  },
  verified: {
    type: Boolean,
    default: false
  },
  resetOtp: String,
  resetOtpExpiry: Date,

  courseName: {type: String},


  enrolledSubjects: [{
    courseName: { type: String },
    courseCode: { type: String },
    enrolledAt: { type: Date, default: Date.now },
    paymentStatus: { type: String, enum: ["Paid", "Unpaid"], default: "Unpaid" }
  }],
});

employeeSchema.index({
  role: 1,
  courseCode: 1,
  isApproved: 1,
  paymentStatus: 1,
  isActive: 1
});

employeeSchema.index({ email: 1 });

module.exports = mongoose.model("Employee", employeeSchema);