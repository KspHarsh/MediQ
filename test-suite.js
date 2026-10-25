/**
 * Comprehensive Automated Verification and Functional Test Suite for MediQ
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('1. STATIC SYNTAX & REFERENCE INTEGRITY CHECKS');
console.log('====================================================');

// 1. Check all JavaScript files syntax
const jsDir = path.join(__dirname, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

jsFiles.forEach(file => {
  const filePath = path.join(jsDir, file);
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    new vm.Script(code);
    assert(true, `Syntax Valid: js/${file}`);
  } catch (err) {
    assert(false, `Syntax Error in js/${file}: ${err.message}`);
  }
});

// 2. Check all HTML files for referenced assets
const htmlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
const referencedFiles = new Set();

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  
  // Find href and src
  const srcMatches = content.match(/src=["']([^"']+)["']/g) || [];
  const hrefMatches = content.match(/href=["']([^"']+)["']/g) || [];

  [...srcMatches, ...hrefMatches].forEach(attr => {
    const val = attr.replace(/^(src|href)=["']/, '').replace(/["']$/, '');
    if (!val.startsWith('http') && !val.startsWith('#') && !val.startsWith('mailto:') && !val.startsWith('tel:')) {
      const cleanVal = val.split('?')[0];
      const targetPath = path.join(__dirname, cleanVal);
      const exists = fs.existsSync(targetPath);
      assert(exists, `HTML Reference in ${file} -> ${cleanVal} exists`);
    }
  });
});

console.log('\n====================================================');
console.log('2. BUSINESS LOGIC & INVARIANT FUNCTIONAL TESTS');
console.log('====================================================');

// Mock a browser environment with localStorage and window
const mockLocalStorage = (function () {
  let store = {};
  return {
    getItem(key) { return store[key] || null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { store = {}; }
  };
})();

const mockWindow = {
  localStorage: mockLocalStorage,
  console: console,
  location: { href: '' }
};
mockWindow.window = mockWindow;

const context = vm.createContext(mockWindow);

// Load and execute js/storage.js inside vm context
const storageCode = fs.readFileSync(path.join(jsDir, 'storage.js'), 'utf8');
vm.runInContext(storageCode, context);

const MediQStorage = context.MediQStorage;
assert(Boolean(MediQStorage), 'MediQStorage initialized on window');

// Test 1: Initial Seed Data
const initialDoctors = MediQStorage.getDoctors();
assert(initialDoctors.length >= 4, `Initial doctors seeded: ${initialDoctors.length} doctors`);

const initialAdmins = MediQStorage.getAdmins();
assert(initialAdmins.length >= 1, `Demo admin exists: ${initialAdmins[0].email}`);

const initialUsers = MediQStorage.getUsers();
assert(initialUsers.length >= 1, `Demo patient exists: ${initialUsers[0].email}`);

// Test 1b: Verify unbooked slots for today and upcoming dates are AVAILABLE (not falsely UNAVAILABLE)
const todayStr = MediQStorage.getLocalDateString();
const todaySlots = MediQStorage.getSlots().filter(s => s.date === todayStr);
assert(todaySlots.length >= 5, `Slots exist for today (${todayStr}): ${todaySlots.length} slots`);

const unbookedTodaySlots = todaySlots.filter(s => {
  const st = MediQStorage.deriveSlotStatus(s);
  return st === 'AVAILABLE';
});
assert(unbookedTodaySlots.length > 0, `Unbooked slots on today (${todayStr}) correctly derive AVAILABLE status (${unbookedTodaySlots.length} available)`);

// Test 1c: Verify Admin disable/enable toggle
const testSlotToDisable = todaySlots[0];
const disableResult = MediQStorage.toggleSlotDisabled(testSlotToDisable.id);
assert(disableResult.success === true, 'Admin toggled slot disabled');
assert(MediQStorage.deriveSlotStatus(MediQStorage.getSlotById(testSlotToDisable.id)) === 'UNAVAILABLE', 'Disabled slot derives UNAVAILABLE');
MediQStorage.toggleSlotDisabled(testSlotToDisable.id);
assert(MediQStorage.deriveSlotStatus(MediQStorage.getSlotById(testSlotToDisable.id)) === 'AVAILABLE', 'Re-enabled slot returns to AVAILABLE');

// Test 2: Exact 10-Minute Duration Validation
assert(MediQStorage.isExactTenMinutes('09:00', '09:10') === true, 'Valid 10-minute slot (09:00-09:10) accepted');
assert(MediQStorage.isExactTenMinutes('09:10', '09:20') === true, 'Valid 10-minute slot (09:10-09:20) accepted');
assert(MediQStorage.isExactTenMinutes('09:00', '09:15') === false, 'Invalid 15-minute slot (09:00-09:15) rejected');
assert(MediQStorage.isExactTenMinutes('09:00', '09:05') === false, 'Invalid 5-minute slot (09:00-09:05) rejected');
assert(MediQStorage.isExactTenMinutes('10:00', '09:50') === false, 'Negative duration rejected');

// Test 3: Admin Manually Creates 10-minute Slot
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

const doc1 = initialDoctors[0].id;
const createRes1 = MediQStorage.createSlot({
  doctorId: doc1,
  date: tomorrowStr,
  startTime: '16:00',
  endTime: '16:10'
});
assert(createRes1.success === true, `Admin created valid 16:00-16:10 slot for ${tomorrowStr}`);

// Test 4: Reject Overlapping Slots
const createOverlapRes = MediQStorage.createSlot({
  doctorId: doc1,
  date: tomorrowStr,
  startTime: '16:05',
  endTime: '16:15'
});
assert(createOverlapRes.success === false, 'Overlapping slot (16:05-16:15) correctly rejected');

const createDuplicateRes = MediQStorage.createSlot({
  doctorId: doc1,
  date: tomorrowStr,
  startTime: '16:00',
  endTime: '16:10'
});
assert(createDuplicateRes.success === false, 'Duplicate slot (16:00-16:10) correctly rejected');

// Test 5: Reject Past Dates
const pastCreate = MediQStorage.createSlot({
  doctorId: doc1,
  date: '2020-01-01',
  startTime: '10:00',
  endTime: '10:10'
});
assert(pastCreate.success === false, 'Past slot creation rejected');

// Test 6: Multiple independent non-overlapping slots for same doctor on same date
const createRes2 = MediQStorage.createSlot({
  doctorId: doc1,
  date: tomorrowStr,
  startTime: '16:10',
  endTime: '16:20'
});
assert(createRes2.success === true, 'Consecutive non-overlapping slot (16:10-16:20) accepted');

// Test 7: Independent schedules for different doctors
const doc2 = initialDoctors[1].id;
const createDoc2Slot = MediQStorage.createSlot({
  doctorId: doc2,
  date: tomorrowStr,
  startTime: '16:00',
  endTime: '16:10'
});
assert(createDoc2Slot.success === true, 'Different doctor can have independent slot at same time');

// Test 8: Patient Booking Flow - Slot starts AVAILABLE
const slot1Id = createRes1.slot.id;
let slot1Obj = MediQStorage.getSlotById(slot1Id);
let derivedStatus = MediQStorage.deriveSlotStatus(slot1Obj);
assert(derivedStatus === 'AVAILABLE', 'Newly created slot derives AVAILABLE status');

// Test 9: Submitting Patient Request places slot in PENDING status
const patientReq = MediQStorage.createAppointmentRequest({
  userId: initialUsers[0].id,
  doctorId: doc1,
  slotId: slot1Id,
  patientDetails: {
    fullName: 'Test Patient',
    age: 40,
    gender: 'Male',
    contact: '+1 555-999-0000',
    reason: 'Clinical headache evaluation',
    notes: 'No allergies'
  }
});
assert(patientReq.success === true, `Appointment request submitted with ID: ${patientReq.appointment.id}`);

slot1Obj = MediQStorage.getSlotById(slot1Id);
derivedStatus = MediQStorage.deriveSlotStatus(slot1Obj);
assert(derivedStatus === 'PENDING', 'Slot derives PENDING reservation after request submission');

// Test 9b: Verify booking an early morning slot on TODAY stays PENDING (does not instantly expire)
const todayEarlySlot = todaySlots.find(s => s.startTime === '09:00' && s.date === todayStr);
assert(Boolean(todayEarlySlot), 'Today 09:00 slot found');
const todayReq = MediQStorage.createAppointmentRequest({
  userId: initialUsers[0].id,
  doctorId: todayEarlySlot.doctorId,
  slotId: todayEarlySlot.id,
  patientDetails: {
    fullName: 'Today Patient',
    age: 28,
    gender: 'Female',
    contact: '+1 555-777-8888',
    reason: 'Routine checkup'
  }
});
assert(todayReq.success === true, 'Successfully submitted request for today 09:00 slot');
const fetchedTodayApt = MediQStorage.getAppointmentById(todayReq.appointment.id);
assert(fetchedTodayApt.status === 'PENDING', 'Appointment for today slot remains PENDING (does not show EXPIRED)');

// Test 10: Cannot book or submit duplicate request for the pending slot
const secondBooking = MediQStorage.createAppointmentRequest({
  userId: initialUsers[0].id,
  doctorId: doc1,
  slotId: slot1Id,
  patientDetails: {
    fullName: 'Another Patient',
    age: 25,
    gender: 'Female',
    contact: '+1 555-888-1111',
    reason: 'Follow-up'
  }
});
assert(secondBooking.success === false, 'Second booking on PENDING slot correctly blocked');

// Test 11: Admin Approves Request -> Generates Token, changes status to BOOKED
const approveRes = MediQStorage.approveAppointment(patientReq.appointment.id);
assert(approveRes.success === true, 'Admin successfully approved pending appointment');
assert(Boolean(approveRes.token), `Token issued with Number: ${approveRes.token.tokenNumber}`);

slot1Obj = MediQStorage.getSlotById(slot1Id);
derivedStatus = MediQStorage.deriveSlotStatus(slot1Obj);
assert(derivedStatus === 'BOOKED', 'Slot derives BOOKED status after approval');

// Test 12: Cannot approve same slot twice
const secondApprove = MediQStorage.approveAppointment(patientReq.appointment.id);
assert(secondApprove.success === false, 'Cannot approve already approved appointment twice');

// Test 13: Rejection Flow releases slot back to AVAILABLE
const slot2Id = createRes2.slot.id;
const patientReq2 = MediQStorage.createAppointmentRequest({
  userId: initialUsers[0].id,
  doctorId: doc1,
  slotId: slot2Id,
  patientDetails: {
    fullName: 'Test Patient 2',
    age: 30,
    gender: 'Female',
    contact: '+1 555-123-4567',
    reason: 'Checkup'
  }
});
assert(patientReq2.success === true, 'Second request submitted for slot 2');

const rejectRes = MediQStorage.rejectAppointment(patientReq2.appointment.id, 'Doctor unavailable on emergency duty.');
assert(rejectRes.success === true, 'Admin successfully rejected appointment');

const slot2Obj = MediQStorage.getSlotById(slot2Id);
const statusAfterReject = MediQStorage.deriveSlotStatus(slot2Obj);
assert(statusAfterReject === 'AVAILABLE', 'Slot status released back to AVAILABLE after rejection');

// Test 14: Doctor Deactivation & Safe Removal Safeguard
// Attempting to delete doc1 who has appointments must be prevented to preserve history
const deleteAttempt = MediQStorage.deleteDoctor(doc1);
assert(deleteAttempt.success === false, 'Deleting doctor with historical appointments is safely blocked');

// Deactivating doctor marks status inactive
const deactRes = MediQStorage.toggleDoctorActive(doc1);
assert(deactRes.active === false, 'Doctor successfully marked inactive');

// Inactive doctor slots become UNAVAILABLE
const statusUnderInactive = MediQStorage.deriveSlotStatus(slot2Obj);
assert(statusUnderInactive === 'UNAVAILABLE', 'Slots belonging to inactive doctor derive UNAVAILABLE status');

// Reactivate doctor
MediQStorage.toggleDoctorActive(doc1);
assert(MediQStorage.getDoctorById(doc1).active === true, 'Doctor reactivated');

// Test 15: Storage Reset Demo Data
const resetSuccess = MediQStorage.resetDemoData();
assert(resetSuccess === true, 'Reset demo data executes cleanly');
assert(MediQStorage.getDoctors().length >= 4, 'Demo data restored after reset');

// Test 16: Authentication Session & Navigation State Management
MediQStorage.setSession({
  id: initialUsers[0].id,
  fullName: initialUsers[0].fullName,
  email: initialUsers[0].email,
  role: 'patient'
});
const activeSession = MediQStorage.getSession();
assert(Boolean(activeSession), 'Patient session established');
assert(activeSession.role === 'patient', 'Session correctly identified as patient');

// Test 17: Admin Session Management
MediQStorage.setSession({
  id: initialAdmins[0].id,
  fullName: initialAdmins[0].fullName,
  email: initialAdmins[0].email,
  role: 'admin'
});
const adminSession = MediQStorage.getSession();
assert(Boolean(adminSession), 'Admin session established');
assert(adminSession.role === 'admin', 'Session correctly identified as admin');

// Clear session test
MediQStorage.clearSession();
assert(MediQStorage.getSession() === null, 'Session cleanly cleared on logout');

// Test 18: Navigation Redirection & Protection Verification
const aboutHtml = fs.readFileSync(path.join(__dirname, 'about.html'), 'utf8');
assert(aboutHtml.includes('user-dashboard.html'), 'about.html links to patient dashboard when logged in');
assert(aboutHtml.includes('admin-dashboard.html'), 'about.html links to admin dashboard when logged in');

const aptDetailsHtml = fs.readFileSync(path.join(__dirname, 'appointment-details.html'), 'utf8');
assert(aptDetailsHtml.includes('details-brand-link'), 'appointment-details.html brand logo is session-aware');
assert(aptDetailsHtml.includes('details-footer-link'), 'appointment-details.html footer link is session-aware');

const commonJs = fs.readFileSync(path.join(__dirname, 'js', 'common.js'), 'utf8');
assert(commonJs.includes('syncNavigationState'), 'common.js defines syncNavigationState');
assert(commonJs.includes('authPages.includes(currentPage)'), 'common.js guards auth pages from logged-in users');
assert(commonJs.includes('a[href="index.html"]'), 'common.js clears Home links on secondary pages when logged in');
assert(commonJs.includes('setupInputValidation'), 'common.js defines setupInputValidation');

// Test 19: Form Spaces & 10-Digit Mobile Constraints Verification
const userSignupHtml = fs.readFileSync(path.join(__dirname, 'user-signup.html'), 'utf8');
assert(userSignupHtml.includes('maxlength="10"'), 'user-signup.html restricts phone to 10 digits');
assert(userSignupHtml.includes('pattern="[0-9]{10}"'), 'user-signup.html enforces 10-digit pattern');

const bookApptHtml = fs.readFileSync(path.join(__dirname, 'book-appointment.html'), 'utf8');
assert(bookApptHtml.includes('id="patient-contact"') && bookApptHtml.includes('maxlength="10"'), 'book-appointment.html restricts contact to 10 digits');

const manageDocsHtml = fs.readFileSync(path.join(__dirname, 'manage-doctors.html'), 'utf8');
assert(manageDocsHtml.includes('id="doc-contact"') && manageDocsHtml.includes('maxlength="10"'), 'manage-doctors.html restricts doctor contact to 10 digits');

const authJs = fs.readFileSync(path.join(__dirname, 'js', 'auth.js'), 'utf8');
assert(authJs.includes('cannot be spaces only'), 'auth.js prevents whitespace-only form submissions');
assert(authJs.includes('cleanPhone.length !== 10'), 'auth.js strictly validates 10-digit mobile number');

const bookingJs = fs.readFileSync(path.join(__dirname, 'js', 'booking.js'), 'utf8');
assert(bookingJs.includes('cleanContact.length !== 10'), 'booking.js strictly validates 10-digit patient mobile number');

const doctorsJs = fs.readFileSync(path.join(__dirname, 'js', 'doctors.js'), 'utf8');
assert(doctorsJs.includes('cleanContact.length !== 10'), 'doctors.js strictly validates 10-digit doctor mobile number');

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed.`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('ALL VERIFICATION & FUNCTIONAL CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('SOME CHECKS FAILED!');
  process.exit(1);
}
