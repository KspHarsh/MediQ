/**
 * MediQ Hospital Appointment Management System
 * Admin Dashboard Module
 */

(function () {
  'use strict';

  function initAdminDashboard() {
    const dashboard = document.getElementById('admin-dashboard-page');
    if (!dashboard) return;

    const session = window.MediQ.requireAuth('admin');
    if (!session) return;

    const adminNameEl = document.getElementById('admin-display-name');
    if (adminNameEl) {
      adminNameEl.textContent = session.fullName || 'Administrator';
    }

    const doctors = window.MediQStorage.getDoctors();
    const slots = window.MediQStorage.getSlots();
    const appointments = window.MediQStorage.getAppointments();

    // Active Doctors
    const activeDoctorsCount = doctors.filter(d => d.active).length;
    const elActiveDocs = document.getElementById('stat-active-doctors');
    if (elActiveDocs) elActiveDocs.textContent = activeDoctorsCount;

    // Date picker for scheduled slots
    const dateInput = document.getElementById('stat-slots-date');
    const today = window.MediQStorage.getLocalDateString ? window.MediQStorage.getLocalDateString() : new Date().toISOString().split('T')[0];
    if (dateInput && !dateInput.value) {
      dateInput.value = today;
    }

    function updateScheduledSlotsCount() {
      const selectedDate = dateInput ? dateInput.value : today;
      const scheduledSlots = slots.filter(s => s.date === selectedDate).length;
      const elSlotsCount = document.getElementById('stat-scheduled-slots');
      if (elSlotsCount) elSlotsCount.textContent = scheduledSlots;
    }

    if (dateInput) {
      dateInput.addEventListener('change', updateScheduledSlotsCount);
    }
    updateScheduledSlotsCount();

    // Requests metrics
    const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
    const approvedCount = appointments.filter(a => a.status === 'APPROVED').length;
    const rejectedCount = appointments.filter(a => a.status === 'REJECTED').length;

    const elPending = document.getElementById('stat-admin-pending');
    const elApproved = document.getElementById('stat-admin-approved');
    const elRejected = document.getElementById('stat-admin-rejected');

    if (elPending) elPending.textContent = pendingCount;
    if (elApproved) elApproved.textContent = approvedCount;
    if (elRejected) elRejected.textContent = rejectedCount;

    // Recent Requests Table (latest 5)
    const recentTableBody = document.getElementById('admin-recent-requests-body');
    const recentEmpty = document.getElementById('admin-recent-empty');

    if (recentTableBody) {
      const sorted = [...appointments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const recent = sorted.slice(0, 5);

      if (recent.length === 0) {
        recentTableBody.innerHTML = '';
        if (recentEmpty) recentEmpty.style.display = 'block';
      } else {
        if (recentEmpty) recentEmpty.style.display = 'none';
        let html = '';

        recent.forEach(apt => {
          const doc = window.MediQStorage.getDoctorById(apt.doctorId);
          const slot = window.MediQStorage.getSlotById(apt.slotId);

          html += `
            <tr>
              <td><strong>${apt.id}</strong></td>
              <td>${escapeHtml(apt.patientDetails.fullName)}</td>
              <td>Dr. ${doc ? escapeHtml(doc.name) : 'Unknown'}</td>
              <td>
                <div>${slot ? window.MediQ.formatDateFriendly(slot.date) : 'N/A'}</div>
                <small>${slot ? `${slot.startTime}–${slot.endTime}` : ''}</small>
              </td>
              <td><small>${window.MediQ.formatTimestampFriendly(apt.createdAt)}</small></td>
              <td>${window.MediQ.getStatusBadge(apt.status)}</td>
              <td>
                <div style="display: flex; gap: 0.35rem;">
                  <a href="appointment-details.html?id=${apt.id}" class="btn btn-sm btn-secondary">Review</a>
                  ${apt.status === 'PENDING' ? `
                    <button class="btn btn-sm btn-success btn-quick-approve" data-id="${apt.id}">Approve</button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `;
        });

        recentTableBody.innerHTML = html;

        // Quick approve listeners
        recentTableBody.querySelectorAll('.btn-quick-approve').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            window.MediQ.showConfirm({
              title: 'Approve Appointment',
              message: `Approve appointment ${id} and issue token?`,
              confirmText: 'Approve',
              onConfirm: () => {
                const res = window.MediQStorage.approveAppointment(id);
                if (res.success) {
                  window.MediQ.showToast('Appointment approved!', 'success');
                  initAdminDashboard();
                } else {
                  window.MediQ.showToast(res.error, 'error');
                }
              }
            });
          });
        });
      }
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

  document.addEventListener('DOMContentLoaded', initAdminDashboard);
})();
