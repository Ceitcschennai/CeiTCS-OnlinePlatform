const app = require("../server");
const connectDB = require("../config/db");

console.log("ENV CHECK:", {
  MONGO_URI: process.env.MONGO_URI ? "EXISTS ✅" : "MISSING ❌",
});

module.exports = async (req, res) => {
  // ✅ Fix CORS — allow all Vercel preview URLs + localhost
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "http://localhost:3000",
    "https://cei-tcs-online-platform-9xjv.vercel.app",
  ];

  if (allowedOrigins.includes(origin) || origin.includes("vercel.app")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

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