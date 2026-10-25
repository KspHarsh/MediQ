/**
 * MediQ Hospital Appointment Management System
 * Patient Dashboard & My Appointments Module
 */

(function () {
  'use strict';

  function initPatientDashboard() {
    const dashboard = document.getElementById('patient-dashboard-page');
    if (!dashboard) return;

    const session = window.MediQ.requireAuth('patient');
    if (!session) return;

    // Set Welcome User Name
    const welcomeName = document.getElementById('dashboard-user-name');
    if (welcomeName) {
      welcomeName.textContent = session.fullName || 'Patient';
    }

    const appointments = window.MediQStorage.getAppointments().filter(a => a.userId === session.id);

    // Compute Metrics
    const totalCount = appointments.length;
    const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
    const approvedCount = appointments.filter(a => a.status === 'APPROVED').length;
    const rejectedCount = appointments.filter(a => a.status === 'REJECTED').length;

    const elTotal = document.getElementById('stat-total-apts');
    const elPending = document.getElementById('stat-pending-apts');
    const elApproved = document.getElementById('stat-approved-apts');
    const elRejected = document.getElementById('stat-rejected-apts');

    if (elTotal) elTotal.textContent = totalCount;
    if (elPending) elPending.textContent = pendingCount;
    if (elApproved) elApproved.textContent = approvedCount;
    if (elRejected) elRejected.textContent = rejectedCount;

    // Render Recent Appointments (latest 3)
    const recentContainer = document.getElementById('recent-appointments-container');
    if (recentContainer) {
      const sorted = [...appointments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const recent = sorted.slice(0, 3);

      if (recent.length === 0) {
        recentContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🩺</div>
            <h3>No appointments booked yet</h3>
            <p>You haven't requested any hospital appointments yet. Ready to consult with a specialist?</p>
            <a href="book-appointment.html" class="btn btn-primary">Book Your First Appointment</a>
          </div>
        `;
      } else {
        let html = `
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Doctor & Specialty</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
        `;

        recent.forEach(apt => {
          const doctor = window.MediQStorage.getDoctorById(apt.doctorId);
          const slot = window.MediQStorage.getSlotById(apt.slotId);

          html += `
            <tr>
              <td><strong>${apt.id}</strong></td>
              <td>
                <div style="font-weight: 600;">Dr. ${doctor ? doctor.name : 'Unknown'}</div>
                <small style="color: var(--color-primary);">${doctor ? doctor.specialty : ''}</small>
              </td>
              <td>
                <div>${slot ? window.MediQ.formatDateFriendly(slot.date) : 'N/A'}</div>
                <small style="font-weight: 600;">${slot ? `${slot.startTime} – ${slot.endTime}` : ''}</small>
              </td>
              <td>${window.MediQ.getStatusBadge(apt.status)}</td>
              <td>
                <div style="display: flex; gap: 0.5rem;">
                  <a href="appointment-details.html?id=${apt.id}" class="btn btn-sm btn-secondary">Details</a>
                  ${apt.status === 'APPROVED' ? `<a href="appointment-token.html?id=${apt.id}" class="btn btn-sm btn-primary">Token</a>` : ''}
                </div>
              </td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;

        recentContainer.innerHTML = html;
      }
    }
  }

  // Handle My Appointments Page
  function initMyAppointmentsPage() {
    const myAptsPage = document.getElementById('my-appointments-page');
    if (!myAptsPage) return;

    const session = window.MediQ.requireAuth('patient');
    if (!session) return;

    const tableBody = document.getElementById('my-apts-table-body');
    const emptyContainer = document.getElementById('my-apts-empty');
    const statusFilter = document.getElementById('filter-my-status');

    function renderList() {
      const selectedStatus = statusFilter ? statusFilter.value : 'ALL';
      const allAppointments = window.MediQStorage.getAppointments().filter(a => a.userId === session.id);

      const filtered = allAppointments.filter(apt => {
        return (selectedStatus === 'ALL' || apt.status === selectedStatus);
      });

      // Sort by createdAt descending
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (filtered.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (emptyContainer) emptyContainer.style.display = 'block';
        return;
      }

      if (emptyContainer) emptyContainer.style.display = 'none';

      let html = '';
      filtered.forEach(apt => {
        const doctor = window.MediQStorage.getDoctorById(apt.doctorId);
        const slot = window.MediQStorage.getSlotById(apt.slotId);

        html += `
          <tr>
            <td><strong>${apt.id}</strong></td>
            <td>
              <div style="font-weight: 600;">Dr. ${doctor ? doctor.name : 'Unknown'}</div>
              <small style="color: var(--color-primary);">${doctor ? doctor.specialty : ''}</small>
            </td>
            <td>
              <div>${slot ? window.MediQ.formatDateFriendly(slot.date) : 'N/A'}</div>
              <small style="font-weight: 600;">${slot ? `${slot.startTime} – ${slot.endTime}` : ''}</small>
            </td>
            <td>
              <small style="color: var(--color-text-secondary);">${window.MediQ.formatTimestampFriendly(apt.createdAt)}</small>
            </td>
            <td>${window.MediQ.getStatusBadge(apt.status)}</td>
            <td>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <a href="appointment-details.html?id=${apt.id}" class="btn btn-sm btn-secondary">Details</a>
                ${apt.status === 'APPROVED' ? `
                  <a href="appointment-token.html?id=${apt.id}" class="btn btn-sm btn-primary">Token</a>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      });

      if (tableBody) tableBody.innerHTML = html;
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', renderList);
    }

    renderList();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPatientDashboard();
    initMyAppointmentsPage();
  });
})();
