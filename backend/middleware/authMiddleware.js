const jwt = require("jsonwebtoken");

const Employee = require("../models/Employee");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");

const protect = async (req, res, next) => {
try {
let token;

if (
req.headers.authorization &&
req.headers.authorization.startsWith("Bearer ")
) {
token = req.headers.authorization.split(" ")[1];

const decoded = jwt.verify(
token,
process.env.JWT_SECRET
);

let user;

switch (decoded.role) {
case "employee":
user = await Employee.findById(decoded.id).select("-password");
break;

case "teacher":
user = await Teacher.findById(decoded.id).select("-password");
break;

case "admin":
user = await Admin.findById(decoded.id).select("-password");
break;

default:
return res.status(401).json({
success: false,
message: "Invalid user role",
});
}

if (!user) {
return res.status(401).json({
success: false,
message: "User not found",
});
}

req.user = user;
return next();
}

return res.status(401).json({
success: false,
message: "No token provided",
});

} catch (error) {
console.error("AUTH ERROR:", error);

return res.status(401).json({
success: false,
message: "Token is invalid or expired",
});
}
};

/* ============================================
   INTERNAL HELPER — RESOLVE AUTHENTICATED ROLE
   The role is derived from the model the user
   document was loaded from (Employee / Teacher /
   Admin). This keeps `employee` (participant) as
   the backend role name and avoids trusting the
   free-text Employee.role profile field.
============================================ */
const getUserRole = (user) => {
  if (!user) return null;

  const modelName = user.constructor && user.constructor.modelName;

  if (modelName === "Admin") return "admin";
  if (modelName === "Teacher") return "teacher";
  if (modelName === "Employee") return "employee";

  // Fallback (plain objects / custom user objects)
  if (typeof user.role === "string" && user.role.trim() !== "") {
    return user.role.trim().toLowerCase();
  }

  return null;
};

/* ============================================
   ROLE AUTHORIZATION MIDDLEWARE
   Usage:
     authorize("admin")
     authorize("admin", "teacher")

   No req.user                -> 401
   role not in allowedRoles   -> 403
   role allowed               -> next()
============================================ */
const authorize = (...allowedRoles) => {
  const roles = allowedRoles
    .flat()
    .filter((role) => typeof role === "string" && role.trim() !== "")
    .map((role) => role.trim().toLowerCase());

  return function authorizeMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const role = getUserRole(req.user);

    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    return next();
  };
};

/* ============================================
   OWNERSHIP OR ADMIN MIDDLEWARE
   For routes containing /:id where id is an
   Employee id.

   admin                      -> any employee
   employee + own id          -> next()
   employee + other id        -> 403
   teacher / other roles      -> 403
   no req.user                -> 401
============================================ */
const ownershipOrAdmin = function ownershipOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const role = getUserRole(req.user);

  if (role === "admin") return next();

  const targetId =
    req.params && req.params.id ? String(req.params.id) : null;

  const ownId = String(req.user._id || req.user.id || "");

  if (role === "employee" && targetId && ownId && targetId === ownId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Insufficient permissions",
  });
};

module.exports = { protect, authorize, ownershipOrAdmin, getUserRole };
