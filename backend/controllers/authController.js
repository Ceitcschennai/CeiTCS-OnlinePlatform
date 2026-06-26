const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Employee = require("../models/Employee");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");

exports.login = async (req, res) => {
try {
const { role } = req.params;
const { email, password } = req.body;

// ==============================
// Validate Input
// ==============================
if (!email || !password) {
  return res.status(400).json({
    success: false,
    message: "Email and password are required",
  });
}

// ==============================
// Select Model Based On Role
// ==============================
let Model;

switch (role) {
  case "employee":
    Model = Employee;
    break;

  case "teacher":
    Model = Teacher;
    break;

  case "admin":
    Model = Admin;
    break;

  default:
    return res.status(400).json({
      success: false,
      message: "Invalid role selected",
    });
}

console.log(`🔐 Login Attempt: ${email} (${role})`);

// ==============================
// Check Email Exists
// ==============================
const user = await Model.findOne({
  email: email.toLowerCase().trim(),
});

if (!user) {
  return res.status(404).json({
    success: false,
    message: "Email is not registered",
  });
}

// ==============================
// Check Approval Status
// ==============================
if (role !== "admin") {
  const approved =
    user.isApproved === true ||
    user.approvalStatus === "Approved";

  if (!approved) {
    return res.status(403).json({
      success: false,
      message:
        "Your account is pending admin approval. Please wait for approval.",
    });
  }
}

// ==============================
// Check Active Status
// ==============================
if (user.isActive === false) {
  return res.status(403).json({
    success: false,
    message: "Your account has been deactivated.",
  });
}

// ==============================
// Check Password Exists
// ==============================
if (!user.password) {
  return res.status(500).json({
    success: false,
    message: "Password not found for this account.",
  });
}

// ==============================
// Check Password
// ==============================
const passwordMatch = await bcrypt.compare(
  password,
  user.password
);

if (!passwordMatch) {
  return res.status(401).json({
    success: false,
    message: "Incorrect password",
  });
}

// ==============================
// Check JWT Secret
// ==============================
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing");

  return res.status(500).json({
    success: false,
    message: "Server configuration error",
  });
}

// ==============================
// Generate JWT Token
// ==============================
const token = jwt.sign(
  {
    id: user._id,
    email: user.email,
    role,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
  }
);

console.log(`✅ Login Success: ${email}`);

// ==============================
// Success Response
// ==============================
return res.status(200).json({
  success: true,
  message: "Login successful",
  token,
  user: {
    id: user._id,
    email: user.email,
    role,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
  },
});


} catch (err) {
console.error("🔥 LOGIN ERROR:", {
message: err.message,
stack: err.stack,
role: req.params.role,
email: req.body?.email,
});


return res.status(500).json({
  success: false,
  message: "Internal server error",
});


}
};
