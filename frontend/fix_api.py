#!/usr/bin/env python3
import os

filepath = r"c:\Users\Rishi\Desktop\CeiTCS online platform backup\frontend\src\config\api.js"

content = r'''/**
 * API base URL configuration
 * Uses REACT_APP_API_URL environment variable or empty string fallback
 * Removes trailing slashes for consistent URL construction
 */
export const API_BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\\/\\/+, "");

/**
 * API base URL as fallback constant
 */
export const API_BASE = API_BASE_URL;

/**
 * Central fetch helper that:
 * 1. Prepends API_BASE to the path
 * 2. Checks that content-type includes application/json BEFORE calling res.json()
 * 3. Throws a readable error if the response is not OK or not JSON
 * @param {string} path - API endpoint path
 * @param {object} [options] - fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiFetch(path, options = {}) {
  const url = API_BASE_URL + path;
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
}

/**
 * Default export for default import compatibility
 * Many files use: import API_BASE_URL from '../config/api'
 */
export default API_BASE_URL;
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully wrote {filepath}")