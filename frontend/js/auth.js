/**
 * CrisisLink — Authentication Helper Module
 *
 * Handles JWT token storage, login/logout flows, and page guards.
 */

const API_BASE = 'http://localhost:8000/api';
const TOKEN_KEY = 'crisislink_token';
const USER_KEY = 'crisislink_user';

// ── Token Storage ────────────────────────────────────────────

/** Store JWT + user info after successful login */
export function saveSession(tokenResponse) {
  localStorage.setItem(TOKEN_KEY, tokenResponse.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    role: tokenResponse.role,
    display_name: tokenResponse.display_name,
  }));
}

/** Get stored JWT token */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Get stored user info */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

/** Get the user's role */
export function getRole() {
  const user = getUser();
  return user?.role || null;
}

/** Check if user is authenticated (has a token) */
export function isAuthenticated() {
  return !!getToken();
}

/** Clear session and redirect to landing page */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = 'index.html';
}


// ── API Calls ────────────────────────────────────────────────

/**
 * Login as staff or admin
 * @param {string} username
 * @param {string} password
 * @param {'staff'|'admin'} role
 * @returns {Promise<{access_token, role, display_name}>}
 */
export async function login(username, password, role) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const data = await res.json();
  saveSession(data);
  return data;
}

/**
 * Get a guest token (no credentials needed)
 * @returns {Promise<{access_token, role, display_name}>}
 */
export async function getGuestToken() {
  const res = await fetch(`${API_BASE}/auth/guest-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to get guest token (HTTP ${res.status})`);
  }

  const data = await res.json();
  saveSession(data);
  return data;
}


// ── Page Guards ──────────────────────────────────────────────

/**
 * Protect a page — call at the top of each page's JS module.
 * Redirects to index.html if the user doesn't have the required role.
 *
 * @param  {...string} allowedRoles  e.g. requireAuth('staff', 'admin')
 */
export function requireAuth(...allowedRoles) {
  const role = getRole();
  if (!role || !allowedRoles.includes(role)) {
    // Not authenticated or wrong role — redirect to login
    window.location.href = 'index.html';
    // Throw to halt any further page initialization
    throw new Error('Unauthorized — redirecting to login.');
  }
}
