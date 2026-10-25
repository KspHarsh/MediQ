/**
 * MediQ Hospital Appointment Management System
 * Common UI Components, Navigation, Toast Notifications, and Modals
 */

(function () {
  'use strict';

  // Ensure MediQ namespace exists
  window.MediQ = window.MediQ || {};

  // Toast Notification System
  function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'info', duration = 3500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '🔔';

    const textSpan = document.createElement('span');
    textSpan.style.display = 'flex';
    textSpan.style.alignItems = 'center';
    textSpan.style.gap = '0.5rem';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    textSpan.appendChild(iconSpan);

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    textSpan.appendChild(msgSpan);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '1.2rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#64748B';
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }

  // Confirmation Modal Dialog
  function showConfirm(options) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDanger = false,
      onConfirm = () => {}
    } = options;

    let backdrop = document.getElementById('mediq-confirm-modal');
    if (backdrop) backdrop.remove();

    backdrop = document.createElement('div');
    backdrop.id = 'mediq-confirm-modal';
    backdrop.className = 'modal-backdrop active';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => backdrop.remove());

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.textContent = message;

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = cancelText;
    cancelBtn.addEventListener('click', () => backdrop.remove());

    const actionBtn = document.createElement('button');
    actionBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    actionBtn.textContent = confirmText;
    actionBtn.addEventListener('click', () => {
      backdrop.remove();
      onConfirm();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(actionBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  // Format date helper: "2026-10-26" -> "Oct 26, 2026"
  function formatDateFriendly(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  // Format ISO timestamp: "2026-10-26T10:00:00.000Z" -> "Oct 26, 2026, 10:00 AM"
  function formatTimestampFriendly(isoStr) {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoStr;
    }
  }

  // Status Badge HTML Helper
  function getStatusBadge(status) {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'APPROVED':
        return '<span class="badge badge-approved">Approved</span>';
      case 'PENDING':
        return '<span class="badge badge-pending">Pending</span>';
      case 'REJECTED':
        return '<span class="badge badge-rejected">Rejected</span>';
      case 'EXPIRED':
        return '<span class="badge badge-expired">Expired</span>';
      case 'AVAILABLE':
        return '<span class="badge badge-available">Available</span>';
      case 'BOOKED':
        return '<span class="badge badge-booked">Booked</span>';
      case 'UNAVAILABLE':
        return '<span class="badge badge-unavailable">Unavailable</span>';
      default:
        return `<span class="badge">${status || 'Unknown'}</span>`;
    }
  }

  // Render Top Demo Banner
  function renderDemoBanner() {
    const banner = document.createElement('div');
    banner.className = 'demo-banner';
    banner.innerHTML = `
      <div>
        <strong>Demonstration Static Prototype:</strong> Data stored in browser localStorage.
      </div>
      <div>
        <button id="btn-global-reset-demo">Reset Demo Data</button>
      </div>
    `;
    document.body.prepend(banner);

    const resetBtn = document.getElementById('btn-global-reset-demo');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        showConfirm({
          title: 'Reset Demo Data',
          message: 'This will reset all accounts, doctors, slots, and appointments to original demo records. Continue?',
          confirmText: 'Reset Now',
          isDanger: true,
          onConfirm: () => {
            window.MediQStorage.resetDemoData();
            showToast('Demo data successfully reset!', 'success');
            setTimeout(() => window.location.reload(), 500);
          }
        });
      });
    }
  }

  // Escape HTML utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Setup mobile navigation toggle
  function setupMobileNav() {
    const toggleBtn = document.querySelector('.nav-toggle') || document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links') || document.getElementById('mobile-nav-menu');
    if (toggleBtn && navLinks) {
      toggleBtn.addEventListener('click', () => {
        if (navLinks.classList.contains('hidden')) {
          navLinks.classList.remove('hidden');
        } else if (navLinks.id === 'mobile-nav-menu') {
          navLinks.classList.add('hidden');
        } else {
          navLinks.classList.toggle('show');
        }
      });
    }
  }

  // Universal Logout Handler
  function setupUniversalLogout() {
    document.querySelectorAll('.btn-action-logout').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        showConfirm({
          title: 'Sign Out',
          message: 'Are you sure you want to end your active session?',
          confirmText: 'Sign Out',
          onConfirm: () => {
            if (window.MediQStorage) {
              window.MediQStorage.clearSession();
            }
            showToast('You have been logged out successfully.', 'info');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 350);
          }
        });
      };
    });
  }

  // Dynamic Navigation Synchronizer
  function syncNavigationState() {
    if (!window.MediQStorage) return;
    const session = window.MediQStorage.getSession();

    const pathParts = window.location.pathname.split('/');
    const currentPage = pathParts.pop() || 'index.html';

    // 1. If user is logged in and visits any auth login/signup page, redirect to dashboard automatically
    if (session) {
      const authPages = ['user-login.html', 'user-signup.html', 'admin-login.html', 'admin-signup.html'];
      if (authPages.includes(currentPage)) {
        const dest = session.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
        window.location.replace(dest);
        return;
      }
    }

    // 2. If logged in, remove ALL login/signup buttons and show user profile + dashboard + logout
    if (session) {
      const isPatient = session.role === 'patient';
      const isAdmin = session.role === 'admin';
      const dashboardUrl = isAdmin ? 'admin-dashboard.html' : 'user-dashboard.html';
      const roleLabel = isAdmin ? 'Admin' : 'Patient';
      const badgeStyle = isAdmin ? 'background: #FEF3C7; color: #B45309;' : 'background: #EBF2FF; color: #1971FF;';
      const tagStyle = isAdmin ? 'background: #B45309; color: #FFFFFF;' : 'background: #1971FF; color: #FFFFFF;';

      // Update brand logo links to dashboard when logged in
      document.querySelectorAll('.nav-brand, #about-brand-link, #token-brand-link, #details-brand-link').forEach(brand => {
        if (currentPage !== 'index.html') {
          brand.href = dashboardUrl;
        }
      });

      // Update standard header .nav-actions (e.g. in about.html and portal pages)
      // Skip pages that already have their own role-specific nav chrome
      const ownNavPages = ['user-dashboard.html', 'admin-dashboard.html', 'book-appointment.html',
        'my-appointments.html', 'manage-doctors.html', 'manage-slots.html', 'manage-appointments.html'];
      const skipNavActionsOverride = ownNavPages.includes(currentPage);

      document.querySelectorAll('.nav-actions').forEach(actionsContainer => {
        if (skipNavActionsOverride) return;
        actionsContainer.innerHTML = `
          <span class="user-badge" style="${badgeStyle}; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600;">
            <span class="role-tag" style="${tagStyle}; font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px;">${roleLabel}</span>
            <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(session.fullName || roleLabel)}
            </span>
          </span>
          <a href="${dashboardUrl}" class="btn btn-primary btn-sm">
            ${isAdmin ? 'Admin Dashboard' : 'Dashboard'}
          </a>
          <button type="button" class="btn btn-secondary btn-sm btn-action-logout">Log Out</button>
          <button class="nav-toggle" aria-label="Toggle Navigation">☰</button>
        `;
      });

      // Update Tailwind navigation (e.g. index.html)
      const tailwindShortcuts = document.querySelector('div.hidden.md\\:flex.items-center.bg-surface-container-low');
      if (tailwindShortcuts) {
        tailwindShortcuts.innerHTML = `
          <span class="text-xs font-semibold px-3 py-1.5 text-on-surface flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-primary'}"></span>
            <span>${roleLabel}: <strong>${escapeHtml(session.fullName || roleLabel)}</strong></span>
          </span>
          <a href="${dashboardUrl}" class="text-xs font-semibold px-3 py-1.5 rounded-md text-primary hover:bg-white transition-all">
            Dashboard &rarr;
          </a>
          <button type="button" class="text-xs font-semibold px-3 py-1.5 rounded-md text-red-600 hover:bg-white transition-all btn-action-logout">
            Log Out
          </button>
        `;
      }

      // Live demo banner strip actions in index.html
      const demoStripLinks = document.querySelector('aside[aria-label="Live System Demo Status"] div.flex.items-center.gap-2:last-child');
      if (demoStripLinks) {
        demoStripLinks.innerHTML = `
          <span class="text-on-surface-variant font-medium">Logged in as <strong>${escapeHtml(session.fullName)}</strong>:</span>
          <a href="${dashboardUrl}" class="px-2.5 py-1 rounded bg-primary text-white font-semibold">
            ${isAdmin ? 'Admin Console &rarr;' : 'My Dashboard &rarr;'}
          </a>
          <button type="button" class="px-2 py-1 rounded bg-white text-on-surface font-semibold border border-outline-variant/40 hover:text-error btn-action-logout">
            Log Out
          </button>
        `;
      }

      // Mobile drawer update in index.html
      const mobileNavMenu = document.getElementById('mobile-nav-menu');
      if (mobileNavMenu) {
        const bottomSection = mobileNavMenu.querySelector('div.pt-3');
        if (bottomSection) {
          bottomSection.innerHTML = `
            <div class="px-3 py-1 text-xs font-bold text-on-surface-variant">Logged in as ${escapeHtml(session.fullName)} (${roleLabel})</div>
            <a href="${dashboardUrl}" class="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg bg-surface-container-low text-primary">
              <span class="material-symbols-outlined text-[18px]">dashboard</span> Go to ${isAdmin ? 'Admin Dashboard' : 'Patient Dashboard'}
            </a>
            <button type="button" class="w-full text-left flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg bg-surface-container-low text-error btn-action-logout">
              <span class="material-symbols-outlined text-[18px]">logout</span> Log Out
            </button>
          `;
        }
      }

      // In desktop nav-links: remove login links and "Home" on secondary pages
      // Skip pages that already define their own complete nav-links
      document.querySelectorAll('.nav-links').forEach(nav => {
        if (skipNavActionsOverride) return;
        if (currentPage !== 'index.html') {
          nav.querySelectorAll('a[href="index.html"]').forEach(el => {
            const li = el.closest('li') || el;
            li.remove();
          });
        }

        nav.querySelectorAll('a[href="user-login.html"], a[href="admin-login.html"]').forEach(el => {
          const li = el.closest('li') || el;
          li.remove();
        });

        if (isPatient) {
          if (!nav.querySelector('a[href="user-dashboard.html"]')) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="user-dashboard.html">Dashboard</a>`;
            nav.prepend(li);
          }
          if (!nav.querySelector('a[href="my-appointments.html"]')) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="my-appointments.html">My Appointments</a>`;
            nav.appendChild(li);
          }
        } else if (isAdmin) {
          if (!nav.querySelector('a[href="admin-dashboard.html"]')) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="admin-dashboard.html">Admin Dashboard</a>`;
            nav.prepend(li);
          }
          if (!nav.querySelector('a[href="manage-slots.html"]')) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="manage-slots.html">Manage Slots</a>`;
            nav.appendChild(li);
          }
          if (!nav.querySelector('a[href="manage-appointments.html"]')) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="manage-appointments.html">Requests</a>`;
            nav.appendChild(li);
          }
        }
      });

      // Update all in-page login buttons/links:
      document.querySelectorAll('a[href="user-login.html"]').forEach(btn => {
        btn.href = 'user-dashboard.html';
        const txt = btn.textContent.toLowerCase();
        if (txt.includes('sign in') || txt.includes('login') || txt.includes('portal') || txt.includes('patient')) {
          btn.innerHTML = isPatient ? 'Go to Patient Dashboard &rarr;' : 'Patient Dashboard';
        }
      });

      // Show "My Appointments" nav links on index.html when patient is logged in
      if (isPatient) {
        const desktopMyApt = document.getElementById('desktop-nav-my-appointments');
        if (desktopMyApt) desktopMyApt.style.display = '';
        const mobileMyApt = document.getElementById('mobile-nav-my-appointments');
        if (mobileMyApt) mobileMyApt.style.display = '';
      }

      // Hide all "Sign Up" links when already logged in
      document.querySelectorAll('a[href="user-signup.html"], a[href="admin-signup.html"]').forEach(btn => {
        const li = btn.closest('li');
        if (li && li.parentElement && li.parentElement.classList.contains('space-y-2')) {
          li.style.display = 'none';
        } else {
          btn.style.display = 'none';
        }
      });

      // Replace admin login links
      document.querySelectorAll('a[href="admin-login.html"]').forEach(btn => {
        if (isAdmin) {
          btn.href = 'admin-dashboard.html';
          btn.innerHTML = 'Go to Admin Dashboard &rarr;';
        } else {
          // If logged in as patient, hide or point to dashboard
          const li = btn.closest('li');
          if (li && li.parentElement && li.parentElement.classList.contains('space-y-2')) {
            li.style.display = 'none';
          } else {
            btn.href = 'admin-dashboard.html';
          }
        }
      });

      // Update any footer return-to-home links on secondary pages
      if (currentPage !== 'index.html') {
        document.querySelectorAll('footer a[href="index.html"]').forEach(link => {
          link.href = dashboardUrl;
          link.textContent = isAdmin ? 'Return to Admin Dashboard' : 'Return to Dashboard';
        });
      }
    }

    // Attach universal logout event
    setupUniversalLogout();
  }

  // Session route protector
  function requireAuth(requiredRole = null) {
    const session = window.MediQStorage ? window.MediQStorage.getSession() : null;

    if (!session) {
      const redirectUrl = requiredRole === 'admin' ? 'admin-login.html' : 'user-login.html';
      showToast('Please log in to access this page.', 'warning');
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 350);
      return null;
    }

    if (requiredRole && session.role !== requiredRole) {
      if (session.role === 'admin') {
        showToast('This section is for patients. Redirecting to Admin Dashboard.', 'info');
        setTimeout(() => {
          window.location.href = 'admin-dashboard.html';
        }, 350);
      } else {
        showToast('Restricted to hospital administrators. Redirecting to Patient Dashboard.', 'warning');
        setTimeout(() => {
          window.location.href = 'user-dashboard.html';
        }, 350);
      }
      return null;
    }

    return session;
  }

  // Universal Form & Mobile Input Validation
  function setupInputValidation() {
    // 1. Configure and restrict all phone/mobile fields
    const phoneInputs = document.querySelectorAll('input[type="tel"], input[id*="phone"], input[id*="contact"], input[name*="phone"], input[name*="contact"]');
    phoneInputs.forEach(input => {
      input.maxLength = 10;
      input.setAttribute('maxlength', '10');
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('pattern', '[0-9]{10}');

      input.addEventListener('input', (e) => {
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
        if (e.target.value !== cleaned) {
          e.target.value = cleaned;
        }
      });

      input.addEventListener('keypress', (e) => {
        if (!/\d/.test(e.key) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
          e.preventDefault();
        }
      });
    });

    // 2. Prevent leading whitespace on text inputs
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
    textInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        if (e.target.value.startsWith(' ')) {
          e.target.value = e.target.value.trimStart();
        }
      });
    });

    // 3. Attach capture-phase submit validator to all forms
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (e) => {
        const elements = form.querySelectorAll('input, select, textarea');
        for (const el of elements) {
          if (el.disabled || el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;

          // Check required fields for whitespace only
          if (el.hasAttribute('required')) {
            const rawVal = el.value || '';
            if (rawVal.trim().length === 0) {
              e.preventDefault();
              e.stopImmediatePropagation();
              const label = form.querySelector(`label[for="${el.id}"]`);
              const fieldName = label ? label.textContent.replace('*', '').trim() : (el.placeholder || el.name || 'This field');
              showToast(`${fieldName} cannot be empty or contain only spaces.`, 'error');
              el.focus();
              return false;
            }
          }

          // Check phone/mobile inputs for 10 digits
          const isPhone = el.type === 'tel' || (el.id && (el.id.includes('phone') || el.id.includes('contact'))) || (el.name && (el.name.includes('phone') || el.name.includes('contact')));
          if (isPhone) {
            const digits = (el.value || '').replace(/\D/g, '');
            if (el.hasAttribute('required') || (el.value && el.value.trim().length > 0)) {
              if (digits.length !== 10) {
                e.preventDefault();
                e.stopImmediatePropagation();
                showToast('Mobile number must be a valid 10-digit number.', 'error');
                el.focus();
                return false;
              }
            }
          }
        }
      }, true); // Capture phase
    });
  }

  // Expose on MediQ
  window.MediQ.showToast = showToast;
  window.MediQ.showConfirm = showConfirm;
  window.MediQ.formatDateFriendly = formatDateFriendly;
  window.MediQ.formatTimestampFriendly = formatTimestampFriendly;
  window.MediQ.getStatusBadge = getStatusBadge;
  window.MediQ.renderDemoBanner = renderDemoBanner;
  window.MediQ.setupMobileNav = setupMobileNav;
  window.MediQ.requireAuth = requireAuth;
  window.MediQ.syncNavigationState = syncNavigationState;
  window.MediQ.setupInputValidation = setupInputValidation;

  // Auto-init mobile nav, input validation, and sync navigation state on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // renderDemoBanner(); // Commented out: demo banner disabled
    setupMobileNav();
    setupInputValidation();
    syncNavigationState();
  });
})();
