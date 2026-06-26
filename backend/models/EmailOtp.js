const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
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
  purpose: {
    type: String,
    enum: ["registration", "login"],
    default: "registration"
  }
}, { timestamps: true });

module.exports = mongoose.model("EmailOtp", emailOtpSchema);