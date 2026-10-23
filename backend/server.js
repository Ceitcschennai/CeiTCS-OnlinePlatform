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

initDB();

// ─────────────────────────────────────────────
// ✅ CORS — use shared config from backend/config/cors.js
// ─────────────────────────────────────────────
const corsConfig = require("./config/cors");

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no Origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      if (corsConfig.allowedOrigins.includes(origin)) return callback(null, true);
      // Reject unapproved origins
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
app.use("/api/alerts", require("./routes/alertRoutes.js"));
app.use("/api/messages", require("./routes/messageRoutes.js"));
app.use("/api/payments", require("./routes/paymentroutes.js"));

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
  if (err.code === 11000) {
    // Mongoose duplicate key error — transactionId or billNumber conflict
    return res.status(409).json({
      success: false,
      message: "A payment with this transaction ID or bill number already exists. Each transaction ID and bill number must be unique.",
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ─────────────────────────────────────────────
// EXPORT FOR VERCEL
// ─────────────────────────────────────────────
module.exports = app;