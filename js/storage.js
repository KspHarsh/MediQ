/**
 * MediQ Hospital Appointment Management System
 * Centralized Data Storage & Business Logic Module
 * Uses browser localStorage for prototype persistence.
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEYS = {
    USERS: 'mediq_users',
    ADMINS: 'mediq_admins',
    SESSION: 'mediq_session',
    DOCTORS: 'mediq_doctors',
    SLOTS: 'mediq_slots',
    APPOINTMENTS: 'mediq_appointments',
    TOKENS: 'mediq_tokens',
    INITIALIZED: 'mediq_initialized_v4'
  };

  // Helper: format local date as "YYYY-MM-DD"
  function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper: safe JSON parsing
  function safeGet(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  }

  // Helper: safe JSON saving
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
      return false;
    }
  }

  // Generate Unique ID
  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

  // Simple client-side demonstration hashing (documented as prototype-only)
  function demoHashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `demo_hash_${Math.abs(hash).toString(16)}`;
  }

  // Convert "HH:mm" to total minutes from midnight
  function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return NaN;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return NaN;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return NaN;
    return h * 60 + m;
  }

  // Format minutes from midnight back to "HH:mm"
  function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // Check if slot duration is exactly 10 minutes
  function isExactTenMinutes(startTime, endTime) {
    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(endTime);
    if (isNaN(startM) || isNaN(endM)) return false;
    return (endM - startM) === 10;
  }

  // Check if date string "YYYY-MM-DD" is in the past (strictly before today)
  function isDateInPast(dateStr) {
    if (!dateStr) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d, 0, 0, 0, 0);
    return target < today;
  }

  // Check if a specific slot date and time is in the past
  function isSlotPast(dateStr, endTimeStr) {
    if (!dateStr || !endTimeStr) return true;
    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = endTimeStr.split(':').map(Number);
    const slotEnd = new Date(y, m - 1, d, h, min, 0, 0);
    return slotEnd <= now;
  }

  // Initialize Default Seed Data
  function initializeDemoData(force = false) {
    if (!force && localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      return;
    }

    // Default Demo Admin
    const defaultAdmins = [
      {
        id: 'admin_demo_01',
        fullName: 'Hospital Administrator',
        email: 'admin@mediq.com',
        passwordHash: demoHashPassword('Admin@123'),
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];

    // Default Demo Patient
    const defaultUsers = [
      {
        id: 'user_demo_01',
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '9876543210',
        age: 34,
        gender: 'Male',
        passwordHash: demoHashPassword('Patient@123'),
        role: 'patient',
        createdAt: new Date().toISOString()
      }
    ];

    // Default Doctors across realistic hospital specialties
    const defaultDoctors = [
      {
        id: 'doc_cardio_01',
        name: 'Dr. Sarah Jenkins',
        specialty: 'Cardiology',
        qualifications: 'MD, FACC - Senior Consultant Cardiologist',
        contact: '9876500001',
        email: 's.jenkins@mediq-hospital.org',
        active: true,
        avatar: 'SJ',
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc_derma_02',
        name: 'Dr. Marcus Vance',
        specialty: 'Dermatology',
        qualifications: 'MBBS, DVD, FAAD - Clinical Dermatologist',
        contact: '9876500002',
        email: 'm.vance@mediq-hospital.org',
        active: true,
        avatar: 'MV',
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc_ortho_03',
        name: 'Dr. Elena Rostova',
        specialty: 'Orthopedics',
        qualifications: 'MS (Ortho), MCh - Joint Replacement Specialist',
        contact: '9876500003',
        email: 'e.rostova@mediq-hospital.org',
        active: true,
        avatar: 'ER',
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc_pedia_04',
        name: 'Dr. David Kim',
        specialty: 'Pediatrics',
        qualifications: 'MD (Pediatrics), FAAP - Child Healthcare Specialist',
        contact: '9876500004',
        email: 'd.kim@mediq-hospital.org',
        active: true,
        avatar: 'DK',
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc_neuro_05',
        name: 'Dr. Aisha Patel',
        specialty: 'Neurology',
        qualifications: 'DM (Neurology), Fellowship in Neuro-Electrophysiology',
        contact: '9876500005',
        email: 'a.patel@mediq-hospital.org',
        active: true,
        avatar: 'AP',
        createdAt: new Date().toISOString()
      }
    ];

    // Generate upcoming dates (today, tomorrow, day after) using local calendar
    const today = new Date();
    const d0 = getLocalDateString(today);

    const d1Date = new Date(today);
    d1Date.setDate(today.getDate() + 1);
    const d1 = getLocalDateString(d1Date);

    const d2Date = new Date(today);
    d2Date.setDate(today.getDate() + 2);
    const d2 = getLocalDateString(d2Date);

    // Default 10-Minute Slots for doctors across today (d0), tomorrow (d1), and day after (d2)
    const defaultSlots = [
      // === TODAY (d0) ===
      // Dr. Sarah Jenkins (Cardiology) - d0
      { id: 'slot_d0_01', doctorId: 'doc_cardio_01', date: d0, startTime: '09:00', endTime: '09:10', disabled: false },
      { id: 'slot_d0_02', doctorId: 'doc_cardio_01', date: d0, startTime: '09:10', endTime: '09:20', disabled: false },
      { id: 'slot_d0_03', doctorId: 'doc_cardio_01', date: d0, startTime: '09:20', endTime: '09:30', disabled: false },
      { id: 'slot_d0_04', doctorId: 'doc_cardio_01', date: d0, startTime: '10:00', endTime: '10:10', disabled: false },
      { id: 'slot_d0_05', doctorId: 'doc_cardio_01', date: d0, startTime: '10:10', endTime: '10:20', disabled: false },
      { id: 'slot_d0_06', doctorId: 'doc_cardio_01', date: d0, startTime: '11:00', endTime: '11:10', disabled: false },
      { id: 'slot_d0_07', doctorId: 'doc_cardio_01', date: d0, startTime: '14:00', endTime: '14:10', disabled: false },
      { id: 'slot_d0_08', doctorId: 'doc_cardio_01', date: d0, startTime: '15:00', endTime: '15:10', disabled: false },
      { id: 'slot_d0_09', doctorId: 'doc_cardio_01', date: d0, startTime: '16:00', endTime: '16:10', disabled: false },
      { id: 'slot_d0_10', doctorId: 'doc_cardio_01', date: d0, startTime: '17:00', endTime: '17:10', disabled: false },

      // Dr. Marcus Vance (Dermatology) - d0
      { id: 'slot_d0_11', doctorId: 'doc_derma_02', date: d0, startTime: '10:00', endTime: '10:10', disabled: false },
      { id: 'slot_d0_12', doctorId: 'doc_derma_02', date: d0, startTime: '10:10', endTime: '10:20', disabled: false },
      { id: 'slot_d0_13', doctorId: 'doc_derma_02', date: d0, startTime: '11:00', endTime: '11:10', disabled: false },
      { id: 'slot_d0_14', doctorId: 'doc_derma_02', date: d0, startTime: '15:00', endTime: '15:10', disabled: false },

      // Dr. Elena Rostova (Orthopedics) - d0
      { id: 'slot_d0_15', doctorId: 'doc_ortho_03', date: d0, startTime: '09:30', endTime: '09:40', disabled: false },
      { id: 'slot_d0_16', doctorId: 'doc_ortho_03', date: d0, startTime: '14:00', endTime: '14:10', disabled: false },
      { id: 'slot_d0_17', doctorId: 'doc_ortho_03', date: d0, startTime: '14:10', endTime: '14:20', disabled: false },

      // Dr. David Kim (Pediatrics) - d0
      { id: 'slot_d0_18', doctorId: 'doc_pedia_04', date: d0, startTime: '10:00', endTime: '10:10', disabled: false },
      { id: 'slot_d0_19', doctorId: 'doc_pedia_04', date: d0, startTime: '15:00', endTime: '15:10', disabled: false },

      // Dr. Aisha Patel (Neurology) - d0
      { id: 'slot_d0_20', doctorId: 'doc_neuro_05', date: d0, startTime: '11:00', endTime: '11:10', disabled: false },
      { id: 'slot_d0_21', doctorId: 'doc_neuro_05', date: d0, startTime: '16:00', endTime: '16:10', disabled: false },

      // === TOMORROW (d1) ===
      // Dr. Sarah Jenkins (Cardiology) - d1
      { id: 'slot_01', doctorId: 'doc_cardio_01', date: d1, startTime: '09:00', endTime: '09:10', disabled: false },
      { id: 'slot_02', doctorId: 'doc_cardio_01', date: d1, startTime: '09:10', endTime: '09:20', disabled: false },
      { id: 'slot_03', doctorId: 'doc_cardio_01', date: d1, startTime: '09:20', endTime: '09:30', disabled: false },
      { id: 'slot_04', doctorId: 'doc_cardio_01', date: d1, startTime: '10:00', endTime: '10:10', disabled: false },
      { id: 'slot_05', doctorId: 'doc_cardio_01', date: d1, startTime: '10:10', endTime: '10:20', disabled: false },

      // Dr. Marcus Vance (Dermatology) - d1
      { id: 'slot_06', doctorId: 'doc_derma_02', date: d1, startTime: '11:00', endTime: '11:10', disabled: false },
      { id: 'slot_07', doctorId: 'doc_derma_02', date: d1, startTime: '11:10', endTime: '11:20', disabled: false },
      { id: 'slot_08', doctorId: 'doc_derma_02', date: d1, startTime: '11:20', endTime: '11:30', disabled: false },

      // Dr. Elena Rostova (Orthopedics) - d2
      { id: 'slot_09', doctorId: 'doc_ortho_03', date: d2, startTime: '14:00', endTime: '14:10', disabled: false },
      { id: 'slot_10', doctorId: 'doc_ortho_03', date: d2, startTime: '14:10', endTime: '14:20', disabled: false },
      { id: 'slot_11', doctorId: 'doc_ortho_03', date: d2, startTime: '14:20', endTime: '14:30', disabled: false },

      // Dr. David Kim (Pediatrics) - d1
      { id: 'slot_12', doctorId: 'doc_pedia_04', date: d1, startTime: '15:00', endTime: '15:10', disabled: false },
      { id: 'slot_13', doctorId: 'doc_pedia_04', date: d1, startTime: '15:10', endTime: '15:20', disabled: false }
    ];

    // Default Demonstration Appointments
    const defaultAppointments = [
      {
        id: 'APT-1001',
        userId: 'user_demo_01',
        doctorId: 'doc_cardio_01',
        slotId: 'slot_01',
        patientDetails: {
          fullName: 'John Doe',
          age: 34,
          gender: 'Male',
          contact: '9876543210',
          reason: 'Routine cardiac checkup and mild chest palpitation review.',
          notes: 'Carrying previous ECG reports from last month.'
        },
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        decisionAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        rejectionReason: null,
        tokenId: 'TOK-889101'
      },
      {
        id: 'APT-1002',
        userId: 'user_demo_01',
        doctorId: 'doc_derma_02',
        slotId: 'slot_06',
        patientDetails: {
          fullName: 'John Doe',
          age: 34,
          gender: 'Male',
          contact: '9876543210',
          reason: 'Dry skin rash on arms following seasonal weather change.',
          notes: ''
        },
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        decisionAt: null,
        rejectionReason: null,
        tokenId: null
      }
    ];

    const defaultTokens = [
      {
        id: 'TOK-889101',
        appointmentId: 'APT-1001',
        tokenNumber: 'MQ-CAR-01',
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
      }
    ];

    safeSet(STORAGE_KEYS.ADMINS, defaultAdmins);
    safeSet(STORAGE_KEYS.USERS, defaultUsers);
    safeSet(STORAGE_KEYS.DOCTORS, defaultDoctors);
    safeSet(STORAGE_KEYS.SLOTS, defaultSlots);
    safeSet(STORAGE_KEYS.APPOINTMENTS, defaultAppointments);
    safeSet(STORAGE_KEYS.TOKENS, defaultTokens);
    safeSet(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // Automatically initialize if needed
  initializeDemoData();

  // -------------------------------------------------------------
  // Data Access & Mutation Operations
  // -------------------------------------------------------------

  const MediQStorage = {
    // Re-seed all demo data
    resetDemoData() {
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem(STORAGE_KEYS.ADMINS);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.DOCTORS);
      localStorage.removeItem(STORAGE_KEYS.SLOTS);
      localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
      localStorage.removeItem(STORAGE_KEYS.TOKENS);
      localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
      initializeDemoData(true);
      return true;
    },

    // Session Management
    getSession() {
      return safeGet(STORAGE_KEYS.SESSION, null);
    },

    setSession(userObj) {
      if (!userObj) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      } else {
        safeSet(STORAGE_KEYS.SESSION, userObj);
      }
    },

    clearSession() {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    },

    // Password Hashing Helper
    hashPassword(plain) {
      return demoHashPassword(plain);
    },

    // Users (Patients)
    getUsers() {
      return safeGet(STORAGE_KEYS.USERS, []);
    },

    findUserByEmail(email) {
      if (!email) return null;
      const normalized = email.trim().toLowerCase();
      const users = this.getUsers();
      return users.find(u => u.email.toLowerCase() === normalized) || null;
    },

    createUser(userData) {
      const users = this.getUsers();
      const newUser = {
        id: generateId('user'),
        fullName: userData.fullName.trim(),
        email: userData.email.trim().toLowerCase(),
        phone: userData.phone ? userData.phone.trim() : '',
        age: parseInt(userData.age, 10) || null,
        gender: userData.gender || 'Other',
        passwordHash: demoHashPassword(userData.password),
        role: 'patient',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      safeSet(STORAGE_KEYS.USERS, users);
      return newUser;
    },

    // Admins
    getAdmins() {
      return safeGet(STORAGE_KEYS.ADMINS, []);
    },

    findAdminByEmail(email) {
      if (!email) return null;
      const normalized = email.trim().toLowerCase();
      const admins = this.getAdmins();
      return admins.find(a => a.email.toLowerCase() === normalized) || null;
    },

    createAdmin(adminData) {
      const admins = this.getAdmins();
      const newAdmin = {
        id: generateId('admin'),
        fullName: adminData.fullName.trim(),
        email: adminData.email.trim().toLowerCase(),
        passwordHash: demoHashPassword(adminData.password),
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      admins.push(newAdmin);
      safeSet(STORAGE_KEYS.ADMINS, admins);
      return newAdmin;
    },

    // Doctors
    getDoctors() {
      return safeGet(STORAGE_KEYS.DOCTORS, []);
    },

    getDoctorById(id) {
      const doctors = this.getDoctors();
      return doctors.find(d => d.id === id) || null;
    },

    saveDoctor(doctorData) {
      const doctors = this.getDoctors();
      let savedDoc = null;

      if (doctorData.id) {
        // Edit existing
        const index = doctors.findIndex(d => d.id === doctorData.id);
        if (index !== -1) {
          doctors[index] = {
            ...doctors[index],
            name: doctorData.name.trim(),
            specialty: doctorData.specialty.trim(),
            qualifications: doctorData.qualifications.trim(),
            contact: doctorData.contact.trim(),
            email: doctorData.email ? doctorData.email.trim() : '',
            active: Boolean(doctorData.active)
          };
          // Update profile image only if a new one was provided
          if (doctorData.profileImage !== undefined) {
            doctors[index].profileImage = doctorData.profileImage;
          }
          savedDoc = doctors[index];
        }
      } else {
        // Add new
        const initials = doctorData.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DR';
        savedDoc = {
          id: generateId('doc'),
          name: doctorData.name.trim(),
          specialty: doctorData.specialty.trim(),
          qualifications: doctorData.qualifications.trim(),
          contact: doctorData.contact.trim(),
          email: doctorData.email ? doctorData.email.trim() : '',
          active: true,
          avatar: initials,
          profileImage: doctorData.profileImage || '',
          createdAt: new Date().toISOString()
        };
        doctors.push(savedDoc);
      }

      safeSet(STORAGE_KEYS.DOCTORS, doctors);
      return savedDoc;
    },

    toggleDoctorActive(id) {
      const doctors = this.getDoctors();
      const doc = doctors.find(d => d.id === id);
      if (doc) {
        doc.active = !doc.active;
        safeSet(STORAGE_KEYS.DOCTORS, doctors);
        return doc;
      }
      return null;
    },

    deleteDoctor(id) {
      // Safety rule: check if doctor has appointments
      const appointments = this.getAppointments();
      const hasAppointments = appointments.some(a => a.doctorId === id);
      if (hasAppointments) {
        return {
          success: false,
          reason: 'Doctor has historical appointment records. To preserve patient history, please deactivate this doctor instead of deleting.'
        };
      }

      // Also clean up any orphan slots if never booked
      const slots = this.getSlots().filter(s => s.doctorId !== id);
      safeSet(STORAGE_KEYS.SLOTS, slots);

      const doctors = this.getDoctors().filter(d => d.id !== id);
      safeSet(STORAGE_KEYS.DOCTORS, doctors);
      return { success: true };
    },

    // Slots
    getSlots() {
      return safeGet(STORAGE_KEYS.SLOTS, []);
    },

    getSlotById(id) {
      const slots = this.getSlots();
      return slots.find(s => s.id === id) || null;
    },

    // Check slot overlap for a doctor on a specific date
    checkSlotOverlap(doctorId, date, startTime, endTime, excludeSlotId = null) {
      const startM = timeToMinutes(startTime);
      const endM = timeToMinutes(endTime);
      if (isNaN(startM) || isNaN(endM) || endM <= startM) return true;

      const slots = this.getSlots().filter(s => s.doctorId === doctorId && s.date === date);

      for (const slot of slots) {
        if (excludeSlotId && slot.id === excludeSlotId) continue;
        const curStart = timeToMinutes(slot.startTime);
        const curEnd = timeToMinutes(slot.endTime);

        // Overlap condition: start < curEnd && end > curStart
        if (startM < curEnd && endM > curStart) {
          return true; // Overlap exists!
        }
      }
      return false;
    },

    createSlot(slotData) {
      const { doctorId, date, startTime, endTime } = slotData;

      // Validate 10 minute requirement
      if (!isExactTenMinutes(startTime, endTime)) {
        return {
          success: false,
          error: `Slot duration must be exactly 10 minutes. (Provided: ${startTime} to ${endTime})`
        };
      }

      // Validate date
      if (isDateInPast(date)) {
        return {
          success: false,
          error: 'Cannot create slots for past dates.'
        };
      }

      // Validate doctor
      const doctor = this.getDoctorById(doctorId);
      if (!doctor) {
        return { success: false, error: 'Doctor not found.' };
      }

      // Overlap check
      if (this.checkSlotOverlap(doctorId, date, startTime, endTime)) {
        return {
          success: false,
          error: `A slot overlapping with ${startTime}–${endTime} already exists for this doctor on ${date}.`
        };
      }

      const slots = this.getSlots();
      const newSlot = {
        id: generateId('slot'),
        doctorId,
        date,
        startTime,
        endTime,
        disabled: false,
        createdAt: new Date().toISOString()
      };

      slots.push(newSlot);
      safeSet(STORAGE_KEYS.SLOTS, slots);
      return { success: true, slot: newSlot };
    },

    toggleSlotDisabled(slotId) {
      const slots = this.getSlots();
      const slot = slots.find(s => s.id === slotId);
      if (!slot) return { success: false, error: 'Slot not found' };

      // Prevent disabling if already booked or pending
      const status = this.deriveSlotStatus(slot);
      if (status === 'BOOKED' || status === 'PENDING') {
        return {
          success: false,
          error: `Cannot toggle an active slot with ${status} status.`
        };
      }

      slot.disabled = !slot.disabled;
      safeSet(STORAGE_KEYS.SLOTS, slots);
      return { success: true, slot };
    },

    deleteSlot(slotId) {
      const slot = this.getSlotById(slotId);
      if (!slot) return { success: false, error: 'Slot not found' };

      const status = this.deriveSlotStatus(slot);
      if (status === 'BOOKED' || status === 'PENDING') {
        return {
          success: false,
          error: `Cannot delete slot because an active appointment is currently ${status} for it.`
        };
      }

      const slots = this.getSlots().filter(s => s.id !== slotId);
      safeSet(STORAGE_KEYS.SLOTS, slots);
      return { success: true };
    },

    // Derive Slot Status dynamically from appointments and doctor state
    // Invariants:
    // - Doctor inactive => 'UNAVAILABLE'
    // - slot.disabled => 'UNAVAILABLE'
    // - Strictly past calendar date => 'UNAVAILABLE'
    // - Active APPROVED appointment => 'BOOKED'
    // - Active PENDING appointment => 'PENDING'
    // - Otherwise => 'AVAILABLE'
    deriveSlotStatus(slot, appointmentsList = null) {
      if (!slot) return 'UNAVAILABLE';

      // Check doctor state: inactive doctor makes slot UNAVAILABLE
      const doctor = this.getDoctorById(slot.doctorId);
      if (!doctor || !doctor.active) {
        return 'UNAVAILABLE';
      }

      // Admin manually disabled slot
      if (slot.disabled) {
        return 'UNAVAILABLE';
      }

      // If slot date is strictly in the past (before today)
      if (isDateInPast(slot.date)) {
        return 'UNAVAILABLE';
      }

      const appointments = appointmentsList || this.getAppointments();
      const activeAppt = appointments.find(a => a.slotId === slot.id && (a.status === 'APPROVED' || a.status === 'PENDING'));

      if (activeAppt) {
        if (activeAppt.status === 'APPROVED') return 'BOOKED';
        if (activeAppt.status === 'PENDING') return 'PENDING';
      }

      return 'AVAILABLE';
    },

    // Appointments
    getAppointments() {
      // Auto-expire check: any pending appointment whose slot date is strictly in the past (prior to today) becomes EXPIRED
      const appointments = safeGet(STORAGE_KEYS.APPOINTMENTS, []);
      let hasMutated = false;
      const slots = safeGet(STORAGE_KEYS.SLOTS, []);

      appointments.forEach(apt => {
        if (apt.status === 'PENDING') {
          const slot = slots.find(s => s.id === apt.slotId);
          if (slot && isDateInPast(slot.date)) {
            apt.status = 'EXPIRED';
            apt.decisionAt = new Date().toISOString();
            hasMutated = true;
          }
        }
      });

      if (hasMutated) {
        safeSet(STORAGE_KEYS.APPOINTMENTS, appointments);
      }

      return appointments;
    },

    getAppointmentById(id) {
      const appointments = this.getAppointments();
      return appointments.find(a => a.id === id) || null;
    },

    createAppointmentRequest(requestData) {
      const { userId, doctorId, slotId, patientDetails } = requestData;

      // Recheck slot eligibility and availability immediately before saving
      const slot = this.getSlotById(slotId);
      if (!slot) {
        return { success: false, error: 'Selected slot does not exist.' };
      }

      const status = this.deriveSlotStatus(slot);
      if (status !== 'AVAILABLE') {
        return {
          success: false,
          error: `Selected slot is no longer available (current status: ${status}). Please choose another slot.`
        };
      }

      // Validate patient details
      if (!patientDetails.fullName || !patientDetails.age || !patientDetails.contact || !patientDetails.reason) {
        return { success: false, error: 'Please fill in all required patient details.' };
      }

      const appointments = this.getAppointments();
      const aptNumber = 1000 + appointments.length + 1;
      const newApt = {
        id: `APT-${aptNumber}`,
        userId,
        doctorId,
        slotId,
        patientDetails: {
          fullName: patientDetails.fullName.trim(),
          age: parseInt(patientDetails.age, 10),
          gender: patientDetails.gender || 'Other',
          contact: patientDetails.contact.trim(),
          reason: patientDetails.reason.trim(),
          notes: patientDetails.notes ? patientDetails.notes.trim() : ''
        },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        decisionAt: null,
        rejectionReason: null,
        tokenId: null
      };

      appointments.push(newApt);
      safeSet(STORAGE_KEYS.APPOINTMENTS, appointments);
      return { success: true, appointment: newApt };
    },

    // Admin Action: Approve Appointment
    approveAppointment(appointmentId) {
      const appointments = this.getAppointments();
      const apt = appointments.find(a => a.id === appointmentId);
      if (!apt) return { success: false, error: 'Appointment not found.' };

      if (apt.status !== 'PENDING') {
        return { success: false, error: `Appointment is not pending (current status: ${apt.status}).` };
      }

      const slot = this.getSlotById(apt.slotId);
      if (!slot) {
        return { success: false, error: 'Associated slot no longer exists.' };
      }

      const doctor = this.getDoctorById(apt.doctorId);
      if (!doctor || !doctor.active) {
        return { success: false, error: 'Doctor is currently inactive or unavailable.' };
      }

      // Check if slot date has already passed
      if (isDateInPast(slot.date)) {
        apt.status = 'EXPIRED';
        safeSet(STORAGE_KEYS.APPOINTMENTS, appointments);
        return { success: false, error: 'Appointment date has already passed and is expired.' };
      }

      // Check if another appointment already booked this slot
      const conflictingApproved = appointments.find(a => a.id !== apt.id && a.slotId === slot.id && a.status === 'APPROVED');
      if (conflictingApproved) {
        return { success: false, error: 'This slot is already booked by another approved appointment.' };
      }

      // Generate Confirmation Token
      const tokens = safeGet(STORAGE_KEYS.TOKENS, []);
      const tokenId = `TOK-${Math.floor(100000 + Math.random() * 900000)}`;
      const docCode = doctor.specialty.substring(0, 3).toUpperCase();
      const tokenNumber = `MQ-${docCode}-${Math.floor(10 + Math.random() * 90)}`;

      const newToken = {
        id: tokenId,
        appointmentId: apt.id,
        tokenNumber,
        createdAt: new Date().toISOString()
      };
      tokens.push(newToken);
      safeSet(STORAGE_KEYS.TOKENS, tokens);

      apt.status = 'APPROVED';
      apt.decisionAt = new Date().toISOString();
      apt.tokenId = tokenId;

      safeSet(STORAGE_KEYS.APPOINTMENTS, appointments);
      return { success: true, appointment: apt, token: newToken };
    },

    // Admin Action: Reject Appointment
    rejectAppointment(appointmentId, reason = '') {
      const appointments = this.getAppointments();
      const apt = appointments.find(a => a.id === appointmentId);
      if (!apt) return { success: false, error: 'Appointment not found.' };

      if (apt.status !== 'PENDING') {
        return { success: false, error: `Appointment is not pending (current status: ${apt.status}).` };
      }

      apt.status = 'REJECTED';
      apt.decisionAt = new Date().toISOString();
      apt.rejectionReason = reason ? reason.trim() : 'Slot unavailable or schedule conflict.';

      safeSet(STORAGE_KEYS.APPOINTMENTS, appointments);
      return { success: true, appointment: apt };
    },

    // Tokens
    getTokens() {
      return safeGet(STORAGE_KEYS.TOKENS, []);
    },

    getTokenById(id) {
      const tokens = this.getTokens();
      return tokens.find(t => t.id === id) || null;
    },

    getTokenForAppointment(appointmentId) {
      const tokens = this.getTokens();
      return tokens.find(t => t.appointmentId === appointmentId) || null;
    },

    // Utility: Check if duration is 10 mins & date helpers
    isExactTenMinutes,
    timeToMinutes,
    minutesToTime,
    isDateInPast,
    isSlotPast,
    getLocalDateString
  };

  // Expose on window
  window.MediQStorage = MediQStorage;
})();
