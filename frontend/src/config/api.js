// ✅ Auto-switches between local and production
const API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://ceitcsprofessionaltraining.vercel.app"
  : "http://localhost:5000";

export default API_BASE_URL;
