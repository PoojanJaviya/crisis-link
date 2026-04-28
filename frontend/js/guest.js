/**
 * CrisisLink — Guest Page Logic
 * Handles the emergency report form (POST /api/incident)
 */

import { createIncident, showToast } from './api.js';
import { requireAuth, getGuestToken, isAuthenticated } from './auth.js';

// ── Auth Guard ──────────────────────────────────────────────
// If came from QR code (?auto=1), get a guest token first
(async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('auto') === '1' && !isAuthenticated()) {
    try {
      await getGuestToken();
      // Remove the query param to avoid re-triggering
      window.history.replaceState({}, '', 'guest.html');
    } catch {
      window.location.href = 'index.html';
      return;
    }
  }

  // Require guest, staff, or admin role
  requireAuth('guest', 'staff', 'admin');
})();

// ── DOM refs ────────────────────────────────────────────────
const typeBtns       = document.querySelectorAll('.type-btn');
const locationInput  = document.getElementById('locationInput');
const descInput      = document.getElementById('descInput');
const submitBtn      = document.getElementById('submitBtn');
const formSection    = document.getElementById('formSection');
const successSection = document.getElementById('successSection');
const incidentIdBox  = document.getElementById('incidentIdEl');
const newReportBtn   = document.getElementById('newReportBtn');

// ── State ────────────────────────────────────────────────────
let selectedType = null;

// ── Type Selection ───────────────────────────────────────────
typeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    typeBtns.forEach(b => {
      b.className = 'type-btn'; // reset
    });
    selectedType = btn.dataset.type;
    btn.classList.add(`active-${selectedType}`);
  });
});

// ── Form Submit ──────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  // Validate
  if (!selectedType) {
    showToast('Please select an emergency type.', 'error');
    return;
  }
  const location = locationInput.value.trim();
  if (!location) {
    locationInput.classList.add('error');
    locationInput.focus();
    showToast('Please enter a location.', 'error');
    return;
  }
  locationInput.classList.remove('error');

  const payload = {
    type: selectedType,
    location,
    description: descInput.value.trim() || undefined,
  };

  setLoading(true);
  try {
    const incident = await createIncident(payload);
    showSuccess(incident);
  } catch (err) {
    showToast(`Failed to report: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
});

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.innerHTML = loading
    ? '<span class="spinner"></span> Reporting…'
    : '🚨 Report Emergency';
}

function showSuccess(incident) {
  formSection.style.display = 'none';
  successSection.style.display = 'flex';
  incidentIdBox.textContent = incident.id;
}

// ── New Report button ────────────────────────────────────────
newReportBtn?.addEventListener('click', () => {
  // Reset
  selectedType = null;
  typeBtns.forEach(b => b.className = 'type-btn');
  locationInput.value = '';
  descInput.value = '';
  formSection.style.display = 'flex';
  successSection.style.display = 'none';
});

// ── Live validation ──────────────────────────────────────────
locationInput.addEventListener('input', () => {
  if (locationInput.value.trim()) locationInput.classList.remove('error');
});
