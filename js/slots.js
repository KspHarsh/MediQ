/**
 * MediQ Hospital Appointment Management System
 * Slot Management Module (Admin Portal)
 * Enforces manual creation of individual 10-minute appointment slots.
 */

(function () {
  'use strict';

  // Helper: format 24h time to 12h display
  function formatTime12h(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  }

  // Populate doctor select dropdowns
  function populateDoctorDropdowns() {
    const doctorSelects = [
      document.getElementById('slot-filter-doctor'),
      document.getElementById('slot-create-doctor')
    ];

    const doctors = window.MediQStorage.getDoctors();

    doctorSelects.forEach(sel => {
      if (!sel) return;
      const isFilter = sel.id === 'slot-filter-doctor';
      sel.innerHTML = isFilter ? '<option value="ALL">All Doctors</option>' : '<option value="">-- Select Doctor --</option>';

      doctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `Dr. ${doc.name} (${doc.specialty})${!doc.active ? ' [Inactive]' : ''}`;
        sel.appendChild(opt);
      });
    });
  }

  // Render Slots Table/Grid
  function renderSlots() {
    const container = document.getElementById('slots-display-container');
    if (!container) return;

    const doctorFilter = document.getElementById('slot-filter-doctor');
    const dateFilter = document.getElementById('slot-filter-date');
    const statusFilter = document.getElementById('slot-filter-status');

    const selectedDoctorId = doctorFilter ? doctorFilter.value : 'ALL';
    const selectedDate = dateFilter ? dateFilter.value : '';
    const selectedStatus = statusFilter ? statusFilter.value : 'ALL';

    const allSlots = window.MediQStorage.getSlots();
    const appointments = window.MediQStorage.getAppointments();

    // Sort slots by date, then startTime
    allSlots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    const filtered = allSlots.filter(slot => {
      const matchDoc = (selectedDoctorId === 'ALL' || slot.doctorId === selectedDoctorId);
      const matchDate = (!selectedDate || slot.date === selectedDate);
      const status = window.MediQStorage.deriveSlotStatus(slot, appointments);
      const matchStatus = (selectedStatus === 'ALL' || status === selectedStatus);

      return matchDoc && matchDate && matchStatus;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h3>No appointment slots found</h3>
          <p>No slots configured for the selected filters. Use the "Add New Slot" form above to create manual 10-minute slots.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Specialty</th>
              <th>Date</th>
              <th>Time Window (10 min)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach(slot => {
      const doctor = window.MediQStorage.getDoctorById(slot.doctorId);
      const status = window.MediQStorage.deriveSlotStatus(slot, appointments);
      const canToggleDisable = (status !== 'BOOKED' && status !== 'PENDING');
      const canDelete = (status !== 'BOOKED' && status !== 'PENDING');

      html += `
        <tr data-slot-id="${slot.id}">
          <td><strong>Dr. ${doctor ? doctor.name : 'Unknown'}</strong></td>
          <td>${doctor ? doctor.specialty : 'N/A'}</td>
          <td>${window.MediQ.formatDateFriendly(slot.date)}</td>
          <td>
            <span class="slot-item-time">
              ${slot.startTime} – ${slot.endTime}
              <small style="color: var(--color-text-secondary); font-weight: normal;">(${formatTime12h(slot.startTime)} - ${formatTime12h(slot.endTime)})</small>
            </span>
          </td>
          <td>${window.MediQ.getStatusBadge(status)}</td>
          <td>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${canToggleDisable ? `
                <button class="btn btn-sm btn-secondary btn-slot-toggle" data-id="${slot.id}">
                  ${slot.disabled ? 'Enable Slot' : 'Disable Slot'}
                </button>
              ` : ''}
              ${canDelete ? `
                <button class="btn btn-sm btn-outline-danger btn-slot-delete" data-id="${slot.id}" title="Delete slot">
                  Delete
                </button>
              ` : `
                <span style="font-size: 0.75rem; color: var(--color-text-muted);">In use</span>
              `}
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

    container.innerHTML = html;

    // Attach event listeners to buttons
    container.querySelectorAll('.btn-slot-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const res = window.MediQStorage.toggleSlotDisabled(id);
        if (res.success) {
          window.MediQ.showToast(`Slot state updated.`, 'info');
          renderSlots();
        } else {
          window.MediQ.showToast(res.error, 'error');
        }
      });
    });

    container.querySelectorAll('.btn-slot-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        window.MediQ.showConfirm({
          title: 'Delete Slot',
          message: 'Are you sure you want to delete this appointment slot?',
          confirmText: 'Delete Slot',
          isDanger: true,
          onConfirm: () => {
            const res = window.MediQStorage.deleteSlot(id);
            if (res.success) {
              window.MediQ.showToast('Slot deleted successfully.', 'success');
              renderSlots();
            } else {
              window.MediQ.showToast(res.error, 'error');
            }
          }
        });
      });
    });
  }

  // Auto-calculate End Time when Start Time changes (start + 10 mins) as a helpful convenience
  function setupStartTimeListener() {
    const startInput = document.getElementById('slot-start-time');
    const endInput = document.getElementById('slot-end-time');
    if (!startInput || !endInput) return;

    startInput.addEventListener('change', () => {
      const val = startInput.value;
      if (val) {
        const startM = window.MediQStorage.timeToMinutes(val);
        if (!isNaN(startM)) {
          const endM = startM + 10;
          endInput.value = window.MediQStorage.minutesToTime(endM);
        }
      }
    });
  }

  // Handle Create Slot Form Submission
  function setupCreateSlotForm() {
    const form = document.getElementById('form-create-slot');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const doctorId = (document.getElementById('slot-create-doctor').value || '').trim();
      const date = (document.getElementById('slot-create-date').value || '').trim();
      const startTime = (document.getElementById('slot-start-time').value || '').trim();
      const endTime = (document.getElementById('slot-end-time').value || '').trim();

      if (!doctorId || !date || !startTime || !endTime) {
        window.MediQ.showToast('Please fill in all slot details (cannot be spaces only).', 'error');
        return;
      }

      // Check 10-minute constraint
      if (!window.MediQStorage.isExactTenMinutes(startTime, endTime)) {
        window.MediQ.showToast(
          `Invalid duration! MediQ strictly requires every slot to be exactly 10 minutes (e.g. 09:00 to 09:10). Provided: ${startTime} to ${endTime}.`,
          'error'
        );
        return;
      }

      // Check date
      if (window.MediQStorage.isDateInPast(date)) {
        window.MediQ.showToast('Appointment slots cannot be created for past dates.', 'error');
        return;
      }

      const result = window.MediQStorage.createSlot({
        doctorId,
        date,
        startTime,
        endTime
      });

      if (result.success) {
        window.MediQ.showToast(`10-minute slot (${startTime}–${endTime}) created successfully!`, 'success');
        // Reset time inputs or advance to next 10 mins
        const nextStartM = window.MediQStorage.timeToMinutes(endTime);
        const nextEndM = nextStartM + 10;
        document.getElementById('slot-start-time').value = window.MediQStorage.minutesToTime(nextStartM);
        document.getElementById('slot-end-time').value = window.MediQStorage.minutesToTime(nextEndM);

        // Also sync filter date and doctor
        const filterDate = document.getElementById('slot-filter-date');
        if (filterDate) filterDate.value = date;
        const filterDoc = document.getElementById('slot-filter-doctor');
        if (filterDoc) filterDoc.value = doctorId;

        renderSlots();
      } else {
        window.MediQ.showToast(result.error, 'error');
      }
    });
  }

  function init() {
    const pageContainer = document.getElementById('manage-slots-page');
    if (!pageContainer) return;

    const session = window.MediQ.requireAuth('admin');
    if (!session) return;

    // Set default min date on date inputs to today
    const today = window.MediQStorage.getLocalDateString ? window.MediQStorage.getLocalDateString() : new Date().toISOString().split('T')[0];
    const createDateInput = document.getElementById('slot-create-date');
    if (createDateInput) {
      createDateInput.min = today;
      createDateInput.value = today;
    }

    populateDoctorDropdowns();
    setupStartTimeListener();
    setupCreateSlotForm();
    renderSlots();

    // Filters event listeners
    const doctorFilter = document.getElementById('slot-filter-doctor');
    if (doctorFilter) doctorFilter.addEventListener('change', renderSlots);

    const dateFilter = document.getElementById('slot-filter-date');
    if (dateFilter) dateFilter.addEventListener('change', renderSlots);

    const statusFilter = document.getElementById('slot-filter-status');
    if (statusFilter) statusFilter.addEventListener('change', renderSlots);

    const clearFiltersBtn = document.getElementById('btn-clear-slot-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        if (doctorFilter) doctorFilter.value = 'ALL';
        if (dateFilter) dateFilter.value = '';
        if (statusFilter) statusFilter.value = 'ALL';
        renderSlots();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
