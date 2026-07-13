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
   console.log('Has auth header');
   token = req.headers.authorization.split(" ")[1];

   const decoded = jwt.verify(
     token,
     process.env.JWT_SECRET
   );

   let user = null;

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
       console.log('Invalid role');
       return false;
   }

   if (!user) {
     console.log('User not found');
     return false;
   }

   req.user = user;
   return next();
 }

 console.log('No token provided - line 56-59');
 return false;
} catch (error) {
 console.error("AUTH ERROR:", error);
 console.log('At catch block - line 62-70');
 return false;
}
};

module.exports = { protect };