const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Teacher = require('../models/Teacher');
const transporter = require('../config/email');

const getModel = (role) => {
  if (role === 'faculty' || role === 'trainee' || role === 'teacher') return Teacher;
  return Employee;
};

const sendMail = async (to, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Password Reset OTP - CEITCS Professional Academy',
    html: `<h3>Password Reset</h3><p>Your OTP is <strong>${otp}</strong></p><p>Expires in 10 minutes.</p>`
  });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ success: false, message: 'Email and role are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address' });

    const Model = getModel(role);
    const user = await Model.findOne({ email: email.toLowerCase().trim() }).maxTimeMS(8000);
    if (!user) return res.status(400).json({ success: false, message: 'No account found with this email' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtp = otp;
    user.resetOtpExpiry = otpExpiry;
    await user.save();

    try {
      await sendMail(email, otp);
      return res.status(200).json({ success: true, message: 'Reset code sent successfully' });
    } catch (mailErr) {
      console.error('Reset email failed:', mailErr.message);
      return res.status(500).json({ success: false, message: 'Failed to send reset email' });
    }
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, role, otp } = req.body;
    if (!email || !role || !otp) return res.status(400).json({ success: false, message: 'Email, role and OTP are required' });

    const Model = getModel(role);
    const user = await Model.findOne({ email: email.toLowerCase().trim() }).maxTimeMS(8000);
    if (!user) return res.status(400).json({ success: false, message: 'No account found with this email' });
    if (!user.resetOtp || !user.resetOtpExpiry) return res.status(400).json({ success: false, message: 'Invalid verification code' });
    if (new Date() > user.resetOtpExpiry) return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    if (user.resetOtp !== otp) return res.status(400).json({ success: false, message: 'Invalid verification code' });

    return res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error('VERIFY RESET OTP ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, role, password } = req.body;
    if (!email || !role || !password) return res.status(400).json({ success: false, message: 'Email, role and password are required' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const Model = getModel(role);
    const user = await Model.findOne({ email: email.toLowerCase().trim() }).maxTimeMS(8000);
    if (!user) return res.status(400).json({ success: false, message: 'No account found with this email' });
    if (!user.resetOtp || !user.resetOtpExpiry) return res.status(400).json({ success: false, message: 'Please verify OTP before resetting password' });
    if (new Date() > user.resetOtpExpiry) return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });

    user.password = await bcrypt.hash(password, 10);
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
