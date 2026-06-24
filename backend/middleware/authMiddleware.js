const jwt = require("jsonwebtoken");

const Employee = require("../models/Employee");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");

const protect = async (req, res, next) => {
try {
let token;

```
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
```

} catch (error) {
console.error("AUTH ERROR:", error);

```
return res.status(401).json({
  success: false,
  message: "Token is invalid or expired",
});
```

}
};

module.exports = { protect };
