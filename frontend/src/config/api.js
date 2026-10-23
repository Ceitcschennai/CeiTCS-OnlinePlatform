// frontend/src/config/api.js
// Single source of truth for the backend URL.

const stripTrailingSlashes = (value) => {
  let result = String(value || "");
  while (result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result;
};

// Development fallback when REACT_APP_API_URL is empty (local dev)
const DEV_FALLBACK = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "";

const API_BASE_URL = stripTrailingSlashes(process.env.REACT_APP_API_URL || DEV_FALLBACK);

export { API_BASE_URL };
export const API_BASE = API_BASE_URL;

// Central fetch helper: verifies the response is JSON before parsing it.
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${path} but got ${res.status} ${contentType || "no content-type"}`
    );
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed with status ${res.status}`);
  }
  return data;
}

// Keeps `import API_BASE_URL from "../config/api"` working in the other files.
export default API_BASE_URL;