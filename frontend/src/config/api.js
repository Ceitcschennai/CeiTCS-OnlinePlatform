// ✅ Auto-switches between local and production
// Production URL matches the verified frontend Vercel deployment
const API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://cei-tcs-online-platform-9xjv.vercel.app"
  : "http://localhost:5000";

export default API_BASE_URL;
