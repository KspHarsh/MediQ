# MediQ — Hospital Appointment Management System

MediQ is a responsive, functional static web application designed for hospital outpatient departments (OPD). It provides deterministic doctor availability scheduling with **strict 10-minute consultation slots**, real-time conflict prevention, administrative verification, and printable digital OPD tokens.

---

## 🏥 Key Features & System Architecture

### 1. Separate Dedicated Portals
- **Patient Portal**: Register, authenticate, browse specialties, pick active physicians, select available 10-minute slots, submit booking requests, inspect appointment history, and print verified consultation tokens.
- **Hospital Admin Portal**: Dashboard metrics, physician registry (add/edit/deactivate), manual daily 10-minute slot creation, request review queue (approve/reject), and token issuance.

### 2. Strict 10-Minute Slot Invariant
- Slots must have an **exact duration of 10 minutes** (e.g. `09:00–09:10`, `09:10–09:20`).
- Non-10-minute durations (e.g. `09:00–09:15`) are rejected by the system.
- Overlapping time slots and duplicate slots for the same doctor on the same date are rejected.
- Past dates and times cannot be scheduled or booked.

### 3. Slot Reservation & Status Invariants
MediQ derives slot availability dynamically from appointment records and physician state:
- **`AVAILABLE`**: Active doctor, slot not disabled, slot in the future, and no active pending or approved reservations.
- **`PENDING`**: An active patient appointment request temporarily reserves the slot while awaiting admin review. Conflicting requests on this slot are blocked.
- **`BOOKED`**: Admin approves the request; the slot is locked and an official confirmation token is generated.
- **`UNAVAILABLE`**: Physician is marked inactive, slot is manually disabled by the admin, or the slot has passed.
- **`REJECTED` / `EXPIRED`**: Releases the slot back to `AVAILABLE`.

### 4. Doctor Safeguards & Deactivation Policy
- Doctors with existing historical appointment records cannot be deleted outright; the system guides the admin to mark the doctor **inactive**.
- Inactive doctors cannot receive new bookings, but historical patient appointments and tokens remain preserved.

---

## 🔑 Demonstration Accounts

The prototype pre-initializes demo accounts in `localStorage` for evaluation:

### Hospital Administrator
- **Email:** `admin@mediq.com`
- **Password:** `Admin@123`
- *Access Portal:* [Hospital Admin Login](admin-login.html)


### Patient
- **Email:** `john.doe@example.com`
- **Password:** `Patient@123`
- *Access Portal:* [Patient Login](user-login.html)


---

## 🚀 How to Run the Application

MediQ is built with pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+). It does not require complex build steps or package installations.

### Option 1: VS Code Live Server (Recommended)
1. Open the project folder in **Visual Studio Code**.
2. Right-click `index.html` and click **"Open with Live Server"** (or click "Go Live" in the status bar).
3. The application will open in your default browser at `http://127.0.0.1:5500/index.html`.

### Option 2: Node.js Static Server
Run a lightweight HTTP server using Node:
```powershell
npx serve .
# or
npx http-server .
```
Then visit `http://localhost:3000` or `http://localhost:8080`.

### Option 3: Direct Browser File Access
Standard HTML pages and vanilla scripts can be directly inspected in any modern browser by opening `index.html`.

---

## 📂 Project Structure

```text
MediQ/
├── index.html                   # Public landing page with dual portal navigation
├── about.html                   # About the system, 10-minute slot philosophy
├── user-login.html              # Patient sign in
├── user-signup.html             # Patient registration
├── user-dashboard.html          # Patient dashboard & stats
├── book-appointment.html        # 4-step booking wizard
├── my-appointments.html         # Patient appointment history
├── appointment-details.html     # Detailed appointment view
├── appointment-token.html       # Printable confirmation token
├── admin-login.html             # Hospital admin sign in
├── admin-signup.html            # Hospital admin registration
├── admin-dashboard.html         # Administrative dashboard & live metrics
├── manage-doctors.html          # Doctor management & status toggle
├── manage-slots.html            # Manual daily 10-minute slot creation
├── manage-appointments.html     # Admin request verification & approvals
├── css/
│   ├── style.css                # Base design tokens, resets, navigation, cards, badges
│   ├── auth.css                 # Login/signup forms, password toggles, demo badges
│   ├── dashboard.css            # Stat cards, data tables, quick actions, filter bars
│   └── booking.css              # Multi-step wizard, specialty/slot cards, token print styles
├── js/
│   ├── storage.js               # Centralized localStorage repository & invariants
│   ├── common.js                # Toasts, confirmation modals, route guards, banner
│   ├── auth.js                  # Authentication, session state, validation
│   ├── doctors.js               # Doctor CRUD, search, specialty filters, deactivation
│   ├── slots.js                 # 10-minute slot validation, overlap check, slot table
│   ├── appointments.js          # Admin request verification, approvals, rejections
│   ├── booking.js               # Patient step-by-step appointment wizard
│   ├── user-dashboard.js        # Patient metrics & recent requests
│   ├── admin-dashboard.js       # Admin statistics & recent submissions
│   └── token.js                 # Printable token generation & print layout
├── images/
│   └── logo.png                 # Official MediQ logo
├── test-suite.js                # Automated static & functional test suite
├── flow-diagram.png             # Application workflow diagram
└── README.md                    # Project documentation
```

---

## 🎨 Visual Design System

Built strictly according to specified brand guidelines:
- **Primary Blue:** `#1971FF`
- **Success / Available Green:** `#2DED4D`
- **White Background / Cards:** `#FFFFFF`
- **Main Text:** `#172B4D`
- **Secondary Text:** `#64748B`
- **Page Background:** `#F5F8FF`
- **Borders:** `#E2E8F0`
- **Pending Review:** `#F59E0B`
- **Rejected:** `#DC2626`
- **Disabled:** `#94A3B8`

---

## 🔄 Resetting Prototype Demo Data

At any point during testing, you can click **"Reset Demo Data"** in the top banner on any page. This safely resets `localStorage` back to initial demonstration state (default doctors, upcoming slots, sample pending and approved appointments, and demo accounts).

---

## ⚠️ Prototype Scope & Limitations

1. **Client-Side Persistence:** All accounts, slots, and bookings are saved in the browser's `localStorage`. Data is persistent within the same browser and origin, but is not synchronized across different devices or browsers.
2. **Demonstration Authentication:** Password hashing and client-side route guards are implemented to demonstrate the user flow and roles. In production, authentication and authorization require a secure backend API and database.
3. **Fictitious Demo Data:** All sample doctors, specialties, and contact identifiers are demonstration placeholders for testing.
