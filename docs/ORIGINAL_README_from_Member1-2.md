# DocuAuth & Compliance AI — Regulatory Verification System (MERN Stack Prototype)

A full-stack, modular prototype implementing the regulatory compliance and document authentication system for educational institutions (AICTE workflow).

---

## 🌟 Key Features

1. **Role-Based Portals**:
   - **Institution Holder**: Register institutions, submit applications, upload regulatory certificates, and track live review status across all submitted applications.
   - **AICTE Authority**: Review applications, inspect OCR extractions and confidence metrics, accept or reject submissions, and download official multi-page PDF compliance reports.

2. **Authentication System**:
   - Secure login and registration with username, email, and password.
   - Built-in self-service password reset ("Forgot Password").
   - Session persistence and instant logout from both dashboards.

3. **OCR & Document Processing Engine**:
   - PDF & Scanned Image extraction (powered by `unpdf` and `tesseract.js`).
   - Cryptographic SHA-256 duplicate document detection.
   - Automated regex & structural field extraction (Institution Name, Approval Reference, Issue/Expiry Dates, Intake, Issuing Authority).
   - In-app OCR Inspector with confidence indicators and manual field editing modal.

4. **Multi-Page Compliance PDF Report Generator**:
   - Generates and downloads official multi-page PDF reports.
   - Extracted fields are cleanly grouped and displayed separately for each certificate.
   - Strictly scopes records to the active application.

---

## 🚀 Quick Start (Running the Application)

### Prerequisites
- Node.js (v18+ or v24+ recommended)
- npm

### 1. Installation
In the project root folder:
```bash
# Install root dependencies (if any)
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
npm run build
cd ..
```

### 2. Launch the Application
From the project root:
```bash
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!

---

## 🔑 Pre-Seeded Test Credentials

| Role | Username | Password | Email |
| :--- | :--- | :--- | :--- |
| **Institution Holder** | `institution` | `password123` | `institution@example.edu.in` |
| **AICTE Authority** | `authority` | `password123` | `authority@aicte.gov.in` |

*(You can also use the one-click credential autofill buttons on the login screen, or click **"Register here"** to create a new account).*

---

## 📂 Project Architecture

```
ai-application-validator-mern/
├── client/                      # React Frontend (Vite)
│   ├── dist/                    # Compiled production build
│   ├── src/
│   │   ├── components/          # Reusable UI (Navbar, WorkflowDiagram, FieldEditorModal)
│   │   ├── config/              # API Client & configuration
│   │   ├── pages/               # AuthPage, InstitutionDashboard, HomePage,
│   │   │                        # OcrInspectorPage, DossierPage, UploadPage, ApplicationPage
│   │   └── App.jsx              # Main App entrypoint & role routing
│   └── package.json
├── server/                      # Node.js / Express Backend
│   ├── config/                  # Compliance rules configuration
│   ├── data/                    # JSON database (db.json)
│   ├── db/                      # Database storage adapter & PBKDF2 auth
│   ├── routes/                  # API routes (auth, applications, documents, demo, report)
│   ├── services/                # OCR, field extraction, validation, report generation
│   ├── uploads/                 # Storage for uploaded PDF and certificate files
│   ├── index.js                 # Server entrypoint
│   └── package.json
├── eng.traineddata              # Tesseract OCR English language model
├── package.json                 # Root package scripts
└── README.md
```

---

## 🧪 Automated Testing
To run the automated backend test suite:
```bash
cd server
npm test
```
- Test 1: SHA-256 Checksum generation & exact duplicate detection.
- Test 2: Key-field extraction on AICTE certificates.
- Test 3: Demo scenario seeding & storage persistence.
- Test 4: Regulatory compliance validation engine.
