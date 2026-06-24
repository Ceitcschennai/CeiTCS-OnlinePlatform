const express = require("express");
const bcrypt = require("bcryptjs");
const { upload } = require("../config/cloudinary");
const Teacher = require("../models/Teacher");
const EmailOtp = require("../models/EmailOtp");
const transporter = require("../config/email");

const router = express.Router();

// =====================================================
// EMAIL OTP — SEND OTP (Faculty)
// POST /api/teacher/send-otp
// =====================================================
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const existingTeacher = await Teacher.findOne({ email: email.toLowerCase().trim() });
    if (existingTeacher) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await EmailOtp.findOneAndUpdate(
      { email },
      { otp, otpExpiry, verified: false, purpose: "registration" },
      { upsert: true, new: true }
    );

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Email Verification OTP - CEITCS Professional Academy",
        html: `
          <h3>Email Verification</h3>
          <p>Your verification OTP is <strong>${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <br/>
          <p>If you did not request this, please ignore this email.</p>
        `
      });
    } catch (emailErr) {
      console.error("OTP email failed:", emailErr.message);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.status(200).json({
      success: true,
      message: "Verification code sent successfully"
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});

// =====================================================
// EMAIL OTP — VERIFY EMAIL (Faculty)
// POST /api/teacher/verify-email
// =====================================================
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const otpRecord = await EmailOtp.findOne({ email, purpose: "registration" });

    if (!otpRecord) {
      return res.status(400).json({ message: "OTP not found. Please request a new OTP." });
    }

    if (new Date() > otpRecord.otpExpiry) {
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpRecord.verified = true;
    otpRecord.otp = undefined;
    otpRecord.otpExpiry = undefined;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});

// =====================================================
// REGISTER FACULTY
// POST /api/teacher/register
// =====================================================
router.post(
  "/register",
  upload.fields([
    { name: "degreeCertificate", maxCount: 1 },
    { name: "badgeCertificate", maxCount: 1 },
    { name: "achievementDocument", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        salutation,
        firstName,
        lastName,
        mobile,
        timezone,
        email,
        password,
        preferredSubject,
        otherAchievements
      } = req.body;


      const degreeFile = req.files?.degreeCertificate?.[0];
      const badgeFile = req.files?.badgeCertificate?.[0];
      const achievementFile = req.files?.achievementDocument?.[0];

      if (!degreeFile) {
        return res.status(400).json({
          success: false,
          message: "Degree Certificate is required"
        });
      }

      
      const normalizedTimezone = timezone?.trim();

      if (!normalizedTimezone) {
        return res.status(400).json({
          message: "Please select a timezone."
        });
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png"
      ];
      const maxSize = 5 * 1024 * 1024;


      if (!allowedTypes.includes(degreeFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Invalid file type. Only PDF, JPG, JPEG and PNG are allowed."
        });
      }

      if (degreeFile.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 5 MB limit."
        });
      }

      const exists = await Teacher.findOne({ email });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const teacher = new Teacher({
        salutation,
        firstName,
        lastName,
        mobile,
        timezone: normalizedTimezone,
        email,
        password: hashedPassword,

        preferredSubjects: preferredSubject
          ? preferredSubject.split(",").map(s => s.trim())
          : [],

        // Cloudinary URL
        proof: degreeFile.path || null,

        // Cloudinary URL
        badgeCertificate: badgeFile?.path || null,

        achievements:
          otherAchievements?.toLowerCase() === "yes"
            ? {
                hasAchievements: true,
                document: achievementFile?.path || null
              }
            : {
                hasAchievements: false,
                document: null
              },

        approvalStatus: "Pending",
        isApproved: false,
        isActive: true
      });

      await teacher.save();

      res.status(201).json({
        success: true,
        message: "Registration successful. Waiting for admin approval.",
        teacher
      });

    } catch (err) {
      console.error("REGISTER ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
);

// =====================================================
// GET ALL APPROVED FACULTY
// =====================================================
router.get("/approved", async (req, res) => {
  try {
    const teachers = await Teacher.find({ isApproved: true }).select(
      "firstName lastName email preferredSubjects mobile timezone salutation"
    );
    res.status(200).json({ success: true, teachers });
  } catch (err) {
    console.error("Error fetching approved teachers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
// GET FACULTY SUBJECTS BY ID
// =====================================================
router.get("/subjects/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }
    if (!teacher.isApproved) {
      return res.status(403).json({ success: false, message: "Your account is pending admin approval." });
    }

    const rawSubjects = teacher.assignedSubjects?.length
      ? teacher.assignedSubjects
      : teacher.preferredSubjects || [];

    const subjects = rawSubjects.map(subject => {
      const isObject = typeof subject === "object" && subject !== null;
      return {
        name: isObject ? subject.name : subject,
        category: isObject ? (subject.category || "General") : "General",
        classes: isObject ? (subject.classes || []) : []
      };
    });

    res.status(200).json({ success: true, subjects });
  } catch (err) {
    console.error("Error fetching faculty subjects:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// =====================================================
// GET FACULTY ASSIGNED COURSES BY ID
// =====================================================
router.get("/:id/assigned-courses", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }
    if (!teacher.isApproved) {
      return res.status(403).json({ success: false, message: "Your account is pending admin approval." });
    }

    const assignedCourses = Array.isArray(teacher.assignedCourses) ? teacher.assignedCourses : [];
    const courses = assignedCourses
      .map((course) => ({
        courseCode: String(course?.courseCode || '').trim(),
        courseName: String(course?.courseName || '').trim()
      }))
      .filter((course) => course.courseCode && course.courseName);

    res.status(200).json({ success: true, courses, subjects: courses.map((course) => course.courseName) });
  } catch (err) {
    console.error("Error fetching faculty assigned courses:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




// =====================================================
// GET FACULTY DASHBOARD STATS
// =====================================================
router.get("/:id/dashboard", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalStudents: 0,
        assignmentsToReview: 0,
        pendingQueries: 0,
        upcomingClasses: 0,
        attendanceRate: 0,
        activeClasses: 0,
        assignedSubjects: teacher.assignedSubjects?.length || 0
      },
      teacherInfo: {
        name: `${teacher.firstName} ${teacher.lastName}`,
        classes: teacher.assignedClasses || [],
        subjects: teacher.preferredSubjects || [],
        achievements: teacher.achievements || {}
      },
      recentActivities: [],
      performanceMetrics: {
        averageAssignmentScore: 0,
        classParticipation: 0,
        assignmentSubmissionRate: 0
      }
    });
  } catch (err) {
    console.error("Error fetching dashboard:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
