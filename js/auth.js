/**
 * MediQ Hospital Appointment Management System
 * Authentication & Session Management Module (Demonstration Only)
 */

(function () {
  'use strict';

  // Immediate redirect for already logged-in users visiting auth pages
  if (window.MediQStorage) {
    const activeSession = window.MediQStorage.getSession();
    if (activeSession) {
      const currentPath = window.location.pathname.split('/').pop() || '';
      const authPages = ['user-login.html', 'user-signup.html', 'admin-login.html', 'admin-signup.html'];
      if (authPages.includes(currentPath)) {
        const dest = activeSession.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
        window.location.replace(dest);
        return;
      }
    }
  }

  // Email format validation regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Toggle password visibility
  function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = 'Hide';
          } else {
            input.type = 'password';
            btn.textContent = 'Show';
          }
        }
      });
    });
  }

  // Handle Patient Signup
  function initPatientSignup() {
    const form = document.getElementById('form-patient-signup');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fullName = document.getElementById('signup-fullname').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const phone = document.getElementById('signup-phone').value.trim();
      const ageStr = document.getElementById('signup-age').value.trim();
      const gender = document.getElementById('signup-gender').value;
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm-password').value;

      // Empty field validations
      if (!fullName || fullName.length === 0) {
        window.MediQ.showToast('Please enter your full name (cannot be spaces only).', 'error');
        return;
      }
      if (!email || email.length === 0) {
        window.MediQ.showToast('Please enter your email address.', 'error');
        return;
      }
      if (!EMAIL_REGEX.test(email)) {
        window.MediQ.showToast('Please enter a valid email address.', 'error');
        return;
      }
      const cleanPhone = phone.replace(/\D/g, '');
      if (!phone || cleanPhone.length !== 10) {
        window.MediQ.showToast('Please enter a valid 10-digit mobile number.', 'error');
        return;
      }
      if (!ageStr || isNaN(ageStr) || parseInt(ageStr, 10) < 1 || parseInt(ageStr, 10) > 130) {
        window.MediQ.showToast('Please enter a valid age between 1 and 130.', 'error');
        return;
      }
      if (!gender || gender.trim().length === 0) {
        window.MediQ.showToast('Please select your gender.', 'error');
        return;
      }
      if (!password || password.trim().length === 0) {
        window.MediQ.showToast('Password cannot be empty or contain only spaces.', 'error');
        return;
      }
      if (password.length < 6) {
        window.MediQ.showToast('Password should be at least 6 characters.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        window.MediQ.showToast('Passwords do not match.', 'error');
        return;
      }

      // Duplicate email check
      const existingUser = window.MediQStorage.findUserByEmail(email);
      if (existingUser) {
        window.MediQ.showToast('An account with this email already exists. Please log in.', 'error');
        return;
      }

      // Create patient
      const user = window.MediQStorage.createUser({
        fullName,
        email,
        phone,
        age: parseInt(ageStr, 10),
        gender,
        password
      });

      // Automatically sign in
      window.MediQStorage.setSession({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: 'patient'
      });

      window.MediQ.showToast('Account created successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'user-dashboard.html';
      }, 700);
    });
  }

  // Handle Patient Login
  function initPatientLogin() {
    const form = document.getElementById('form-patient-login');
    if (!form) return;

    // Quick fill demo button
    const fillDemoBtn = document.getElementById('btn-fill-demo-patient');
    if (fillDemoBtn) {
      fillDemoBtn.addEventListener('click', () => {
        document.getElementById('login-email').value = 'john.doe@example.com';
        document.getElementById('login-password').value = 'Patient@123';
        window.MediQ.showToast('Demo credentials filled!', 'info');
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password || password.trim().length === 0) {
        window.MediQ.showToast('Please enter both email and password (cannot be spaces only).', 'error');
        return;
      }

      if (!EMAIL_REGEX.test(email)) {
        window.MediQ.showToast('Please enter a valid email address.', 'error');
        return;
      }

      const user = window.MediQStorage.findUserByEmail(email);
      if (!user) {
        window.MediQ.showToast('No patient account found with this email. Please check or sign up.', 'error');
        return;
      }

      const passwordHash = window.MediQStorage.hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        window.MediQ.showToast('Incorrect password. Please try again.', 'error');
        return;
      }

      // Login successful
      window.MediQStorage.setSession({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: 'patient'
      });

      window.MediQ.showToast(`Welcome back, ${user.fullName}!`, 'success');
      setTimeout(() => {
        window.location.href = 'user-dashboard.html';
      }, 600);
    });
  }

  // Handle Admin Signup
  function initAdminSignup() {
    const form = document.getElementById('form-admin-signup');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fullName = document.getElementById('signup-admin-fullname').value.trim();
      const email = document.getElementById('signup-admin-email').value.trim();
      const password = document.getElementById('signup-admin-password').value;
      const confirmPassword = document.getElementById('signup-admin-confirm').value;

      if (!fullName || fullName.length === 0) {
        window.MediQ.showToast('Please enter administrator full name (cannot be spaces only).', 'error');
        return;
      }
      if (!email || email.length === 0 || !EMAIL_REGEX.test(email)) {
        window.MediQ.showToast('Please enter a valid institutional admin email.', 'error');
        return;
      }
      if (!password || password.trim().length === 0) {
        window.MediQ.showToast('Password cannot be empty or contain only spaces.', 'error');
        return;
      }
      if (password.length < 6) {
        window.MediQ.showToast('Password must be at least 6 characters.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        window.MediQ.showToast('Passwords do not match.', 'error');
        return;
      }

      const existingAdmin = window.MediQStorage.findAdminByEmail(email);
      if (existingAdmin) {
        window.MediQ.showToast('An administrator with this email already exists.', 'error');
        return;
      }

      const admin = window.MediQStorage.createAdmin({
        fullName,
        email,
        password
      });

      window.MediQStorage.setSession({
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        role: 'admin'
      });

      window.MediQ.showToast('Admin account created! Redirecting to Dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
      }, 700);
    });
  }

  // Handle Admin Login
  function initAdminLogin() {
    const form = document.getElementById('form-admin-login');
    if (!form) return;

    // Quick fill demo button
    const fillDemoBtn = document.getElementById('btn-fill-demo-admin');
    if (fillDemoBtn) {
      fillDemoBtn.addEventListener('click', () => {
        document.getElementById('login-admin-email').value = 'admin@mediq.com';
        document.getElementById('login-admin-password').value = 'Admin@123';
        window.MediQ.showToast('Admin demo credentials filled!', 'info');
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = document.getElementById('login-admin-email').value.trim();
      const password = document.getElementById('login-admin-password').value;

      if (!email || !password || password.trim().length === 0) {
        window.MediQ.showToast('Please enter administrator email and password (cannot be spaces only).', 'error');
        return;
      }

      const admin = window.MediQStorage.findAdminByEmail(email);
      if (!admin) {
        window.MediQ.showToast('No administrator account found with this email.', 'error');
        return;
      }

      const passwordHash = window.MediQStorage.hashPassword(password);
      if (admin.passwordHash !== passwordHash) {
        window.MediQ.showToast('Incorrect password. Please verify your credentials.', 'error');
        return;
      }

      // Admin login successful
      window.MediQStorage.setSession({
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        role: 'admin'
      });

      window.MediQ.showToast(`Logged in as ${admin.fullName}`, 'success');
      setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
      }, 600);
    });
  }

  // Handle Logout Buttons
  function setupLogoutButtons() {
    const logoutBtns = document.querySelectorAll('.btn-action-logout');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.MediQ.showConfirm({
          title: 'Sign Out',
          message: 'Are you sure you want to end your current session?',
          confirmText: 'Sign Out',
          onConfirm: () => {
            const currentSession = window.MediQStorage.getSession();
            const wasAdmin = currentSession && currentSession.role === 'admin';
            window.MediQStorage.clearSession();
            window.MediQ.showToast('You have been logged out.', 'info');
            setTimeout(() => {
              window.location.href = wasAdmin ? 'admin-login.html' : 'index.html';
            }, 400);
          }
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupPasswordToggles();
    initPatientSignup();
    initPatientLogin();
    initAdminSignup();
    initAdminLogin();
    setupLogoutButtons();
  });
})();
