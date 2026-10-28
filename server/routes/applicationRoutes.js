/**
 * Application Routes (Member 1 - Step 1, Section 5.1)
 */

const express = require('express');
const router = express.Router();
const store = require('../db/store');
const complianceConfig = require('../config/complianceRules.json');
const validationService = require('../services/validationService');
const { requireAuth, requireRole, canAccessApplication } = require('../middleware/auth');

// Everything here needs a login. Authority sees all applications; an institution sees only its own.
router.use(requireAuth);

// Finds the application and checks the logged-in user may use it. Returns null after sending the error.
function loadAllowedApplication(req, res) {
  const found = store.getApplicationById(req.params.id);
  if (!found || !canAccessApplication(req.user, found)) {
    res.status(404).json({ success: false, message: 'Application not found.' });
    return null;
  }
  return found;
}

// Get all application categories & requirements
router.get('/categories/list', (req, res) => {
  res.json({
    success: true,
    categories: complianceConfig.applicationCategories
  });
});

// List all applications
router.get('/', (req, res) => {
  const applications = store.getApplications().filter(a => canAccessApplication(req.user, a));
  res.json({
    success: true,
    count: applications.length,
    applications
  });
});

// Create / Register new application
router.post('/', (req, res) => {
  try {
    const { institutionName, applicationId, category, representative } = req.body;

    if (!institutionName || !institutionName.trim()) {
      return res.status(400).json({ success: false, message: 'Institution Name is required.' });
    }

    const categoryObj = complianceConfig.applicationCategories.find(c => c.id === category)
      || complianceConfig.applicationCategories[0];

    const finalId = applicationId ? applicationId.trim() : `APP-${Date.now().toString().slice(-6)}`;
    if (store.getApplicationById(finalId)) {
      return res.status(409).json({ success: false, message: 'An application with this ID already exists.' });
    }

    const newApp = store.saveApplication({
      submittedBy: req.user.id,
      institutionId: req.body.institutionId ? String(req.body.institutionId).trim() : '',
      institutionName: institutionName.trim(),
      applicationId: finalId,
      category: categoryObj.id,
      representative: representative || {},
      status: 'SUBMITTED'
    });

    res.status(201).json({
      success: true,
      message: 'Application registered successfully.',
      application: newApp,
      expectedChecklist: categoryObj.requiredDocuments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get application by ID with checklist and attached documents
router.get('/:id', (req, res) => {
  const app = loadAllowedApplication(req, res);
  if (!app) return;

  const docs = store.getDocuments(app.id);
  const fields = store.getFieldsByApplication(app.id);
  const categoryObj = complianceConfig.applicationCategories.find(c => c.id === app.category) || {};

  // Compute checklist completion
  const checklist = (categoryObj.requiredDocuments || []).map(item => {
    const uploadedDoc = docs.find(d => d.documentType === item.type);
    return {
      ...item,
      isUploaded: !!uploadedDoc,
      documentId: uploadedDoc ? uploadedDoc.id : null,
      documentName: uploadedDoc ? uploadedDoc.originalName : null
    };
  });

  res.json({
    success: true,
    application: app,
    categoryDetails: categoryObj,
    checklist,
    documentsCount: docs.length,
    documents: docs,
    fields
  });
});

// Run validation
router.get('/:id/validation', (req, res) => {
  try {
    if (!loadAllowedApplication(req, res)) return;
    const results = validationService.validateApplication(req.params.id);
    res.json({ success: true, validation: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update application status (Authority: Accept / Reject / Under Review)
router.patch('/:id/status', requireRole('authority'), (req, res) => {
  const { status } = req.body;
  const VALID = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'];
  if (!status || !VALID.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${VALID.join(', ')}` });
  }
  const updated = store.updateApplicationStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ success: false, message: 'Application not found.' });
  res.json({ success: true, message: `Status updated to ${status}.`, application: updated });
});

// Import structured application data (Member 4's application_data.json format)
// so the rules R001-R006 can be tested on it. Body example is in demo-data/application_data.json.
router.post('/import', (req, res) => {
  try {
    const d = req.body || {};
    const finalId = d.application_id ? String(d.application_id).trim() : `APP-${Date.now().toString().slice(-6)}`;
    if (store.getApplicationById(finalId)) {
      return res.status(409).json({ success: false, message: 'An application with this ID already exists.' });
    }
    const asText = v => (v === undefined || v === null ? '' : String(v));
    const saved = store.saveApplication({
      applicationId: finalId,
      submittedBy: req.user.id,
      status: 'SUBMITTED',
      category: 'SIH_DEMO',
      // Blank values are kept on purpose: the rules decide what is missing.
      institutionName: asText(d.institution && d.institution.institution_name),
      institutionId: asText(d.institution && d.institution.institution_id),
      faculty: Array.isArray(d.faculty) ? d.faculty.map(f => ({
        faculty_id: asText(f.faculty_id), faculty_name: asText(f.faculty_name), qualification: asText(f.qualification)
      })) : [],
      declaredDocuments: Array.isArray(d.documents) ? d.documents.map(x => ({
        document_id: asText(x.document_id), document_type: asText(x.document_type), file_name: asText(x.file_name)
      })) : []
    });
    res.status(201).json({ success: true, application: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
