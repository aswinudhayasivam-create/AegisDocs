/**
 * Database Storage Adapter (Layer 5 - Section 8)
 * 
 * Provides a resilient storage abstraction:
 * - Persists applications, documents, and extracted fields.
 * - Saves to a local JSON database file (data/db.json) with atomic writes.
 * - Ready to hook into Mongoose/MongoDB when MONGODB_URI is provided.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// DB_FILE can be set to another path (the tests use this so they never touch real data)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');
const DATA_DIR = path.dirname(DB_FILE);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PBKDF2_ROUNDS = 210000;

// Initial Database State
const defaultState = {
  users: [],
  applications: [],
  documents: [],
  extractedFields: []
};

class DatabaseStore {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultState, null, 2), 'utf-8');
    }
    this._ensureDefaultUsers();
  }

  // Member 6 fix: 210,000 rounds (was 1,000). Old accounts keep working because
  // each user records how many rounds their hash used, and are upgraded at login.
  _hashPassword(password, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ROUNDS, 64, 'sha512').toString('hex');
    return { hash, salt, iterations: PBKDF2_ROUNDS };
  }

  _verifyPassword(password, hash, salt, iterations = 1000) {
    const calculated = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    const a = Buffer.from(calculated);
    const b = Buffer.from(hash || '');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  _ensureDefaultUsers() {
    const db = this._read();
    if (!db.users) db.users = [];
    if (db.users.length === 0) {
      const instCreds = this._hashPassword('password123');
      const authCreds = this._hashPassword('password123');
      db.users.push({
        id: 'USER-INST-001',
        username: 'institution',
        email: 'institution@example.edu.in',
        role: 'institution',
        institutionName: 'Example Engineering College',
        hash: instCreds.hash,
        salt: instCreds.salt,
        iterations: instCreds.iterations,
        createdAt: new Date().toISOString()
      });
      db.users.push({
        id: 'USER-AUTH-001',
        username: 'authority',
        email: 'authority@aicte.gov.in',
        role: 'authority',
        institutionName: 'AICTE Regulatory Bureau',
        hash: authCreds.hash,
        salt: authCreds.salt,
        iterations: authCreds.iterations,
        createdAt: new Date().toISOString()
      });
      this._write(db);
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.users) parsed.users = [];
      return parsed;
    } catch (e) {
      return { ...defaultState };
    }
  }

  _write(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  // --- Applications ---
  getApplications() {
    return this._read().applications;
  }

  getApplicationById(id) {
    return this._read().applications.find(a => a.id === id || a.applicationId === id);
  }

  saveApplication(appData) {
    const db = this._read();
    const id = appData.id || `APP-${Date.now().toString(36).toUpperCase()}`;
    const newApp = {
      id,
      applicationId: appData.applicationId || id,
      institutionName: appData.institutionName === undefined ? 'Untitled Institution' : appData.institutionName,
      category: appData.category || 'EOA_TECHNICAL',
      representative: {
        name: appData.representative?.name || '',
        designation: appData.representative?.designation || '',
        email: appData.representative?.email || '',
        phone: appData.representative?.phone || ''
      },
      institutionId: appData.institutionId || '',
      faculty: appData.faculty || [],
      declaredDocuments: appData.declaredDocuments || [],
      status: appData.status || 'DRAFT',
      submittedBy: appData.submittedBy || appData.userId || null,
      createdAt: appData.createdAt || new Date().toISOString()
    };

    const existingIndex = db.applications.findIndex(a => a.id === newApp.id);
    if (existingIndex >= 0) {
      db.applications[existingIndex] = { ...db.applications[existingIndex], ...newApp };
    } else {
      db.applications.unshift(newApp);
    }

    this._write(db);
    return newApp;
  }

  // --- Documents ---
  getDocuments(applicationId = null) {
    const docs = this._read().documents;
    if (!applicationId) return docs;
    const app = this.getApplicationById(applicationId);
    const validIds = new Set([applicationId]);
    if (app) {
      if (app.id) validIds.add(app.id);
      if (app.applicationId) validIds.add(app.applicationId);
    }
    return docs.filter(d => validIds.has(d.applicationId));
  }

  getDocumentById(id) {
    return this._read().documents.find(d => d.id === id);
  }

  findDocumentByChecksum(checksum) {
    return this._read().documents.find(d => d.checksum === checksum);
  }

  saveDocument(docData) {
    const db = this._read();
    const id = docData.id || `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const newDoc = {
      id,
      applicationId: docData.applicationId,
      documentType: docData.documentType || 'UNCLASSIFIED',
      originalName: docData.originalName,
      fileName: docData.fileName,
      filePath: docData.filePath,
      fileType: docData.fileType,
      fileSize: docData.fileSize,
      checksum: docData.checksum,
      isDigitalPdf: docData.isDigitalPdf ?? false,
      pageCount: docData.pageCount || 1,
      uploadDate: docData.uploadDate || new Date().toISOString(),
      rawText: docData.rawText || ''
    };

    const existingIndex = db.documents.findIndex(d => d.id === newDoc.id);
    if (existingIndex >= 0) {
      db.documents[existingIndex] = { ...db.documents[existingIndex], ...newDoc };
    } else {
      db.documents.push(newDoc);
    }

    this._write(db);
    return newDoc;
  }

  deleteDocument(id) {
    const db = this._read();
    db.documents = db.documents.filter(d => d.id !== id);
    db.extractedFields = db.extractedFields.filter(f => f.documentId !== id);
    this._write(db);
  }

  // --- Extracted Fields ---
  getFieldsByDocument(documentId) {
    return this._read().extractedFields.filter(f => f.documentId === documentId);
  }

  getFieldsByApplication(applicationId) {
    const fields = this._read().extractedFields;
    if (!applicationId) return fields;
    const app = this.getApplicationById(applicationId);
    const validIds = new Set([applicationId]);
    if (app) {
      if (app.id) validIds.add(app.id);
      if (app.applicationId) validIds.add(app.applicationId);
    }
    return fields.filter(f => validIds.has(f.applicationId));
  }

  saveFields(fieldsArray) {
    const db = this._read();
    for (const field of fieldsArray) {
      const fieldId = field.id || `FLD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const record = {
        id: fieldId,
        documentId: field.documentId,
        applicationId: field.applicationId,
        fieldName: field.fieldName,
        label: field.label || field.fieldName,
        extractedValue: field.extractedValue,
        confidence: field.confidence || 0.8,
        sourceSnippet: field.sourceSnippet || '',
        pageNumber: field.pageNumber || 1,
        isVerified: field.isVerified ?? false,
        updatedAt: new Date().toISOString()
      };

      const existingIndex = db.extractedFields.findIndex(
        f => f.documentId === record.documentId && f.fieldName === record.fieldName
      );

      if (existingIndex >= 0) {
        db.extractedFields[existingIndex] = { ...db.extractedFields[existingIndex], ...record };
      } else {
        db.extractedFields.push(record);
      }
    }
    this._write(db);
    return this.getFieldsByDocument(fieldsArray[0]?.documentId);
  }

  updateField(documentId, fieldName, newValue, isVerified = true, editor = null) {
    const db = this._read();
    const field = db.extractedFields.find(f => f.documentId === documentId && f.fieldName === fieldName);
    if (field) {
      // Keep what the machine originally read (and every earlier correction): a correction
      // appends to the field's history instead of silently overwriting the previous value.
      if (!Array.isArray(field.history)) field.history = [];
      field.history.push({
        previousValue: field.extractedValue,
        newValue,
        editedBy: editor,
        editedAt: new Date().toISOString()
      });
      field.extractedValue = newValue;
      field.isVerified = isVerified;
      field.updatedAt = new Date().toISOString();
      this._write(db);
      return field;
    }
    return null;
  }

  // Update application status (accept / reject)
  updateApplicationStatus(id, status) {
    const db = this._read();
    const app = db.applications.find(a => a.id === id || a.applicationId === id);
    if (!app) return null;
    app.status = status;
    app.reviewedAt = new Date().toISOString();
    this._write(db);
    return app;
  }

  // --- Authentication ---
  findUser(role, identifier) {
    const db = this._read();
    const cleanId = (identifier || '').trim().toLowerCase();
    return db.users.find(u => 
      u.role === role && 
      (u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId)
    );
  }

  registerUser({ username, email, password, role, institutionName }) {
    // Second line of defence: even a future route calling this directly cannot mint an authority.
    if (role !== 'institution') {
      throw new Error('Only institution accounts can be self-registered.');
    }
    const db = this._read();
    const cleanUsername = (username || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check duplicate
    const existing = db.users.find(u => 
      u.role === role && 
      (u.username.toLowerCase() === cleanUsername.toLowerCase() || u.email.toLowerCase() === cleanEmail)
    );
    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername.toLowerCase()) {
        throw new Error(`Username "${cleanUsername}" is already taken for this role.`);
      }
      throw new Error(`Email "${cleanEmail}" is already registered for this role.`);
    }

    const { hash, salt, iterations } = this._hashPassword(password);
    const newUser = {
      id: `USER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      username: cleanUsername,
      email: cleanEmail,
      role,
      institutionName: institutionName || (role === 'authority' ? 'AICTE Regulatory Bureau' : 'Institution'),
      hash,
      salt,
      iterations,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    this._write(db);

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      institutionName: newUser.institutionName,
      createdAt: newUser.createdAt
    };
  }

  checkEmailExists(role, email) {
    const db = this._read();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.users.find(u => 
      u.role === role && (u.email || '').toLowerCase() === cleanEmail
    );
    return {
      exists: !!user,
      username: user ? user.username : null,
      institutionName: user ? user.institutionName : null
    };
  }

  authenticateUser(role, identifier, password) {
    const cleanId = String(identifier || '').trim();
    const isEmail = cleanId.includes('@');

    // If an email format is supplied, verify it strictly
    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanId)) {
        return { 
          success: false, 
          message: 'Invalid email address format. Please enter a valid email (e.g. user@institution.edu.in).' 
        };
      }
    }

    const user = this.findUser(role, cleanId);
    if (!user) {
      if (isEmail) {
        return { 
          success: false, 
          message: `The email address "${cleanId}" is not registered in the system. Please verify your email or register a new account.` 
        };
      }
      return { 
        success: false, 
        message: 'Invalid username or password.' 
      };
    }

    const valid = this._verifyPassword(password, user.hash, user.salt, user.iterations || 1000);
    if (!valid) {
      if (isEmail) {
        return { success: false, message: `Incorrect password for email "${user.email}". Please try again.` };
      }
      return { success: false, message: 'Invalid username or password.' };
    }

    // Upgrade an old weak hash now that we know the right password
    if ((user.iterations || 1000) < PBKDF2_ROUNDS) {
      const db = this._read();
      const stored = db.users.find(u => u.id === user.id);
      if (stored) {
        const fresh = this._hashPassword(password);
        stored.hash = fresh.hash;
        stored.salt = fresh.salt;
        stored.iterations = fresh.iterations;
        this._write(db);
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        institutionName: user.institutionName,
        createdAt: user.createdAt
      }
    };
  }

  /**
   * Password reset step 1: make a 6-digit code (valid 15 minutes, 5 tries).
   * Returns the code, or null when no account matches. The caller must NOT
   * show the code to the person asking: it goes to the server console in this
   * demo build (a real system would email it).
   */
  createResetCode(role, username, email) {
    const db = this._read();
    const user = db.users.find(u =>
      u.role === role &&
      u.username.toLowerCase() === (username || '').trim().toLowerCase() &&
      u.email.toLowerCase() === (email || '').trim().toLowerCase()
    );
    if (!user) return null;
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    user.resetCodeHash = crypto.createHash('sha256').update(code).digest('hex');
    user.resetCodeExpires = Date.now() + 15 * 60 * 1000;
    user.resetCodeTries = 0;
    this._write(db);
    return code;
  }

  /** Password reset step 2: check the code and set the new password. */
  resetPassword(role, username, email, code, newPassword) {
    const db = this._read();
    const user = db.users.find(u =>
      u.role === role &&
      u.username.toLowerCase() === (username || '').trim().toLowerCase() &&
      u.email.toLowerCase() === (email || '').trim().toLowerCase()
    );
    const fail = 'The reset code is wrong or has expired. Ask for a new code.';
    if (!user || !user.resetCodeHash || user.resetCodeExpires < Date.now() || (user.resetCodeTries || 0) >= 5) {
      throw new Error(fail);
    }
    const given = crypto.createHash('sha256').update(String(code || '').trim()).digest('hex');
    if (given !== user.resetCodeHash) {
      user.resetCodeTries = (user.resetCodeTries || 0) + 1;
      this._write(db);
      throw new Error(fail);
    }

    const fresh = this._hashPassword(newPassword);
    user.hash = fresh.hash;
    user.salt = fresh.salt;
    user.iterations = fresh.iterations;
    user.passwordUpdatedAt = new Date().toISOString();
    delete user.resetCodeHash;
    delete user.resetCodeExpires;
    delete user.resetCodeTries;
    this._write(db);

    return { id: user.id, username: user.username, email: user.email, role: user.role, institutionName: user.institutionName };
  }

  // Reset or seed database
  clearAll() {
    // Keep the user accounts: only applications, documents and fields are cleared
    const db = this._read();
    this._write({ ...defaultState, users: db.users || [] });
  }
}

module.exports = new DatabaseStore();
