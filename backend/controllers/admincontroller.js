const Teacher = require("../models/Teacher");
const Employee = require("../models/Employee");

// GET ALL PENDING USERS
exports.getPendingUsers = async (req, res) => {
  const teachers = await Teacher.find({ isApproved: false });
  const employees = await Employee.find({ isApproved: false });

  res.json({
    teachers,
    employees
  });
};

// APPROVE TEACHER
exports.approveTeacher = async (req, res) => {
  await Teacher.findByIdAndUpdate(req.params.id, {
    isApproved: true
  });

  res.json({ success: true });
};

// APPROVE EMPLOYEE
exports.approveEmployee = async (req, res) => {
  await Employee.findByIdAndUpdate(req.params.id, {
    isApproved: true
  });

  res.json({ success: true });
};