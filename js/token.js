/**
 * MediQ Hospital Appointment Management System
 * Appointment Token Module
 * Renders verified hospital token with print functionality.
 */

(function () {
  'use strict';

  function initTokenPage() {
    const tokenCard = document.getElementById('appointment-token-card');
    if (!tokenCard) return;

    // Must be logged in
    const session = window.MediQStorage.getSession();
    if (!session) {
      window.MediQ.requireAuth();
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const appointmentId = urlParams.get('id');

    if (!appointmentId) {
      tokenCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Missing Appointment Reference</h3>
          <p>No appointment ID was provided in the URL.</p>
          <a href="${session.role === 'admin' ? 'admin-dashboard.html' : 'my-appointments.html'}" class="btn btn-primary">Return to Dashboard</a>
        </div>
      `;
      return;
    }

    const apt = window.MediQStorage.getAppointmentById(appointmentId);
    if (!apt) {
      tokenCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>Appointment Not Found</h3>
          <p>No appointment record exists with ID: <strong>${escapeHtml(appointmentId)}</strong>.</p>
          <a href="${session.role === 'admin' ? 'admin-dashboard.html' : 'my-appointments.html'}" class="btn btn-primary">Return to Dashboard</a>
        </div>
      `;
      return;
    }

    // Role safety check: patients can only see their own token unless admin
    if (session.role === 'patient' && apt.userId !== session.id) {
      tokenCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🚫</div>
          <h3>Access Denied</h3>
          <p>You do not have permission to view this appointment token.</p>
          <a href="my-appointments.html" class="btn btn-primary">My Appointments</a>
        </div>
      `;
      return;
    }

    // Status check: Token is ONLY available when status is APPROVED
    if (apt.status !== 'APPROVED') {
      tokenCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <h3>Token Unavailable</h3>
          <p>
            An official token is only generated once an appointment is <strong>APPROVED</strong> by the hospital administrator.<br>
            Current Status: ${window.MediQ.getStatusBadge(apt.status)}
          </p>
          <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center;">
            <a href="appointment-details.html?id=${apt.id}" class="btn btn-secondary">View Request Details</a>
            <a href="${session.role === 'admin' ? 'manage-appointments.html' : 'my-appointments.html'}" class="btn btn-primary">Back to Appointments</a>
          </div>
        </div>
      `;
      return;
    }

    // Fetch details
    const doctor = window.MediQStorage.getDoctorById(apt.doctorId);
    const slot = window.MediQStorage.getSlotById(apt.slotId);
    let token = window.MediQStorage.getTokenForAppointment(apt.id);

    // If token wasn't generated yet for an approved appointment, generate now
    if (!token) {
      const result = window.MediQStorage.approveAppointment(apt.id);
      token = result.token;
    }

    const doctorImageHtml = (doctor && doctor.profileImage)
      ? `<div style="text-align: center; padding: 0.75rem 0 0.25rem;">
           <img src="${doctor.profileImage}" alt="Dr. ${escapeHtml(doctor.name)}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-primary);">
         </div>`
      : '';

    tokenCard.innerHTML = `
      <div class="token-header">
        <div class="token-header-brand">
          <img src="images/logo.png" alt="MediQ Official Logo">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
            Official OPD Appointment Token
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-secondary); margin-bottom: 0.25rem;">
            Token Number
          </div>
          <div class="token-badge-number">${token ? token.tokenNumber : 'MQ-OPD-01'}</div>
        </div>
      </div>

      ${doctorImageHtml}

      <div class="token-body">
        <div class="token-field">
          <span class="token-field-label">Patient Name</span>
          <span class="token-field-value">${escapeHtml(apt.patientDetails.fullName)}</span>
        </div>
        <div class="token-field">
          <span class="token-field-label">Age & Gender</span>
          <span class="token-field-value">${apt.patientDetails.age} yrs / ${escapeHtml(apt.patientDetails.gender)}</span>
        </div>
        <div class="token-field">
          <span class="token-field-label">Assigned Doctor</span>
          <span class="token-field-value">Dr. ${doctor ? escapeHtml(doctor.name) : 'Medical Specialist'}</span>
        </div>
        <div class="token-field">
          <span class="token-field-label">Clinical Specialty</span>
          <span class="token-field-value" style="color: var(--color-primary);">${doctor ? escapeHtml(doctor.specialty) : 'OPD'}</span>
        </div>
        <div class="token-field">
          <span class="token-field-label">Appointment Date</span>
          <span class="token-field-value">${slot ? window.MediQ.formatDateFriendly(slot.date) : 'N/A'}</span>
        </div>
        <div class="token-field">
          <span class="token-field-label">Scheduled Time Window</span>
          <span class="token-field-value" style="color: #0E7422;">${slot ? `${slot.startTime} – ${slot.endTime} (10 Min)` : 'N/A'}</span>
        </div>
        <div class="token-field">
          <span class="token-field-label">Patient Contact</span>
          <span class="token-field-value">${escapeHtml(apt.patientDetails.contact)}</span>
        </div>
        <div class="token-field">
          <span class="token-field-label">Appointment ID</span>
          <span class="token-field-value"><code>${apt.id}</code></span>
        </div>
      </div>

      <div class="token-qr-placeholder">
        <div style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 700; letter-spacing: 0.1em; color: var(--color-primary); margin-bottom: 0.25rem;">
          [ VERIFIED HOSPITAL TOKEN: ${token ? token.id : 'TOK-DEMO'} ]
        </div>
        <small style="color: var(--color-text-secondary);">
          Present this digital or printed pass at the OPD reception desk 10 minutes prior to your allocated slot.
        </small>
      </div>

      <div class="token-footer">
        <div>
          <span>Issued: ${window.MediQ.formatTimestampFriendly(apt.decisionAt || apt.createdAt)}</span>
        </div>
        <div>
          <span class="demo-disclaimer-pill">Prototype Demonstration Token</span>
        </div>
      </div>

      <div class="no-print" style="margin-top: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap;">
        <a href="${session.role === 'admin' ? 'manage-appointments.html' : 'my-appointments.html'}" class="btn btn-secondary">
          &larr; Back to Appointments
        </a>
        <div style="display: flex; gap: 0.75rem;">
          <a href="appointment-details.html?id=${apt.id}" class="btn btn-secondary">Full Details</a>
          <button id="btn-print-token" class="btn btn-primary">
            🖨️ Print Token
          </button>
        </div>
      </div>
    `;

    const printBtn = document.getElementById('btn-print-token');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', initTokenPage);
})();
