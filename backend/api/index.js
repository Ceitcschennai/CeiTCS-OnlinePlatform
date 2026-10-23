const corsConfig = require("./config/cors");

console.log("ENV CHECK:", {
  MONGO_URI: process.env.MONGO_URI ? "EXISTS ✅" : "MISSING ❌",
});

module.exports = (req, res) => {
  // ✅ CORS — allow approved origins only, with credentials support
  // Handle CORS and OPTIONS FIRST, before requiring/using the Express app
  const origin = req.headers.origin;
  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    // Requests with no Origin (server-to-server, curl, etc.) — allow but don't set restrictive origin
    res.setHeader("Vary", "Origin");
  } else {
    // Reject unapproved origins entirely — never fall back to "*" with credentials
    return res.status(403).json({ error: "CORS origin not allowed" });
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
    return res.end();
  }

  console.log(`📥 ${req.method} ${req.url}`);

  try {
    await new Promise((resolve, reject) => {
      res.on("finish", resolve);
      res.on("error", reject);
      require("../server")(req, res);
    });
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
};