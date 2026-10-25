/**
 * MediQ Hospital Appointment Management System
 * Doctor Management Module (Admin Portal)
 */

(function () {
  'use strict';

  let currentDoctors = [];
  let editingDoctorId = null;
  let pendingProfileImage = null; // base64 data URL or null

  // Render Doctor Card
  function createDoctorCard(doc) {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    card.setAttribute('data-id', doc.id);

    const statusBadge = doc.active
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-inactive">Inactive</span>';

    const avatarHtml = doc.profileImage
      ? `<img src="${doc.profileImage}" alt="${escapeHtml(doc.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
      : (doc.avatar || 'DR');

    card.innerHTML = `
      <div class="doctor-card-top">
        <div class="doctor-avatar">${avatarHtml}</div>
        <div class="doctor-info">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <h3 class="doctor-name">${escapeHtml(doc.name)}</h3>
            ${statusBadge}
          </div>
          <div class="doctor-specialty">${escapeHtml(doc.specialty)}</div>
          <div class="doctor-qualifications">${escapeHtml(doc.qualifications)}</div>
        </div>
      </div>
      <div class="doctor-card-body">
        <div class="doctor-meta-item">
          <strong>ID:</strong> <code style="font-size: 0.75rem;">${doc.id}</code>
        </div>
        <div class="doctor-meta-item">
          <strong>Contact:</strong> <span>${escapeHtml(doc.contact || 'N/A')}</span>
        </div>
        <div class="doctor-meta-item">
          <strong>Email:</strong> <span>${escapeHtml(doc.email || 'N/A')}</span>
        </div>
      </div>
      <div class="doctor-card-actions">
        <button class="btn btn-sm btn-secondary btn-toggle-active" data-id="${doc.id}">
          ${doc.active ? 'Mark Inactive' : 'Mark Active'}
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-sm btn-primary btn-edit-doctor" data-id="${doc.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger btn-delete-doctor" data-id="${doc.id}">Remove</button>
        </div>
      </div>
    `;

    // Event listeners
    const toggleBtn = card.querySelector('.btn-toggle-active');
    toggleBtn.addEventListener('click', () => handleToggleDoctorActive(doc.id));

    const editBtn = card.querySelector('.btn-edit-doctor');
    editBtn.addEventListener('click', () => openDoctorModal(doc));

    const deleteBtn = card.querySelector('.btn-delete-doctor');
    deleteBtn.addEventListener('click', () => handleDeleteDoctor(doc.id, doc.name));

    return card;
  }

  // Escape HTML utility to avoid XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render Doctor List with Filters
  function renderDoctorsList() {
    const container = document.getElementById('doctors-grid-container');
    if (!container) return;

    const searchInput = document.getElementById('search-doctor-name');
    const specialtyFilter = document.getElementById('filter-doctor-specialty');
    const statusFilter = document.getElementById('filter-doctor-status');

    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const specVal = specialtyFilter ? specialtyFilter.value : 'ALL';
    const statusVal = statusFilter ? statusFilter.value : 'ALL';

    currentDoctors = window.MediQStorage.getDoctors();

    const filtered = currentDoctors.filter(doc => {
      const matchSearch = doc.name.toLowerCase().includes(searchVal) ||
                          doc.specialty.toLowerCase().includes(searchVal) ||
                          (doc.qualifications && doc.qualifications.toLowerCase().includes(searchVal));

      const matchSpecialty = (specVal === 'ALL' || doc.specialty === specVal);

      const matchStatus = (statusVal === 'ALL') ||
                          (statusVal === 'ACTIVE' && doc.active) ||
                          (statusVal === 'INACTIVE' && !doc.active);

      return matchSearch && matchSpecialty && matchStatus;
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">👨‍⚕️</div>
          <h3>No doctors found</h3>
          <p>No doctor records match the selected search or filter criteria.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(doc => {
      container.appendChild(createDoctorCard(doc));
    });
  }

  // Populate specialty dropdown filter
  function populateSpecialtyDropdown() {
    const specialtyFilter = document.getElementById('filter-doctor-specialty');
    if (!specialtyFilter) return;

    const doctors = window.MediQStorage.getDoctors();
    const specialties = Array.from(new Set(doctors.map(d => d.specialty))).sort();

    specialtyFilter.innerHTML = '<option value="ALL">All Specialties</option>';
    specialties.forEach(spec => {
      const opt = document.createElement('option');
      opt.value = spec;
      opt.textContent = spec;
      specialtyFilter.appendChild(opt);
    });
  }

  // Toggle active/inactive
  function handleToggleDoctorActive(id) {
    const updated = window.MediQStorage.toggleDoctorActive(id);
    if (updated) {
      const stateStr = updated.active ? 'active' : 'inactive';
      window.MediQ.showToast(`Dr. ${updated.name} is now marked ${stateStr}.`, 'info');
      renderDoctorsList();
    }
  }

  // Delete doctor with safety checks
  function handleDeleteDoctor(id, name) {
    window.MediQ.showConfirm({
      title: 'Remove Doctor Record',
      message: `Are you sure you want to remove Dr. ${name}? If this doctor has historical appointments, removal will be prevented to protect patient history.`,
      confirmText: 'Remove Record',
      isDanger: true,
      onConfirm: () => {
        const result = window.MediQStorage.deleteDoctor(id);
        if (result.success) {
          window.MediQ.showToast(`Dr. ${name} was successfully removed.`, 'success');
          populateSpecialtyDropdown();
          renderDoctorsList();
        } else {
          window.MediQ.showToast(result.reason, 'warning');
        }
      }
    });
  }

  // Open Add/Edit Modal
  function openDoctorModal(doc = null) {
    editingDoctorId = doc ? doc.id : null;
    pendingProfileImage = null;
    const modal = document.getElementById('doctor-modal');
    if (!modal) return;

    const title = document.getElementById('doctor-modal-title');
    title.textContent = doc ? 'Edit Doctor Profile' : 'Add New Doctor';

    document.getElementById('doc-name').value = doc ? doc.name : '';
    document.getElementById('doc-specialty').value = doc ? doc.specialty : '';
    document.getElementById('doc-qualifications').value = doc ? doc.qualifications : '';
    document.getElementById('doc-contact').value = doc ? doc.contact : '';
    document.getElementById('doc-email').value = doc ? (doc.email || '') : '';
    document.getElementById('doc-active').checked = doc ? Boolean(doc.active) : true;

    // Reset file input
    const fileInput = document.getElementById('doc-profile-image');
    if (fileInput) fileInput.value = '';

    // Show image preview
    const preview = document.getElementById('doc-image-preview');
    const placeholder = document.getElementById('doc-image-placeholder');
    const removeBtn = document.getElementById('btn-remove-doc-image');

    if (doc && doc.profileImage) {
      pendingProfileImage = doc.profileImage;
      if (preview) preview.innerHTML = `<img src="${doc.profileImage}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      if (removeBtn) removeBtn.style.display = 'inline-block';
    } else {
      const initials = doc ? (doc.avatar || 'DR') : 'DR';
      if (placeholder) placeholder.textContent = initials;
      if (preview) preview.innerHTML = `<span id="doc-image-placeholder">${initials}</span>`;
      if (removeBtn) removeBtn.style.display = 'none';
    }

    modal.classList.add('active');
  }

  function closeDoctorModal() {
    const modal = document.getElementById('doctor-modal');
    if (modal) modal.classList.remove('active');
    editingDoctorId = null;
    pendingProfileImage = null;
  }

  // Initialize Doctor Management Page
  function init() {
    const pageContainer = document.getElementById('manage-doctors-page');
    if (!pageContainer) return;

    // Require admin authentication
    const session = window.MediQ.requireAuth('admin');
    if (!session) return;

    populateSpecialtyDropdown();
    renderDoctorsList();

    // Search and filter listeners
    const searchInput = document.getElementById('search-doctor-name');
    if (searchInput) searchInput.addEventListener('input', renderDoctorsList);

    const specialtyFilter = document.getElementById('filter-doctor-specialty');
    if (specialtyFilter) specialtyFilter.addEventListener('change', renderDoctorsList);

    const statusFilter = document.getElementById('filter-doctor-status');
    if (statusFilter) statusFilter.addEventListener('change', renderDoctorsList);

    // Add Doctor Button
    const addBtn = document.getElementById('btn-add-doctor');
    if (addBtn) addBtn.addEventListener('click', () => openDoctorModal(null));

    // Modal Close
    const closeBtn = document.getElementById('btn-close-doctor-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeDoctorModal);

    const cancelBtn = document.getElementById('btn-cancel-doctor');
    if (cancelBtn) cancelBtn.addEventListener('click', closeDoctorModal);

    // Save Doctor Form
    const form = document.getElementById('form-doctor');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('doc-name').value.trim();
        const specialty = document.getElementById('doc-specialty').value.trim();
        const qualifications = document.getElementById('doc-qualifications').value.trim();
        const contact = document.getElementById('doc-contact').value.trim();
        const email = document.getElementById('doc-email').value.trim();
        const active = document.getElementById('doc-active').checked;

        if (!name || name.length === 0) {
          window.MediQ.showToast('Doctor name cannot be empty or contain only spaces.', 'error');
          return;
        }
        if (!specialty || specialty.length === 0) {
          window.MediQ.showToast('Specialty cannot be empty or contain only spaces.', 'error');
          return;
        }
        if (!qualifications || qualifications.length === 0) {
          window.MediQ.showToast('Qualifications cannot be empty or contain only spaces.', 'error');
          return;
        }
        const cleanContact = contact.replace(/\D/g, '');
        if (!contact || cleanContact.length !== 10) {
          window.MediQ.showToast('Contact phone must be a valid 10-digit mobile number.', 'error');
          return;
        }

        // Duplicate check for new doctor
        if (!editingDoctorId) {
          const allDocs = window.MediQStorage.getDoctors();
          const dup = allDocs.find(d => d.name.toLowerCase() === name.toLowerCase() && d.specialty.toLowerCase() === specialty.toLowerCase());
          if (dup) {
            window.MediQ.showToast('A doctor with this name and specialty already exists.', 'error');
            return;
          }
        }

        const doctorPayload = {
          id: editingDoctorId,
          name,
          specialty,
          qualifications,
          contact,
          email,
          active
        };

        // Attach profile image if one was selected or already exists
        if (pendingProfileImage !== null) {
          doctorPayload.profileImage = pendingProfileImage;
        }

        const saved = window.MediQStorage.saveDoctor(doctorPayload);

        if (saved) {
          window.MediQ.showToast(editingDoctorId ? 'Doctor profile updated.' : 'New doctor added successfully.', 'success');
          closeDoctorModal();
          populateSpecialtyDropdown();
          renderDoctorsList();
        }
      });
    }

    // Profile image file input handler
    const fileInput = document.getElementById('doc-profile-image');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          window.MediQ.showToast('Please select a valid image file.', 'error');
          fileInput.value = '';
          return;
        }

        // Warn if file is large (> 200KB)
        if (file.size > 200 * 1024) {
          window.MediQ.showToast('Image is larger than 200 KB. It will be stored but may impact localStorage capacity.', 'warning');
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
          pendingProfileImage = ev.target.result;
          const preview = document.getElementById('doc-image-preview');
          if (preview) {
            preview.innerHTML = `<img src="${pendingProfileImage}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          }
          const removeBtn = document.getElementById('btn-remove-doc-image');
          if (removeBtn) removeBtn.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
      });
    }

    // Remove image button
    const removeImgBtn = document.getElementById('btn-remove-doc-image');
    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', () => {
        pendingProfileImage = '';
        const preview = document.getElementById('doc-image-preview');
        const nameVal = document.getElementById('doc-name').value.trim();
        const initials = nameVal ? nameVal.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
        if (preview) preview.innerHTML = `<span id="doc-image-placeholder">${initials}</span>`;
        const fileInput2 = document.getElementById('doc-profile-image');
        if (fileInput2) fileInput2.value = '';
        removeImgBtn.style.display = 'none';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
