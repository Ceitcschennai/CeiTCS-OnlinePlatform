const allowedOrigins = [
  "https://www.ceitcsacademy.com",
  "https://ceitcsacademy.com",
  "http://localhost:3000",
];

if (process.env.FRONTEND_URL) {
  const envOrigins = process.env.FRONTEND_URL.split(",").map((s) => s.trim());
  allowedOrigins.push(...envOrigins);
}

module.exports = async (req, res) => {
  // FIRST: set CORS headers using allow-list
  const origin = req.headers.origin;
  const originIsAllowed = allowedOrigins.includes(origin);
  if (originIsAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const connectDB = require("../config/db");
    await connectDB();
    const app = require("../server");
    return app(req, res);
  } catch (err) {
    console.error("❌ API handler error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || "Internal server error", error: err.message });
    }
  }
};