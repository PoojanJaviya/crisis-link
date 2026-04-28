/**
 * CrisisLink — Admin Dashboard Logic
 * Full command center: stats, filtered table, donut chart, activity feed.
 */

import {
  getAllIncidents, updateIncident, getStaffMembers, showToast,
  timeAgo, formatDate, typeEmoji, statusLabel,
  statusBadgeClass, typeBadgeClass,
} from './api.js';
import { requireAuth, getUser, logout } from './auth.js';

// ── Auth Guard ──────────────────────────────────────────────
requireAuth('admin');

// ── Show user info in navbar ─────────────────────────────────
const user = getUser();
const userBadge = document.getElementById('userBadge');
const userNameEl = document.getElementById('userName');
if (userBadge && user) {
  userNameEl.textContent = user.display_name || 'Admin';
  userBadge.style.display = 'flex';
}

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  logout();
});

// ── DOM refs ────────────────────────────────────────────────
const totalEl      = document.getElementById('statTotal');
const pendingEl    = document.getElementById('statPending');
const progressEl   = document.getElementById('statProgress');
const resolvedEl   = document.getElementById('statResolved');
const tableBody    = document.getElementById('incidentTableBody');
const lastUpdEl    = document.getElementById('adminLastUpdated');
const refreshBtn   = document.getElementById('adminRefreshBtn');
const filterTabs   = document.querySelectorAll('.filter-tab');
const activityFeed = document.getElementById('activityFeed');
const searchInput  = document.getElementById('searchInput');

// Modal
const modal         = document.getElementById('adminModal');
const modalClose    = document.getElementById('adminModalClose');
const modalIncId    = document.getElementById('adminModalIncId');
const modalLoc      = document.getElementById('adminModalLocation');
const modalTypeTxt  = document.getElementById('adminModalType');
const modalStatus   = document.getElementById('adminModalStatus');
const modalAssigned = document.getElementById('adminModalAssigned');
const modalSaveBtn  = document.getElementById('adminModalSave');

// ── State ────────────────────────────────────────────────────
let allIncidents   = [];
let staffList      = [];
let currentFilter  = 'all';
let searchQuery    = '';
let currentEditId  = null;
let refreshTimer   = null;
const INTERVAL     = 10000;

// ── Init ─────────────────────────────────────────────────────
loadStaffList();
loadAll();
startAutoRefresh();

// ── Load Staff Members (for dropdown) ────────────────────────
async function loadStaffList() {
  try {
    staffList = await getStaffMembers();
    populateStaffDropdown();
  } catch (err) {
    console.warn('Could not load staff list:', err.message);
  }
}

function populateStaffDropdown() {
  if (!modalAssigned) return;
  // Keep the "unassigned" option, then add staff
  modalAssigned.innerHTML = '<option value="">— Unassigned —</option>';
  staffList.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.display_name;
    opt.textContent = `👤 ${s.display_name}`;
    modalAssigned.appendChild(opt);
  });
}

// ── Data Loading ─────────────────────────────────────────────
async function loadAll() {
  try {
    allIncidents = await getAllIncidents();
    renderStats();
    renderTable();
    renderChart();
    renderActivity();
    lastUpdEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    tableBody.innerHTML = `
      <tr><td colspan="7" style="text-align:center; padding:48px; color:var(--text3);">
        ⚠️ Cannot connect to backend — ${err.message}
      </td></tr>`;
    showToast(`Connection error: ${err.message}`, 'error');
  }
}

// ── Stats ─────────────────────────────────────────────────────
function renderStats() {
  const total    = allIncidents.length;
  const pending  = allIncidents.filter(i => i.status === 'pending').length;
  const progress = allIncidents.filter(i => i.status === 'in-progress').length;
  const resolved = allIncidents.filter(i => i.status === 'resolved').length;

  animateCount(totalEl,    total);
  animateCount(pendingEl,  pending);
  animateCount(progressEl, progress);
  animateCount(resolvedEl, resolved);
}

function animateCount(el, target) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const step  = Math.ceil(Math.abs(target - start) / 12) || 1;
  let current = start;
  const timer = setInterval(() => {
    current = current < target ? Math.min(current + step, target) : Math.max(current - step, target);
    el.textContent = current;
    if (current === target) clearInterval(timer);
  }, 40);
}

// ── Table ─────────────────────────────────────────────────────
function getFiltered() {
  let list = allIncidents;
  if (currentFilter !== 'all') list = list.filter(i => i.status === currentFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.location.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.assigned_to || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function renderTable() {
  const list = getFiltered();
  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No incidents found</div>
          <div class="empty-text">Try changing the filter or search query.</div>
        </div>
      </td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(inc => `
    <tr>
      <td>
        <span class="badge ${typeBadgeClass(inc.type)}">
          ${typeEmoji(inc.type)} ${inc.type}
        </span>
      </td>
      <td><strong>${escHtml(inc.location)}</strong></td>
      <td style="max-width:200px; color:var(--text2); font-size:0.82rem;">
        ${inc.description ? escHtml(inc.description.substring(0, 60)) + (inc.description.length > 60 ? '…' : '') : '—'}
      </td>
      <td>
        <span class="badge ${statusBadgeClass(inc.status)}">
          <span class="badge-dot"></span>
          ${statusLabel(inc.status)}
        </span>
      </td>
      <td style="color:var(--text2); font-size:0.82rem;">
        ${inc.assigned_to ? `👤 ${escHtml(inc.assigned_to)}` : '<span style="color:var(--text3)">Unassigned</span>'}
      </td>
      <td style="color:var(--text3); font-size:0.78rem; white-space:nowrap;">
        ${timeAgo(inc.created_at)}
      </td>
      <td>
        <button class="btn btn-ghost btn-icon" title="Edit" onclick="openAdminModal('${inc.id}')">✏️</button>
      </td>
    </tr>
  `).join('');
}

// ── Filter tabs ──────────────────────────────────────────────
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderTable();
  });
});

// ── Search ───────────────────────────────────────────────────
searchInput?.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  renderTable();
});

// ── Modal ────────────────────────────────────────────────────
window.openAdminModal = function(id) {
  const inc = allIncidents.find(i => i.id === id);
  if (!inc) return;
  currentEditId            = id;
  modalIncId.textContent   = id.substring(0, 12) + '…';
  modalLoc.textContent     = inc.location;
  modalTypeTxt.textContent = `${typeEmoji(inc.type)} ${inc.type}`;
  modalStatus.value        = inc.status;

  // Set the dropdown value — match by display_name
  const matchingOption = Array.from(modalAssigned.options).find(
    opt => opt.value === inc.assigned_to
  );
  modalAssigned.value = matchingOption ? inc.assigned_to : '';

  modal.classList.add('open');
};

function closeAdminModal() {
  modal.classList.remove('open');
  currentEditId = null;
}

modalClose?.addEventListener('click', closeAdminModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeAdminModal(); });

modalSaveBtn?.addEventListener('click', async () => {
  if (!currentEditId) return;
  const selectedStaff = modalAssigned.value;
  const updates = {
    status:      modalStatus.value,
    assigned_to: selectedStaff || undefined,
  };

  modalSaveBtn.disabled = true;
  modalSaveBtn.innerHTML = '<span class="spinner"></span> Saving…';
  try {
    const updated = await updateIncident(currentEditId, updates);
    // Update local state
    const idx = allIncidents.findIndex(i => i.id === currentEditId);
    if (idx !== -1) allIncidents[idx] = updated;
    showToast('Incident updated!', 'success');
    closeAdminModal();
    renderStats();
    renderTable();
    renderChart();
    renderActivity();
  } catch (err) {
    showToast(`Update failed: ${err.message}`, 'error');
  } finally {
    modalSaveBtn.disabled = false;
    modalSaveBtn.innerHTML = '💾 Save Changes';
  }
});

// ── Donut Chart ──────────────────────────────────────────────
function renderChart() {
  const fire     = allIncidents.filter(i => i.type === 'fire').length;
  const medical  = allIncidents.filter(i => i.type === 'medical').length;
  const security = allIncidents.filter(i => i.type === 'security').length;
  const total    = fire + medical + security;

  const svg    = document.getElementById('donutChart');
  const center = document.getElementById('donutCenterNum');
  const fireLeg    = document.getElementById('legFire');
  const medLeg     = document.getElementById('legMedical');
  const secLeg     = document.getElementById('legSecurity');

  if (center) center.textContent = total;
  if (fireLeg)  fireLeg.textContent  = fire;
  if (medLeg)   medLeg.textContent   = medical;
  if (secLeg)   secLeg.textContent   = security;

  if (!svg || total === 0) return;

  const r   = 60;
  const cx  = 80;
  const cy  = 80;
  const circ = 2 * Math.PI * r;

  const slices = [
    { value: fire,     color: '#ff3b5c', label: 'fire' },
    { value: medical,  color: '#4e8fff', label: 'medical' },
    { value: security, color: '#ffb347', label: 'security' },
  ];

  let offset = 0;
  const paths = slices.map(s => {
    const pct  = s.value / total;
    const dash = circ * pct;
    const gap  = circ - dash;
    const path = `
      <circle cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="${s.color}"
        stroke-width="18"
        stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
        stroke-dashoffset="${-offset.toFixed(2)}"
        stroke-linecap="butt"
        style="transition: stroke-dasharray 0.6s ease;"
      />`;
    offset += dash;
    return path;
  }).join('');

  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18" />
    ${paths}
  `;
}

// ── Activity Feed ────────────────────────────────────────────
function renderActivity() {
  if (!activityFeed) return;
  const recent = [...allIncidents]
    .sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at).getTime();
      const tb = new Date(b.updated_at || b.created_at).getTime();
      return tb - ta;
    })
    .slice(0, 10);

  if (recent.length === 0) {
    activityFeed.innerHTML = `<div class="empty-state" style="padding:24px;"><div class="empty-icon">📭</div><div class="empty-text">No activity yet</div></div>`;
    return;
  }

  activityFeed.innerHTML = recent.map(inc => {
    const isUpdated = !!inc.updated_at;
    const dotColor  = { fire: 'var(--red)', medical: 'var(--blue)', security: 'var(--amber)' }[inc.type] ?? 'var(--text3)';
    const action    = isUpdated ? `Status → ${statusLabel(inc.status)}` : `New ${inc.type} incident`;
    const timeStr   = timeAgo(isUpdated ? inc.updated_at : inc.created_at);
    return `
      <div class="activity-item">
        <div class="activity-dot" style="background:${dotColor};"></div>
        <div>
          <div class="activity-text">${typeEmoji(inc.type)} <strong>${escHtml(inc.location)}</strong> — ${action}</div>
          <div class="activity-time">${timeStr}</div>
        </div>
      </div>`;
  }).join('');
}

// ── Auto Refresh ─────────────────────────────────────────────
function startAutoRefresh() {
  refreshTimer = setInterval(loadAll, INTERVAL);
}

refreshBtn?.addEventListener('click', () => {
  clearInterval(refreshTimer);
  loadAll();
  startAutoRefresh();
  showToast('Dashboard refreshed', 'info', 2000);
});

// ── Utility ──────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
