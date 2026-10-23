export const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
export const API_BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\\/$/, "");

/**
 * Central fetch helper that:
 * 1. Prepends API_BASE to the path
 * 2. Checks that content-type includes application/json BEFORE calling res.json()
 * 3. Throws a readable error if the response is not OK or not JSON
 */
export const apiFetch = async (path, options = {}) => {
  const url = API_BASE + path;
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Response is not JSON: ${contentType || "no content-type header"} - ${text}`);
  }

  return response.json();
};
