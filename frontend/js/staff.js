/**
 * CrisisLink — Staff Page Logic
 * Lists active (pending + in-progress) incidents and lets staff update them.
 */

import {
  getAllIncidents, updateIncident, showToast,
  timeAgo, typeEmoji, statusLabel,
  typeCardClass, statusBadgeClass, typeBadgeClass,
} from './api.js';

// ── DOM refs ────────────────────────────────────────────────
const incidentList   = document.getElementById('incidentList');
const refreshBtn     = document.getElementById('refreshBtn');
const lastUpdatedEl  = document.getElementById('lastUpdated');
const totalCountEl   = document.getElementById('staffTotalCount');
const pendingCountEl = document.getElementById('staffPendingCount');
const activeCountEl  = document.getElementById('staffActiveCount');

// Modal
const modal         = document.getElementById('updateModal');
const modalClose    = document.getElementById('modalClose');
const modalLocation = document.getElementById('modalLocation');
const modalType     = document.getElementById('modalType');
const modalStatus   = document.getElementById('modalStatus');
const modalAssigned = document.getElementById('modalAssigned');
const modalSaveBtn  = document.getElementById('modalSaveBtn');

// ── State ────────────────────────────────────────────────────
let currentIncidentId = null;
let refreshTimer = null;
const REFRESH_INTERVAL = 15000;

// ── Init ─────────────────────────────────────────────────────
loadIncidents();
startAutoRefresh();

// ── Load ─────────────────────────────────────────────────────
async function loadIncidents() {
  incidentList.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading incidents…</span></div>`;
  try {
    // Fetch pending + in-progress
    const [pending, active] = await Promise.all([
      getAllIncidents('pending'),
      getAllIncidents('in-progress'),
    ]);
    const all = [...active, ...pending]; // in-progress first

    updateStats(pending, active);
    renderIncidents(all);
    lastUpdatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    incidentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Cannot connect to server</div>
        <div class="empty-text">${err.message}</div>
      </div>`;
    showToast(`Connection error: ${err.message}`, 'error');
  }
}

function updateStats(pending, active) {
  const total = pending.length + active.length;
  if (totalCountEl)   totalCountEl.textContent  = total;
  if (pendingCountEl) pendingCountEl.textContent = pending.length;
  if (activeCountEl)  activeCountEl.textContent  = active.length;
}

function renderIncidents(incidents) {
  if (incidents.length === 0) {
    incidentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">All clear!</div>
        <div class="empty-text">No active incidents right now. Great job, team.</div>
      </div>`;
    return;
  }

  incidentList.innerHTML = incidents.map(inc => `
    <div class="incident-card ${typeCardClass(inc.type)}">
      <div class="incident-header">
        <div class="incident-meta">
          <span class="badge ${typeBadgeClass(inc.type)}">
            <span class="badge-dot"></span>
            ${typeEmoji(inc.type)} ${inc.type}
          </span>
          <span class="incident-location">${escHtml(inc.location)}</span>
        </div>
        <span class="badge ${statusBadgeClass(inc.status)}">
          <span class="badge-dot"></span>
          ${statusLabel(inc.status)}
        </span>
      </div>
      ${inc.description ? `<div class="incident-desc">${escHtml(inc.description)}</div>` : ''}
      <div class="incident-footer">
        <div style="display:flex; gap:12px; align-items:center;">
          <span class="incident-time">🕐 ${timeAgo(inc.created_at)}</span>
          ${inc.assigned_to ? `<span class="incident-assigned">👤 ${escHtml(inc.assigned_to)}</span>` : ''}
        </div>
        <button class="btn btn-secondary btn-ghost" onclick="openModal('${inc.id}','${inc.location}','${inc.type}','${inc.status}','${inc.assigned_to || ''}')">
          ✏️ Update
        </button>
      </div>
    </div>
  `).join('');
}

// ── Modal ────────────────────────────────────────────────────
window.openModal = function(id, location, type, status, assigned) {
  currentIncidentId = id;
  modalLocation.textContent = location;
  modalType.textContent     = `${typeEmoji(type)} ${type}`;
  modalStatus.value         = status;
  modalAssigned.value       = assigned;
  modal.classList.add('open');
  modalAssigned.focus();
};

function closeModal() {
  modal.classList.remove('open');
  currentIncidentId = null;
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

modalSaveBtn.addEventListener('click', async () => {
  if (!currentIncidentId) return;
  const updates = {};
  const newStatus   = modalStatus.value;
  const newAssigned = modalAssigned.value.trim();
  if (newStatus)   updates.status      = newStatus;
  if (newAssigned) updates.assigned_to = newAssigned;

  if (Object.keys(updates).length === 0) {
    showToast('No changes to save.', 'info');
    return;
  }

  modalSaveBtn.disabled = true;
  modalSaveBtn.innerHTML = '<span class="spinner"></span> Saving…';
  try {
    await updateIncident(currentIncidentId, updates);
    showToast('Incident updated successfully!', 'success');
    closeModal();
    await loadIncidents();
  } catch (err) {
    showToast(`Update failed: ${err.message}`, 'error');
  } finally {
    modalSaveBtn.disabled = false;
    modalSaveBtn.innerHTML = '💾 Save Changes';
  }
});

// ── Auto Refresh ─────────────────────────────────────────────
function startAutoRefresh() {
  refreshTimer = setInterval(loadIncidents, REFRESH_INTERVAL);
}

refreshBtn?.addEventListener('click', () => {
  clearInterval(refreshTimer);
  loadIncidents();
  startAutoRefresh();
});

// ── Utility ──────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
