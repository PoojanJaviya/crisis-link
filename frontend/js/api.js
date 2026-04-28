/**
 * CrisisLink — Centralized API Helper
 * All fetch calls to the FastAPI backend live here.
 * JWT Bearer token is automatically attached to every request.
 */

import { getToken } from './auth.js';

const API_BASE = 'http://localhost:8000/api';

/** Generic fetch wrapper with auth header and error handling */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach JWT if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // If 401 Unauthorized — session expired or invalid token
  if (response.status === 401) {
    localStorage.removeItem('crisislink_token');
    localStorage.removeItem('crisislink_user');
    window.location.href = 'index.html';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  // 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

// ── Incidents ────────────────────────────────────────────────

/**
 * POST /api/incident — Create a new incident (Guest)
 * @param {{ type: string, location: string, description?: string }} data
 */
export async function createIncident(data) {
  return apiFetch('/incident', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * GET /api/incidents — Fetch all incidents, newest first (Admin)
 * @param {string|null} status  — optional filter: pending | in-progress | resolved
 */
export async function getAllIncidents(status = null) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/incidents${qs}`);
}

/**
 * GET /api/incident/{id} — Fetch a single incident
 * @param {string} id
 */
export async function getIncident(id) {
  return apiFetch(`/incident/${encodeURIComponent(id)}`);
}

/**
 * PATCH /api/incident/{id} — Update status and/or assigned_to (Staff)
 * @param {string} id
 * @param {{ status?: string, assigned_to?: string }} updates
 */
export async function updateIncident(id, updates) {
  return apiFetch(`/incident/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * GET /api/auth/staff — Fetch list of staff members
 * @returns {Promise<Array<{username: string, display_name: string}>>}
 */
export async function getStaffMembers() {
  return apiFetch('/auth/staff');
}

// ── Utility helpers ──────────────────────────────────────────

/** Format ISO date string to a friendly "X min ago" label */
export function timeAgo(isoString) {
  if (!isoString) return '—';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Format ISO date string to "Apr 28, 14:32" */
export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** Return type emoji */
export function typeEmoji(type) {
  return { fire: '🔥', medical: '🏥', security: '🔒' }[type] ?? '⚠️';
}

/** Return status label */
export function statusLabel(status) {
  return { pending: 'Pending', 'in-progress': 'In Progress', resolved: 'Resolved' }[status] ?? status;
}

/** Return CSS class for incident card border color */
export function typeCardClass(type) {
  return { fire: 'fire-card', medical: 'medical-card', security: 'security-card' }[type] ?? '';
}

/** Return badge CSS class for status */
export function statusBadgeClass(status) {
  return { pending: 'badge-pending', 'in-progress': 'badge-progress', resolved: 'badge-resolved' }[status] ?? '';
}

/** Return badge CSS class for type */
export function typeBadgeClass(type) {
  return { fire: 'badge-fire', medical: 'badge-medical', security: 'badge-security' }[type] ?? '';
}

// ── Toast notification ───────────────────────────────────────

let _toastContainer = null;

function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.className = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration  ms
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = getToastContainer();
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}
