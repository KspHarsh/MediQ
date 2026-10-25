/**
 * MediQ Hospital Appointment Management System
 * Patient Appointment Booking Flow Module
 * Implements strict step-by-step wizard matching clinical workflow.
 */

(function () {
  'use strict';

  // Wizard state
  const bookingState = {
    step: 1,
    specialty: null,
    doctorId: null,
    date: null,
    slotId: null,
    patientDetails: {
      fullName: '',
      age: '',
      gender: 'Male',
      contact: '',
      reason: '',
      notes: ''
    }
  };

  // Stepper UI update
  function updateStepperUI(currentStep) {
    const stepItems = document.querySelectorAll('.booking-stepper .step-item');
    stepItems.forEach((item, index) => {
      const stepNum = index + 1;
      item.classList.remove('active', 'completed');
      if (stepNum === currentStep) {
        item.classList.add('active');
      } else if (stepNum < currentStep) {
        item.classList.add('completed');
      }
    });

    // Step views toggle
    for (let i = 1; i <= 4; i++) {
      const view = document.getElementById(`booking-step-${i}`);
      if (view) {
        view.style.display = (i === currentStep) ? 'block' : 'none';
      }
    }
  }

  // Step 1: Render Specialty Cards
  function renderSpecialties() {
    const container = document.getElementById('specialty-selection-grid');
    if (!container) return;

    const doctors = window.MediQStorage.getDoctors().filter(d => d.active);
    const specialtyMap = {};

    doctors.forEach(doc => {
      specialtyMap[doc.specialty] = (specialtyMap[doc.specialty] || 0) + 1;
    });

    const specialtyIcons = {
      'Cardiology': '❤️',
      'Dermatology': '🩺',
      'Orthopedics': '🦴',
      'Pediatrics': '👶',
      'Neurology': '🧠',
      'General Medicine': '🏥',
      'Gynecology': '🌸',
      'Ophthalmology': '👁️'
    };

    container.innerHTML = '';
    const keys = Object.keys(specialtyMap).sort();

    if (keys.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No active doctors or specialties currently available.</p>
        </div>
      `;
      return;
    }

    keys.forEach(spec => {
      const card = document.createElement('div');
      card.className = `specialty-card ${bookingState.specialty === spec ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="specialty-icon">${specialtyIcons[spec] || '🩺'}</div>
        <div class="specialty-name">${spec}</div>
        <div class="specialty-count">${specialtyMap[spec]} doctor${specialtyMap[spec] > 1 ? 's' : ''} available</div>
      `;

      card.addEventListener('click', () => {
        container.querySelectorAll('.specialty-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        bookingState.specialty = spec;
        bookingState.doctorId = null;
        bookingState.slotId = null;

        // Populate doctors for Step 2
        renderDoctorsForSpecialty(spec);

        // Advance to Step 2
        bookingState.step = 2;
        updateStepperUI(2);
      });

      container.appendChild(card);
    });
  }

  // Step 2: Render Doctors for Selected Specialty
  function renderDoctorsForSpecialty(specialty) {
    const container = document.getElementById('doctor-selection-grid');
    const titleEl = document.getElementById('selected-specialty-title');
    if (!container) return;

    if (titleEl) {
      titleEl.textContent = specialty;
    }

    const doctors = window.MediQStorage.getDoctors().filter(d => d.active && d.specialty === specialty);
    container.innerHTML = '';

    if (doctors.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No active doctors found for ${specialty}.</p>
        </div>
      `;
      return;
    }

    doctors.forEach(doc => {
      const card = document.createElement('div');
      card.className = `doctor-select-card ${bookingState.doctorId === doc.id ? 'selected' : ''}`;

      const avatarHtml = doc.profileImage
        ? `<img src="${doc.profileImage}" alt="Dr. ${doc.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : (doc.avatar || 'DR');

      card.innerHTML = `
        <div class="doctor-avatar">${avatarHtml}</div>
        <div style="flex: 1;">
          <h4 style="font-weight: 700; color: var(--color-text-main); margin-bottom: 0.2rem;">Dr. ${doc.name}</h4>
          <div style="font-size: 0.85rem; color: var(--color-primary); font-weight: 600;">${doc.specialty}</div>
          <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">${doc.qualifications}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        container.querySelectorAll('.doctor-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        bookingState.doctorId = doc.id;
        bookingState.slotId = null;

        // Advance to Step 3
        bookingState.step = 3;
        updateStepperUI(3);
        setupSlotStepUI();
      });

      container.appendChild(card);
    });
  }

  // Step 3: Setup Date & Slots Selection
  function setupSlotStepUI() {
    const dateInput = document.getElementById('booking-date-picker');
    const doctorSummary = document.getElementById('step3-doctor-info');
    const slotContainer = document.getElementById('booking-slots-container');

    const doctor = window.MediQStorage.getDoctorById(bookingState.doctorId);
    if (doctorSummary && doctor) {
      const avatarHtml = doctor.profileImage
        ? `<img src="${doctor.profileImage}" alt="Dr. ${doctor.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : (doctor.avatar || 'DR');

      doctorSummary.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="doctor-avatar" style="width: 44px; height: 44px; font-size: 1rem;">${avatarHtml}</div>
          <div>
            <strong>Dr. ${doctor.name}</strong>
            <span style="color: var(--color-text-secondary); font-size: 0.875rem;">(${doctor.specialty})</span>
          </div>
        </div>
      `;
    }

    if (dateInput) {
      const today = window.MediQStorage.getLocalDateString ? window.MediQStorage.getLocalDateString() : new Date().toISOString().split('T')[0];
      dateInput.min = today;
      if (!bookingState.date || bookingState.date < today) {
        bookingState.date = today;
        dateInput.value = today;
      } else {
        dateInput.value = bookingState.date;
      }

      dateInput.onchange = () => {
        bookingState.date = dateInput.value;
        bookingState.slotId = null;
        renderAvailableSlots();
      };
    }

    renderAvailableSlots();
  }

  // Render Slots for Selected Doctor and Date
  function renderAvailableSlots() {
    const container = document.getElementById('booking-slots-container');
    const btnNext = document.getElementById('btn-step3-next');
    if (!container) return;

    if (btnNext) btnNext.disabled = !bookingState.slotId;

    if (!bookingState.doctorId || !bookingState.date) {
      container.innerHTML = '<p class="form-hint">Please choose a doctor and a date.</p>';
      return;
    }

    const allSlots = window.MediQStorage.getSlots().filter(s => s.doctorId === bookingState.doctorId && s.date === bookingState.date);
    const appointments = window.MediQStorage.getAppointments();

    allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    container.innerHTML = '';

    if (allSlots.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2rem 1rem;">
          <div class="empty-state-icon" style="font-size: 2rem;">🗓️</div>
          <h4>No slots configured for this date</h4>
          <p>Dr. ${window.MediQStorage.getDoctorById(bookingState.doctorId)?.name || 'Doctor'} has no appointment slots scheduled for ${window.MediQ.formatDateFriendly(bookingState.date)}. Please choose another date.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'slot-select-grid';

    let hasAvailable = false;

    allSlots.forEach(slot => {
      const status = window.MediQStorage.deriveSlotStatus(slot, appointments);
      const isSelected = bookingState.slotId === slot.id;

      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.className = `slot-btn is-${status.toLowerCase()} ${isSelected ? 'selected' : ''}`;

      let statusLabel = status;
      if (status === 'AVAILABLE') {
        hasAvailable = true;
        statusLabel = 'Available';
      } else if (status === 'PENDING') {
        statusLabel = 'Pending';
        slotBtn.disabled = true;
      } else if (status === 'BOOKED') {
        statusLabel = 'Booked';
        slotBtn.disabled = true;
      } else {
        statusLabel = 'Unavailable';
        slotBtn.disabled = true;
      }

      slotBtn.innerHTML = `
        <span class="slot-btn-time">${slot.startTime}</span>
        <span class="slot-btn-status">${statusLabel}</span>
      `;

      if (status === 'AVAILABLE') {
        slotBtn.addEventListener('click', () => {
          grid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
          slotBtn.classList.add('selected');
          bookingState.slotId = slot.id;
          if (btnNext) btnNext.disabled = false;
        });
      }

      grid.appendChild(slotBtn);
    });

    container.appendChild(grid);

    if (!hasAvailable) {
      const notice = document.createElement('p');
      notice.className = 'alert alert-warning';
      notice.style.marginTop = '1rem';
      notice.textContent = 'All scheduled slots for this doctor on this date are currently booked or pending review. Please try selecting a different date.';
      container.appendChild(notice);
    }
  }

  // Step 4: Setup Patient Details & Summary Review
  function setupStep4Review() {
    const doctor = window.MediQStorage.getDoctorById(bookingState.doctorId);
    const slot = window.MediQStorage.getSlotById(bookingState.slotId);

    // Summary elements
    document.getElementById('summary-doctor-name').textContent = doctor ? `Dr. ${doctor.name}` : 'N/A';
    document.getElementById('summary-specialty').textContent = doctor ? doctor.specialty : 'N/A';
    document.getElementById('summary-date').textContent = slot ? window.MediQ.formatDateFriendly(slot.date) : 'N/A';
    document.getElementById('summary-time').textContent = slot ? `${slot.startTime} – ${slot.endTime} (10 Minutes)` : 'N/A';

    // Autofill user details from session if available
    const session = window.MediQStorage.getSession();
    const user = session ? window.MediQStorage.findUserByEmail(session.email) : null;

    const nameInput = document.getElementById('patient-name');
    const ageInput = document.getElementById('patient-age');
    const genderInput = document.getElementById('patient-gender');
    const contactInput = document.getElementById('patient-contact');

    if (user && !nameInput.value) {
      nameInput.value = user.fullName || '';
      if (user.age) ageInput.value = user.age;
      if (user.gender) genderInput.value = user.gender;
      if (user.phone) contactInput.value = user.phone.replace(/\D/g, '').slice(-10);
    }
  }

  // Submit Final Booking Request
  function handleBookingSubmission() {
    const fullName = document.getElementById('patient-name').value.trim();
    const ageStr = document.getElementById('patient-age').value.trim();
    const gender = (document.getElementById('patient-gender').value || '').trim();
    const contact = document.getElementById('patient-contact').value.trim();
    const reason = document.getElementById('patient-reason').value.trim();
    const notes = document.getElementById('patient-notes').value.trim();

    if (!fullName || fullName.length === 0) {
      window.MediQ.showToast('Patient name cannot be empty or contain only spaces.', 'error');
      return;
    }
    if (!ageStr || isNaN(ageStr) || parseInt(ageStr, 10) < 1 || parseInt(ageStr, 10) > 130) {
      window.MediQ.showToast('Please enter a valid patient age.', 'error');
      return;
    }
    if (!gender) {
      window.MediQ.showToast('Please select a gender.', 'error');
      return;
    }
    const cleanContact = contact.replace(/\D/g, '');
    if (!contact || cleanContact.length !== 10) {
      window.MediQ.showToast('Contact phone number must be a valid 10-digit mobile number.', 'error');
      return;
    }
    if (!reason || reason.length === 0) {
      window.MediQ.showToast('Reason for visit cannot be empty or contain only spaces.', 'error');
      return;
    }

    const session = window.MediQStorage.getSession();
    if (!session) {
      window.MediQ.showToast('Your session expired. Please log in again.', 'error');
      return;
    }

    // Immediately recheck availability
    const slot = window.MediQStorage.getSlotById(bookingState.slotId);
    if (!slot) {
      window.MediQ.showToast('The selected slot no longer exists.', 'error');
      return;
    }

    const currentSlotStatus = window.MediQStorage.deriveSlotStatus(slot);
    if (currentSlotStatus !== 'AVAILABLE') {
      window.MediQ.showToast(`Selected slot is no longer available (${currentSlotStatus}). Please select another slot.`, 'error');
      bookingState.step = 3;
      updateStepperUI(3);
      renderAvailableSlots();
      return;
    }

    const result = window.MediQStorage.createAppointmentRequest({
      userId: session.id,
      doctorId: bookingState.doctorId,
      slotId: bookingState.slotId,
      patientDetails: {
        fullName,
        age: parseInt(ageStr, 10),
        gender,
        contact,
        reason,
        notes
      }
    });

    if (result.success) {
      window.MediQ.showToast('Appointment request submitted successfully!', 'success');
      // Show confirmation screen or redirect to appointment details
      setTimeout(() => {
        window.location.href = `appointment-details.html?id=${result.appointment.id}&new=1`;
      }, 700);
    } else {
      window.MediQ.showToast(result.error, 'error');
    }
  }

  function init() {
    const pageContainer = document.getElementById('book-appointment-page');
    if (!pageContainer) return;

    // Must be logged in as patient
    const session = window.MediQ.requireAuth('patient');
    if (!session) return;

    renderSpecialties();
    updateStepperUI(1);

    // Step 2 Back
    const btnStep2Back = document.getElementById('btn-step2-back');
    if (btnStep2Back) {
      btnStep2Back.addEventListener('click', () => {
        bookingState.step = 1;
        updateStepperUI(1);
      });
    }

    // Step 3 Back & Next
    const btnStep3Back = document.getElementById('btn-step3-back');
    if (btnStep3Back) {
      btnStep3Back.addEventListener('click', () => {
        bookingState.step = 2;
        updateStepperUI(2);
      });
    }

    const btnStep3Next = document.getElementById('btn-step3-next');
    if (btnStep3Next) {
      btnStep3Next.addEventListener('click', () => {
        if (!bookingState.slotId) {
          window.MediQ.showToast('Please select an available 10-minute appointment slot.', 'error');
          return;
        }
        bookingState.step = 4;
        updateStepperUI(4);
        setupStep4Review();
      });
    }

    // Step 4 Back & Submit
    const btnStep4Back = document.getElementById('btn-step4-back');
    if (btnStep4Back) {
      btnStep4Back.addEventListener('click', () => {
        bookingState.step = 3;
        updateStepperUI(3);
      });
    }

    const formBooking = document.getElementById('form-patient-booking');
    if (formBooking) {
      formBooking.addEventListener('submit', (e) => {
        e.preventDefault();
        handleBookingSubmission();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
