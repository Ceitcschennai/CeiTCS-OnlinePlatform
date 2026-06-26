  const express = require("express");
  const router = express.Router();
  const bcrypt = require("bcryptjs");
  const multer = require("multer");
  const Employee = require("../models/Employee");
  const EmailOtp = require("../models/EmailOtp");
  const transporter = require("../config/email");
  const { upload } = require("../config/cloudinary");

  /* ============================================
    EMAIL OTP — SEND OTP
    POST /api/employee/send-otp
  ============================================ */
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

      const existingEmployee = await Employee.findOne({ email: email.toLowerCase().trim() }).maxTimeMS(8000);
      if (existingEmployee) {
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

  /* ============================================
    EMAIL OTP — VERIFY EMAIL
    POST /api/employee/verify-email
  ============================================ */
  router.post("/verify-email", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const otpRecord = await EmailOtp.findOne({ email, purpose: "registration" });

      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (new Date() > otpRecord.otpExpiry) {
        return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
      }

      if (otpRecord.otp !== otp) {
        return res.status(400).json({ message: "Invalid verification code" });
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


  /* ============================================
    REGISTER EMPLOYEE (Public)
    POST /api/employee/register
  ============================================ */
  router.post("/register", upload.single("proof"), async (req, res) => {
    try {

      const {
        firstName,
        lastName,
        email,
        password,
        skills,
        mobile,
        startTime,
        endTime,
        salutation
      } = req.body;

      // ✅ Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
     

      // ✅ File validation (proof/ID certificate)
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      const maxSize = 5 * 1024 * 1024; // 5 MB

      if (!req.file) {
        return res.status(400).json({ success: false, message: "ID / Certificate is required" });
      }

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ success: false, message: "Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed." });
      }

      if (req.file.size > maxSize) {
        return res.status(400).json({ success: false, message: "File size exceeds 5 MB limit." });
      }

      // ✅ First Name validation
      const firstNameRegex = /^[A-Za-z ]{2,30}$/;
      if (!firstNameRegex.test(firstName)) {
        if (firstName.length < 2) {
          return res.status(400).json({ message: "First Name must be at least 2 characters." });
        }
        if (firstName.length > 30) {
          return res.status(400).json({ message: "First Name cannot exceed 30 characters." });
        }
        return res.status(400).json({ message: "First Name can contain only letters." });
      }

      // ✅ Last Name validation
      const lastNameRegex = /^[A-Za-z ]{1,30}$/;
      if (!lastNameRegex.test(lastName)) {
        if (lastName.length === 0) {
          return res.status(400).json({ message: "Last Name is required." });
        }
        if (lastName.length > 30) {
          return res.status(400).json({ message: "Last Name cannot exceed 30 characters." });
        }
        return res.status(400).json({ message: "Last Name can contain only letters." });
      }

     
      
      // ✅ Check if email already exists
      const exists = await Employee.findOne({ email }).maxTimeMS(8000);
      if (exists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // ✅ Hash password
      const hashedPassword = await bcrypt.hash(password, 8);

      // ✅ Create and save employee
      const employee = new Employee({
        salutation: salutation || "",
        firstName,
        lastName,
        email,
        password: hashedPassword,
        skills,
        mobile,
        startTime,
        endTime,
        proof: req.file ? req.file.path : null,
        approvalStatus: "Pending",
        paymentStatus: "Unpaid",
        isApproved: false,
        isActive: true,
        registeredAt: new Date()
      });

      await employee.save();

      // ✅ Send confirmation email (non-blocking)
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Registration Received - Pending Approval",
          html: `
            <h3>Hi ${firstName}!</h3>
            <p>Your registration has been received and is <strong>pending admin approval</strong>.</p>
            <p>You will be notified once your account is approved.</p>
            <br/>
            <p>Thank you for registering!</p>
          `
        });
      } catch (emailErr) {
        // Don't fail registration if email fails
        console.error("Confirmation email failed:", emailErr.message);
      }

      res.status(201).json({
        success: true,
        message: "Employee registered successfully"
      });

    } catch (err) {
      console.error("REGISTER ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message
      });
    }
  });

  /* ============================================
    GET ALL EMPLOYEES
    GET /api/employee
  ============================================ */
  router.get("/", async (req, res) => {
    try {
      const employees = await Employee.find()
        .sort({ registeredAt: -1 })
        .maxTimeMS(8000);
      res.status(200).json(employees);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  /* ============================================
    ADD EMPLOYEE FROM ADMIN PANEL
    POST /api/employee/add
  ============================================ */
  router.post("/add", async (req, res) => {
    try {
      const {
        salutation,
        firstName,
        lastName,
        email,
        mobile,
        role,
        skills,
        approvalStatus,
        paymentStatus
      } = req.body;

      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const exists = await Employee.findOne({ email }).maxTimeMS(8000);
      if (exists) return res.status(400).json({ message: "Email already registered" });

      const employee = new Employee({
        salutation,
        firstName,
        lastName,
        email,
        mobile,
        role,
        skills,
        approvalStatus: approvalStatus || "Pending",
        paymentStatus: paymentStatus || "Unpaid",
        isApproved: approvalStatus === "Approved",
        registeredAt: new Date()
      });

      await employee.save();
      res.status(200).json({ message: "Participant added successfully", employee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  /* ============================================
    UPDATE EMPLOYEE
    PUT /api/employee/:id
  ============================================ */
  router.put("/:id", async (req, res) => {
    try {
      const {
        salutation,
        firstName,
        lastName,
        email,
        mobile,
        role,
        skills,
        approvalStatus,
        paymentStatus
      } = req.body;

      const updated = await Employee.findByIdAndUpdate(
        req.params.id,
        {
          salutation,
          firstName,
          lastName,
          email,
          mobile,
          role,
          skills,
          approvalStatus,
          paymentStatus,
          isApproved: approvalStatus === "Approved"
        },
        { new: true }
      ).maxTimeMS(8000);

      if (!updated) return res.status(404).json({ message: "Employee not found" });
      res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  /* ============================================
    APPROVE / REJECT EMPLOYEE
    PUT /api/employee/:id/approve
  ============================================ */
  router.put("/:id/approve", async (req, res) => {
    try {
      const { status, feedback} = req.body;

      const employee = await Employee.findByIdAndUpdate(
        req.params.id,
        {
          approvalStatus: status,
          isApproved: status === "Approved",
          rejectionFeedback: status === "Rejected" ? (feedback || null) : null
        },
        { new: true }
      ).maxTimeMS(8000);

      if (!employee) return res.status(404).json({ message: "Employee not found" });

      try {
        if (status === "Approved") {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: employee.email,
            subject: "Your Registration Has Been Approved!",
            html: `
              <h3>Congratulations, ${employee.firstName}!</h3>
              <p>Your participant registration has been <strong>approved</strong>.</p>
              <p>You can now log in to your account.</p>
            `
          });
        } else if (status === "Rejected") {
          
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: employee.email,
            subject: "Registration Update",
            html: `
              <h3>Hi ${employee.firstName},</h3>
              <p>Unfortunately, your registration has been <strong>rejected</strong>.</p>
              <p><strong>Feedback:</strong> ${employee.rejectionFeedback || "No feedback provided."}</p>
              <p>Please contact support for more information.</p>
            `
          });
        }
      } catch (emailErr) {
        console.error("Status email failed:", emailErr.message);
      }

      res.status(200).json(employee);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  /* ============================================
    TOGGLE PAYMENT STATUS
    PUT /api/employee/:id/payment
  ============================================ */
  router.put("/:id/payment", async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id).maxTimeMS(8000);
      if (!employee) return res.status(404).json({ message: "Employee not found" });

      employee.paymentStatus = employee.paymentStatus === "Paid" ? "Unpaid" : "Paid";
      await employee.save();

      res.status(200).json(employee);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  /* ============================================
   TOGGLE ACTIVE / INACTIVE STATUS
   PUT /api/employee/:id/status
============================================ */
router.put("/:id/status", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .maxTimeMS(8000);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Participant not found"
      });
    }

    employee.isActive = !employee.isActive;

    await employee.save();

    res.status(200).json({
      success: true,
      message: employee.isActive
        ? "Participant activated successfully"
        : "Participant deactivated successfully",
      employee
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});



/* ============================================
   GET PARTICIPANT ENROLLMENTS BY ID
   GET /api/employee/:id/enrollments
============================================ */
router.get("/:id/enrollments", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).maxTimeMS(8000);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    
    res.status(200).json({ 
      enrolledSubjects: employee.courseCode || [] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});





  module.exports = router;