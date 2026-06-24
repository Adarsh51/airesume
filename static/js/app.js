/**
 * ResumeMatch AI — Shared Utilities
 * Loaded on every page. Provides API communication, dark mode,
 * toast notifications, loading overlay, and navigation helpers.
 */

// ============================================================
// API COMMUNICATION
// ============================================================

/** Base URL for API requests (empty string = same-origin) */
const API_BASE = '';

/**
 * Generic fetch wrapper with error handling.
 * Automatically sets JSON headers unless body is FormData.
 *
 * @param {string} url    — API endpoint path (e.g. '/api/jobs')
 * @param {object} options — fetch options (method, body, headers, etc.)
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiRequest(url, options = {}) {
  const defaultHeaders = {};

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${url}`, config);

  // Attempt to parse the response body as JSON
  let data;
  try {
    data = await response.json();
  } catch {
    // If the response body isn't valid JSON, create a generic payload
    data = { error: response.statusText || 'Unknown error' };
  }

  if (!response.ok) {
    const message = data.error || data.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

// ============================================================
// DARK MODE
// ============================================================

/**
 * Initialise dark-mode support.
 * Priority: localStorage → system preference → light (default).
 */
function initDarkMode() {
  const html = document.documentElement;
  const toggleBtn = document.getElementById('darkModeToggle');

  // Determine initial state
  const stored = localStorage.getItem('darkMode');
  let isDark;

  if (stored !== null) {
    isDark = stored === 'true';
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  applyDarkMode(isDark);

  // Toggle button handler
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isDark = !html.classList.contains('dark');
      applyDarkMode(isDark);
      localStorage.setItem('darkMode', isDark);
    });
  }
}

/**
 * Apply or remove the dark class and update the toggle icon.
 * @param {boolean} dark
 */
function applyDarkMode(dark) {
  const html = document.documentElement;
  const icon = document.querySelector('#darkModeToggle .material-symbols-outlined');

  if (dark) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Swap icon: show "light_mode" when dark, "dark_mode" when light
  if (icon) {
    icon.textContent = dark ? 'light_mode' : 'dark_mode';
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/**
 * Show a toast notification.
 *
 * @param {string} message — Text to display
 * @param {'success'|'error'|'info'|'warning'} type — Visual style
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('Toast container (#toast-container) not found');
    return;
  }

  // Icon & colour mapping
  const config = {
    success: { icon: 'check_circle', bg: 'bg-green-600', border: 'border-green-700' },
    error:   { icon: 'error',        bg: 'bg-red-600',   border: 'border-red-700' },
    info:    { icon: 'info',         bg: 'bg-blue-600',  border: 'border-blue-700' },
    warning: { icon: 'warning',      bg: 'bg-yellow-600', border: 'border-yellow-700' },
  };
  const c = config[type] || config.info;

  // Build toast element
  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white ${c.bg} border ${c.border}
    transform translate-y-2 opacity-0 transition-all duration-300 min-w-[280px] max-w-md`;

  toast.innerHTML = `
    <span class="material-symbols-outlined text-xl">${c.icon}</span>
    <span class="flex-1 text-sm font-medium">${message}</span>
    <button class="toast-close ml-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Close">
      <span class="material-symbols-outlined text-lg">close</span>
    </button>
  `;

  container.appendChild(toast);

  // Close handler
  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  };
  closeBtn.addEventListener('click', dismiss);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
  });

  // Auto-dismiss after 5 seconds
  setTimeout(dismiss, 5000);
}

// ============================================================
// LOADING OVERLAY
// ============================================================

/**
 * Show the full-page loading overlay.
 * @param {string} message — Status text shown beneath the spinner
 */
function showLoading(message = 'Processing...') {
  const overlay = document.getElementById('loading-overlay');
  const text = document.getElementById('loading-text');

  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  }
  if (text) {
    text.textContent = message;
  }
}

/** Hide the full-page loading overlay. */
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
}

// ============================================================
// DATE FORMATTING
// ============================================================

/**
 * Format an ISO date string into a human-readable form.
 * @param {string} dateString — ISO 8601 date string
 * @returns {string} e.g. "Jan 15, 2024"
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

// ============================================================
// NAVIGATION ACTIVE STATE
// ============================================================

/** Highlight the nav link that matches the current URL path. */
function initNavigation() {
  const path = window.location.pathname;
  const navLinks = document.querySelectorAll('nav a, [data-nav-link]');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Exact match for home, prefix match for sub-pages
    const isActive =
      (href === '/' && path === '/') ||
      (href !== '/' && path.startsWith(href));

    if (isActive) {
      link.classList.add('text-primary', 'font-semibold');
      link.classList.remove('text-on-surface-variant');
    }
  });
}

// ============================================================
// INITIALISE ON DOM READY
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initNavigation();
});
