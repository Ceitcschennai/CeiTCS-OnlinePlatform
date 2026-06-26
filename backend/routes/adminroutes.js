const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const Teacher = require("../models/Teacher");
const transporter = require("../config/email");

/* ================= GET ALL PENDING ================= */
router.get("/pending", async (req, res) => {
  try {
    const employees = await Employee.find({ approvalStatus: "Pending" }).maxTimeMS(8000);
    const teachers = await Teacher.find({ approvalStatus: "Pending" }).maxTimeMS(8000);
    res.json({ employees, teachers });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= GET ALL REJECTED ================= */
router.get("/rejected", async (req, res) => {
  try {
    const employees = await Employee.find({ approvalStatus: "Rejected" }).maxTimeMS(8000);
    const teachers = await Teacher.find({ approvalStatus: "Rejected" }).maxTimeMS(8000);
    res.json({ employees, teachers });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= APPROVE EMPLOYEE ================= */
router.put("/approve-employee/:id", async (req, res) => {
  try {
    await Employee.findByIdAndUpdate(req.params.id, { isApproved: true });
    res.json({ message: "Employee approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= APPROVE TEACHER ================= */
router.put("/approve-teacher/:id", async (req, res) => {
  try {
    await Teacher.findByIdAndUpdate(req.params.id, { isApproved: true });
    res.json({ message: "Teacher approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   GET ALL TEACHERS (existing - kept for compatibility)
   GET /api/admin/teachers
===================================================== */
router.get("/teachers", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    if (status && status !== "All") {
      if (status === "pending") query.isApproved = false;
      else if (status === "approved") query.isApproved = true;
      else if (status === "active") query.isActive = true;
      else if (status === "inactive") query.isActive = false;
    }

    const total = await Teacher.countDocuments(query).maxTimeMS(8000);
    const teachers = await Teacher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).maxTimeMS(8000);

    res.status(200).json({
      teachers,
      pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total, limit },
      stats: {
        total: await Teacher.countDocuments().maxTimeMS(5000),
        pending: await Teacher.countDocuments({ isApproved: false }).maxTimeMS(5000),
        approved: await Teacher.countDocuments({ isApproved: true }).maxTimeMS(5000),
        assigned: await Teacher.countDocuments({ isApproved: true, $or: [{ classAssigned: { $exists: true, $ne: null } }, { classesAssigned: { $exists: true, $ne: [] } }] }).maxTimeMS(5000),
        active: await Teacher.countDocuments({ isActive: true }).maxTimeMS(5000),
        inactive: await Teacher.countDocuments({ isActive: false }).maxTimeMS(5000)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/teachers-dropdown", async (req, res) => {
  try {
    // 1. Fetch filtered list
    const teachers = await Teacher.find({
      isApproved: true,
      isActive: true
    })
    .select("_id firstName lastName preferredSubjects")
    .sort({ firstName: 1 });

    return res.status(200).json(teachers);
  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
});


router.post("/teachers", async (req, res) => {
  try {
    const { salutation, firstName, lastName, email, mobile, timezone, password, preferredSubjects, experience, qualification, notes } = req.body;
    if (!firstName || !lastName || !email || !password) return res.status(400).json({ message: "Missing required fields" });
    const exists = await Teacher.findOne({ email }).maxTimeMS(8000);
    if (exists) return res.status(400).json({ message: "Email already registered" });
    const hashedPassword = await bcrypt.hash(password, 8);
    const teacher = new Teacher({ salutation, firstName, lastName, email, mobile, timezone, password: hashedPassword, preferredSubjects: Array.isArray(preferredSubjects) ? preferredSubjects : [], experience, qualification, notes, isApproved: false, isActive: true, createdAt: new Date() });
    await teacher.save();
    res.status(200).json({ message: "Teacher added successfully", teacher });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/teachers/:id", async (req, res) => {
  try {
    const { salutation, firstName, lastName, email, mobile, timezone, password, preferredSubjects, experience, qualification, notes } = req.body;
    const updateData = { salutation, firstName, lastName, email, mobile, timezone, preferredSubjects: Array.isArray(preferredSubjects) ? preferredSubjects : [], experience, qualification, notes };
    if (password && password.trim() !== "") updateData.password = await bcrypt.hash(password, 8);
    const updated = await Teacher.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Teacher not found" });
    res.status(200).json({ message: "Teacher updated successfully", teacher: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/teachers/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, { isApproved: status }, { new: true });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    res.status(200).json({ message: status ? "Teacher approved successfully" : "Teacher rejected", teacher });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/teachers/:id/toggle-status", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    teacher.isActive = !teacher.isActive;
    await teacher.save();
    res.status(200).json({ message: `Teacher marked as ${teacher.isActive ? "Active" : "Inactive"}`, teacher });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/teachers/:id", async (req, res) => {
  try {
    const deleted = await Teacher.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Teacher not found" });
    res.status(200).json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   TRAINEES CRUD — all routes below mirror teachers
   but use the Teacher model with "Trainee" context
   GET /api/admin/trainees
===================================================== */
router.get("/trainees", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } }
      ];
    }
    if (status && status !== "All") {
      if (status === "pending") query.isApproved = false;
      else if (status === "approved") query.isApproved = true;
      else if (status === "active") query.isActive = true;
      else if (status === "inactive") query.isActive = false;
    }

    const total = await Teacher.countDocuments(query).maxTimeMS(8000);
    const trainees = await Teacher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).maxTimeMS(8000);

    res.status(200).json({
      trainees,
      pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total, limit },
      stats: {
        total: await Teacher.countDocuments().maxTimeMS(5000),
        pending: await Teacher.countDocuments({ isApproved: false }).maxTimeMS(5000),
        approved: await Teacher.countDocuments({ isApproved: true }).maxTimeMS(5000),
        active: await Teacher.countDocuments({ isActive: true }).maxTimeMS(5000),
        inactive: await Teacher.countDocuments({ isActive: false }).maxTimeMS(5000)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/trainees", async (req, res) => {
  try {
    const { salutation, firstName, lastName, email, mobile, timezone, password, specialization, experience, qualification, notes } = req.body;
    if (!firstName || !lastName || !email || !password) return res.status(400).json({ message: "Missing required fields" });
    const exists = await Teacher.findOne({ email }).maxTimeMS(8000);
    if (exists) return res.status(400).json({ message: "Email already registered" });
    const hashedPassword = await bcrypt.hash(password, 8);
    const trainee = new Teacher({ salutation, firstName, lastName, email, mobile, timezone, password: hashedPassword, specialization, experience, qualification, notes, approvalStatus: "Pending", isApproved: false, isActive: true, createdAt: new Date() });
    await trainee.save();
    res.status(200).json({ message: "Trainee added successfully", trainee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/trainees/:id", async (req, res) => {
  try {
    const { salutation, firstName, lastName, email, mobile, timezone, password, specialization, experience, qualification, notes } = req.body;
    const updateData = { salutation, firstName, lastName, email, mobile, timezone, specialization, experience, qualification, notes };
    if (password && password.trim() !== "") updateData.password = await bcrypt.hash(password, 8);
    const updated = await Teacher.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Trainee not found" });
    res.status(200).json({ message: "Trainee updated successfully", trainee: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/trainees/:id/status", async (req, res) => {
  try {
    const { status, feedback } = req.body;
    const updateData = {
        approvalStatus: status,
        isApproved: status === "Approved",
        rejectionFeedback: status === "Rejected" ? (feedback || null) : null
    };
    const trainee = await Teacher.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!trainee) return res.status(404).json({ message: "Trainee not found" });
    
    if (status === "Approved") {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: trainee.email,
        subject: "Your Trainee Registration Has Been Approved",
        html: `<h3>Congratulations, ${trainee.firstName}!</h3><p>Your registration as a trainee has been <strong>approved</strong>.</p>`
      });
    } else if (status === "Rejected") {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: trainee.email,
        subject: "Faculty Registration Rejected",
        html: `
          <h3>Hi ${trainee.firstName},</h3>
          <p>Unfortunately, your faculty registration has been <strong>rejected</strong>.</p>
          <p><strong>Feedback:</strong> ${feedback || "No feedback provided."}</p>
          <p>Please contact support for more information.</p>
        `
      });
    }
    res.status(200).json({ message: status === "Approved" ? "Trainee approved successfully" : "Trainee rejected", trainee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/trainees/:id/toggle-status", async (req, res) => {
  try {
    const trainee = await Teacher.findById(req.params.id);
    if (!trainee) return res.status(404).json({ message: "Trainee not found" });
    trainee.isActive = !trainee.isActive;
    await trainee.save();
    res.status(200).json({ message: `Trainee marked as ${trainee.isActive ? "Active" : "Inactive"}`, trainee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/trainees/:id", async (req, res) => {
  try {
    const deleted = await Teacher.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Trainee not found" });
    res.status(200).json({ message: "Trainee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;