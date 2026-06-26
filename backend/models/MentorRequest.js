const mongoose = require("mongoose");

const mentorRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ["booking", "message"],
    required: true
  },
  visitorName: {
    type: String,
    required: true,
    trim: true
  },
  visitorEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  visitorPhone: {
    type: String,
    trim: true,
    default: ""
  },
  mentorName: {
    type: String,
    required: true,
    trim: true
  },
  mentorSubject: {
    type: String,
    required: true,
    trim: true
  },
  mentorPosition: {
    type: String,
    trim: true,
    default: ""
  },
  preferredDate: {
    type: String,
    trim: true,
    default: ""
  },
  preferredTime: {
    type: String,
    trim: true,
    default: ""
  },
  purpose: {
    type: String,
    trim: true,
    default: ""
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  },
  subject: {
    type: String,
    trim: true,
    default: ""
  },
  message: {
    type: String,
    trim: true,
    default: ""
  },
  status: {
    type: String,
    enum: ["Pending", "Reviewed", "Resolved"],
    default: "Pending"
  },
  emailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

mentorRequestSchema.index({ requestType: 1, createdAt: -1 });
mentorRequestSchema.index({ visitorEmail: 1 });
mentorRequestSchema.index({ status: 1 });

module.exports = mongoose.model("MentorRequest", mentorRequestSchema);
