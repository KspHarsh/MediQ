/**
 * MediQ Hospital Appointment Management System
 * Admin Appointment Requests Management Module
 */

(function () {
  'use strict';

  // Calculate time remaining for a pending appointment until slot start time
  function calculateTimeRemaining(slotDate, slotStartTime) {
    if (!slotDate || !slotStartTime) return 'N/A';
    const now = new Date();
    const [h, m] = slotStartTime.split(':').map(Number);
    const target = new Date(slotDate + 'T00:00:00');
    target.setHours(h, m, 0, 0);

    const diffMs = target - now;
    if (diffMs <= 0) {
      return '<span style="color: var(--color-status-rejected); font-weight: 600;">Time Passed (Expired)</span>';
    }

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 24) {
      const days = Math.floor(diffHrs / 24);
      return `${days}d ${diffHrs % 24}h remaining`;
    }
    return `${diffHrs}h ${diffMins}m remaining`;
  }

  // Populate filter dropdowns
  function populateFilters() {
    const doctorFilter = document.getElementById('filter-apt-doctor');
    const specialtyFilter = document.getElementById('filter-apt-specialty');

    const doctors = window.MediQStorage.getDoctors();

    if (doctorFilter) {
      doctorFilter.innerHTML = '<option value="ALL">All Doctors</option>';
      doctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `Dr. ${doc.name}`;
        doctorFilter.appendChild(opt);
      });
    }

    if (specialtyFilter) {
      const specs = Array.from(new Set(doctors.map(d => d.specialty))).sort();
      specialtyFilter.innerHTML = '<option value="ALL">All Specialties</option>';
      specs.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        specialtyFilter.appendChild(opt);
      });
    }
  }

  // Render Admin Appointments List
  function renderAppointments() {
    const tableBody = document.getElementById('appointments-table-body');
    const emptyContainer = document.getElementById('appointments-empty');
    if (!tableBody) return;

    const statusFilter = document.getElementById('filter-apt-status')?.value || 'ALL';
    const doctorFilter = document.getElementById('filter-apt-doctor')?.value || 'ALL';
    const specialtyFilter = document.getElementById('filter-apt-specialty')?.value || 'ALL';
    const dateFilter = document.getElementById('filter-apt-date')?.value || '';

    const allAppointments = window.MediQStorage.getAppointments();

    // Sort: Pending first, then by date descending
    allAppointments.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const filtered = allAppointments.filter(apt => {
      const doctor = window.MediQStorage.getDoctorById(apt.doctorId);
      const slot = window.MediQStorage.getSlotById(apt.slotId);

      const matchStatus = (statusFilter === 'ALL' || apt.status === statusFilter);
      const matchDoc = (doctorFilter === 'ALL' || apt.doctorId === doctorFilter);
      const matchSpec = (specialtyFilter === 'ALL' || (doctor && doctor.specialty === specialtyFilter));
      const matchDate = (!dateFilter || (slot && slot.date === dateFilter));

      return matchStatus && matchDoc && matchSpec && matchDate;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyContainer) emptyContainer.style.display = 'block';
      return;
    }

    if (emptyContainer) emptyContainer.style.display = 'none';

    filtered.forEach(apt => {
      const doctor = window.MediQStorage.getDoctorById(apt.doctorId);
      const slot = window.MediQStorage.getSlotById(apt.slotId);
      const row = document.createElement('tr');

      const timeRemaining = apt.status === 'PENDING' && slot
        ? calculateTimeRemaining(slot.date, slot.startTime)
        : '-';

      row.innerHTML = `
        <td><strong>${apt.id}</strong></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(apt.patientDetails.fullName)}</div>
          <small style="color: var(--color-text-secondary);">${escapeHtml(apt.patientDetails.contact)} | Age: ${apt.patientDetails.age}</small>
        </td>
        <td>
          <div>Dr. ${doctor ? escapeHtml(doctor.name) : 'Unknown'}</div>
          <small style="color: var(--color-primary); font-weight: 500;">${doctor ? escapeHtml(doctor.specialty) : 'N/A'}</small>
        </td>
        <td>
          <div>${slot ? window.MediQ.formatDateFriendly(slot.date) : 'N/A'}</div>
          <small style="font-weight: 600;">${slot ? `${slot.startTime} – ${slot.endTime}` : 'N/A'}</small>
        </td>
        <td>
          <small style="color: var(--color-text-secondary);">${window.MediQ.formatTimestampFriendly(apt.createdAt)}</small>
        </td>
        <td>
          ${window.MediQ.getStatusBadge(apt.status)}
          ${apt.status === 'PENDING' ? `<div style="font-size: 0.75rem; margin-top: 0.25rem;">${timeRemaining}</div>` : ''}
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
            <a href="appointment-details.html?id=${apt.id}" class="btn btn-sm btn-secondary">Details</a>
            ${apt.status === 'PENDING' ? `
              <button class="btn btn-sm btn-success btn-approve-apt" data-id="${apt.id}">Approve</button>
              <button class="btn btn-sm btn-outline-danger btn-reject-apt" data-id="${apt.id}">Reject</button>
            ` : ''}
            ${apt.status === 'APPROVED' ? `
              <a href="appointment-token.html?id=${apt.id}" class="btn btn-sm btn-primary">Token</a>
            ` : ''}
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });

    // Attach approve handlers
    tableBody.querySelectorAll('.btn-approve-apt').forEach(btn => {
      btn.addEventListener('click', () => {
        const aptId = btn.getAttribute('data-id');
        handleApproveAppointment(aptId);
      });
    });

    // Attach reject handlers
    tableBody.querySelectorAll('.btn-reject-apt').forEach(btn => {
      btn.addEventListener('click', () => {
        const aptId = btn.getAttribute('data-id');
        handleRejectAppointment(aptId);
      });
    });
  }

  function handleApproveAppointment(aptId) {
    window.MediQ.showConfirm({
      title: 'Approve Appointment Request',
      message: `Are you sure you want to approve appointment ${aptId}? This will book the 10-minute slot and issue an official appointment confirmation token.`,
      confirmText: 'Approve & Issue Token',
      onConfirm: () => {
        const result = window.MediQStorage.approveAppointment(aptId);
        if (result.success) {
          window.MediQ.showToast(`Appointment ${aptId} approved! Token #${result.token.tokenNumber} issued.`, 'success');
          renderAppointments();
        } else {
          window.MediQ.showToast(`Approval failed: ${result.error}`, 'error');
          renderAppointments();
        }
      }
    });
  }

  function handleRejectAppointment(aptId) {
    const reason = prompt('Please enter a reason for rejecting this appointment (optional):', 'Slot unavailable or schedule conflict.');
    if (reason === null) return; // User cancelled prompt

    window.MediQ.showConfirm({
      title: 'Reject Appointment',
      message: `Are you sure you want to reject appointment ${aptId}? The reserved slot will be released back to the schedule.`,
      confirmText: 'Reject Appointment',
      isDanger: true,
      onConfirm: () => {
        const result = window.MediQStorage.rejectAppointment(aptId, reason);
        if (result.success) {
          window.MediQ.showToast(`Appointment ${aptId} has been rejected.`, 'info');
          renderAppointments();
        } else {
          window.MediQ.showToast(`Rejection failed: ${result.error}`, 'error');
        }
      }
    });
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

  function init() {
    const pageContainer = document.getElementById('manage-appointments-page');
    if (!pageContainer) return;

    const session = window.MediQ.requireAuth('admin');
    if (!session) return;

    populateFilters();
    renderAppointments();

    const statusFilter = document.getElementById('filter-apt-status');
    if (statusFilter) statusFilter.addEventListener('change', renderAppointments);

    const doctorFilter = document.getElementById('filter-apt-doctor');
    if (doctorFilter) doctorFilter.addEventListener('change', renderAppointments);

    const specialtyFilter = document.getElementById('filter-apt-specialty');
    if (specialtyFilter) specialtyFilter.addEventListener('change', renderAppointments);

    const dateFilter = document.getElementById('filter-apt-date');
    if (dateFilter) dateFilter.addEventListener('change', renderAppointments);

    const clearBtn = document.getElementById('btn-clear-apt-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (statusFilter) statusFilter.value = 'ALL';
        if (doctorFilter) doctorFilter.value = 'ALL';
        if (specialtyFilter) specialtyFilter.value = 'ALL';
        if (dateFilter) dateFilter.value = '';
        renderAppointments();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
