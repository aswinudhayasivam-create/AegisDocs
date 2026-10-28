/**
 * API Service Configuration & Client
 */

// Relative address: works when the server hosts the app (npm start) and, in dev mode, through the Vite proxy
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// The login token is saved with the user in the browser (see App.jsx)
function authHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem('docuauth_user') || 'null');
    return user && user.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch (_) {
    return {};
  }
}

// If the server says "not logged in" on a protected call, the saved login is old: clear it
function handleExpired(res, url) {
  if (res.status === 401 && !url.startsWith('/auth/')) {
    localStorage.removeItem('docuauth_user');
    window.location.reload();
  }
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) }
    });
    handleExpired(res, url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}: Request failed`);
    return data;
  } catch (err) {
    console.error(`API Error on ${url}:`, err);
    throw err;
  }
}

export const api = {
  // ── Authentication ───────────────────────────────────────────────────────
  login: (role, username, password) => 
    fetchJson('/auth/login', { method: 'POST', body: JSON.stringify({ role, username, password }) }),

  checkEmail: (email, role) =>
    fetchJson(`/auth/check-email?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`),

  register: (payload) => 
    fetchJson('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  resetPassword: (payload) => 
    fetchJson('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Applications ────────────────────────────────────────────────────────
  getApplications:   ()         => fetchJson('/applications'),
  getApplication:    (id)       => fetchJson(`/applications/${id}`),
  getCategories:     ()         => fetchJson('/applications/categories/list'),
  createApplication: (payload)  => fetchJson('/applications', { method: 'POST', body: JSON.stringify(payload) }),
  importApplication: (data) => fetchJson('/applications/import', { method: 'POST', body: JSON.stringify(data) }),
  getValidation:     (appId)    => fetchJson(`/applications/${appId}/validation`),

  // ── Authority: decision & report ─────────────────────────────────────────
  // Update status: ACCEPTED | REJECTED | UNDER_REVIEW | SUBMITTED
  updateApplicationStatus: (id, status) =>
    fetchJson(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Download full PDF report (triggers browser save-as dialog)
  downloadReport: async (appId) => {
    const res = await fetch(`${API_BASE}/applications/${appId}/report`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to generate report');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `verification_report_${appId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ── Documents & OCR ──────────────────────────────────────────────────────
  uploadDocument: async (formData) => {
    const res  = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: formData, headers: authHeaders() });
    handleExpired(res, '/documents/upload');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
  getDocument: (id)                       => fetchJson(`/documents/${id}`),
  updateField: (docId, fieldName, newVal) => fetchJson(`/documents/${docId}/fields`, {
    method: 'PUT',
    body: JSON.stringify({ fieldName, newValue: newVal })
  }),

  // Open an uploaded file in a new tab (the file needs the login token, so a plain link will not work)
  openDocumentFile: async (docId) => {
    const res = await fetch(`${API_BASE}/documents/${docId}/file`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Could not open the file.');
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  },

  // ── Demo ─────────────────────────────────────────────────────────────────
  seedDemo:  () => fetchJson('/demo/seed',  { method: 'POST' }),
  resetDemo: () => fetchJson('/demo/reset', { method: 'POST' }),
};
