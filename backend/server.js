
// ─────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────
const dotenv = require("dotenv");
dotenv.config();

// ─────────────────────────────────────────────
// CORE IMPORTS
// ─────────────────────────────────────────────
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const corsConfig = require("./config/cors");

const app = express();

// ─────────────────────────────────────────────
// DATABASE CONNECTION
// ─────────────────────────────────────────────
let isConnected = false;
let connectionPromise = null;

const initDB = async () => {
  if (isConnected) return;

  if (!connectionPromise) {
    connectionPromise = connectDB()
      .then(() => {
        isConnected = true;
        console.log("MongoDB connected");
      })
      .catch((error) => {
        connectionPromise = null;
        console.error("MongoDB connection error:", error.message);
        throw error;
      });
  }

  return connectionPromise;
};

// Initialize the database for local startup.
// The connection is also awaited by middleware for incoming requests.
if (process.env.NODE_ENV !== "production") {
  initDB().catch(() => {
    // The error is already logged by initDB.
  });
}

// Ensure the database is connected before processing API requests.
app.use(async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Database connection unavailable. Please try again later.",
    });
  }
});

// ─────────────────────────────────────────────
// CORS CONFIGURATION
// ─────────────────────────────────────────────
const allowedOrigins = Array.isArray(corsConfig.allowedOrigins)
  ? corsConfig.allowedOrigins
  : [];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header, such as server-to-server calls.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject origins not in the configured allowlist.
    return callback(null, false);
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

// CORS must run before routes and authentication.
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ─────────────────────────────────────────────
// BODY PARSERS
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// API ROUTES
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
app.use("/api/alerts", require("./routes/alertRoutes.js"));
app.use("/api/messages", require("./routes/messageRoutes.js"));
app.use("/api/payments", require("./routes/paymentroutes.js"));

// ─────────────────────────────────────────────
// HEALTH CHECKS
// ─────────────────────────────────────────────
app.get("/api", (req, res) => {
  res.json({ status: "API running" });
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Global error:", err.message);

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "A payment with this transaction ID or bill number already exists. Each transaction ID and bill number must be unique.",
    });
  }

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// ─────────────────────────────────────────────
// VERCEL EXPORT
// ─────────────────────────────────────────────
module.exports = app;