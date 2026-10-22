const app = require("../server");
const connectDB = require("../config/db");

console.log("ENV CHECK:", {
  MONGO_URI: process.env.MONGO_URI ? "EXISTS ✅" : "MISSING ❌",
});

module.exports = async (req, res) => {
  // ✅ CORS — allow approved origins only, with credentials support
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "http://localhost:3000",
    "https://www.ceitcsacademy.com",
    "https://ceitcsacademy.com",
    "https://cei-tcs-online-platform-9xjv.vercel.app",
  ];

  // Allow requests with no Origin (server-to-server, curl, etc.)
  if (!origin) {
    res.setHeader("Vary", "Origin");
    // Continue to DB connect + route handling without CORS restrictions
  } else if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    // Reject unapproved origins entirely — never fall back to "*" with credentials
    return res.status(403).json({ error: "CORS origin not allowed" });
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.url === "/" || req.url === "/api" || req.url === "/api/") {
    return res.status(200).send("Backend is running!");
  }

  console.log(`📥 ${req.method} ${req.url}`);

  try {
    // ✅ Fix: always attempt DB connect (connectDB handles the isConnected check internally)
    await connectDB();

    await new Promise((resolve, reject) => {
      res.on("finish", resolve);
      res.on("error", reject);
      app(req, res);
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
};