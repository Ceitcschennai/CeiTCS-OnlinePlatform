const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");

dotenv.config();

const app = express();

// ─────────────────────────────────────────────
// ✅ CONNECT DATABASE (FOR BOTH LOCAL & VERCEL)
// ─────────────────────────────────────────────
let isConnected = false;

const initDB = async () => {
  if (isConnected) return;

  try {
    await connectDB();
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
  }
};

// connect immediately (important for Vercel cold start)
initDB();

// ─────────────────────────────────────────────
// ✅ CORS
// ─────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "https://ceitcsprofessionaltraining.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);

app.options("*", cors());

// ─────────────────────────────────────────────
// BODY PARSER
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
app.use("/api/auth", require("./routes/authroutes.js"));
app.use("/api/materials", require("./routes/materialroutes.js"));
app.use("/api/employee", require("./routes/employeeroutes.js"));
app.use("/api/liveclasses", require("./routes/liveclassroutes.js"));
app.use("/api/admin", require("./routes/adminroutes.js"));
app.use("/api/assignments", require("./routes/assignmentroutes.js"));
app.use("/api/attendance", require("./routes/attendanceroutes.js"));
app.use("/api/queries", require("./routes/queryroutes.js"));
app.use("/api/subjects", require("./routes/subjectroutes.js"));
app.use("/api/Courses", require("./routes/Courseroutes.js"));
app.use("/api/teacher", require("./routes/teacherroutes.js"));
app.use("/api/notifications", require("./routes/notificationroutes.js"));
app.use("/api/schedules", require("./routes/scheduleroutes.js"));
app.use("/api/Notification", require("./routes/notificationroutes.js"));
app.use("/api/mentor-requests", require("./routes/mentorrequestroutes.js"));

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/api", (req, res) => {
  res.json({ status: "API running ✅" });
});

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("🔥 Global error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ─────────────────────────────────────────────
// LOCAL SERVER
// ─────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ─────────────────────────────────────────────
// EXPORT FOR VERCEL
// ─────────────────────────────────────────────
module.exports = app;