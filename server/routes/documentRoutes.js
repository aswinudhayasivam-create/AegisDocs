/**
 * Document Ingestion & OCR Routes (Member 1 & Member 2)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const store = require('../db/store');
const { requireAuth, requireRole, canAccessApplication } = require('../middleware/auth');

// Every route needs a login, and only the owner (or authority) may touch an application's documents.
router.use(requireAuth);
function allowedForApplication(req, applicationId) {
  return canAccessApplication(req.user, store.getApplicationById(applicationId));
}
const preprocessor = require('../services/preprocessor');
const ocrService = require('../services/ocrService');
const fieldExtractor = require('../services/fieldExtractor');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

// Upload and Process Document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const file = req.file;
    const { applicationId, documentType } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No document file uploaded.' });
    }

    if (!applicationId) {
      if (file) fs.unlink(file.path, () => {});
      return res.status(400).json({ success: false, message: 'Application ID is required.' });
    }
    if (!allowedForApplication(req, applicationId)) {
      if (file) fs.unlink(file.path, () => {});
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // 1. File validation
    preprocessor.validateFile(file);

    // 2. Read buffer & calculate SHA-256 checksum
    const buffer = fs.readFileSync(file.path);
    const checksum = preprocessor.calculateChecksum(buffer);

    // 3. Duplicate check
    const duplicateCheck = preprocessor.checkDuplicate(checksum, applicationId);

    // 4. Run OCR / Text Extraction
    const extractionResult = await ocrService.extractText(buffer, file.mimetype, file.originalname);

    // 5. Run Field Identification Engine
    const fieldResult = fieldExtractor.extract(extractionResult.rawText, {
      suggestedType: documentType
    });

    const finalDocType = documentType && documentType !== 'UNCLASSIFIED'
      ? documentType
      : fieldResult.documentType;

    // 6. Save Document Record
    const savedDoc = store.saveDocument({
      applicationId,
      documentType: finalDocType,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      checksum,
      isDigitalPdf: extractionResult.isDigitalPdf,
      pageCount: extractionResult.pageCount || 1,
      rawText: extractionResult.rawText
    });

    // 7. Save Extracted Fields
    const fieldsToSave = fieldResult.fields.map(f => ({
      ...f,
      documentId: savedDoc.id,
      applicationId
    }));

    const savedFields = store.saveFields(fieldsToSave);

    res.status(201).json({
      success: true,
      message: 'Document uploaded and processed successfully.',
      document: savedDoc,
      duplicateWarning: duplicateCheck.isDuplicate ? duplicateCheck.message : null,
      extractionSummary: {
        method: extractionResult.method,
        isDigitalPdf: extractionResult.isDigitalPdf,
        fieldsExtracted: savedFields.length
      },
      fields: savedFields
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    // Do not leave the rejected upload sitting in the uploads folder.
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// Get document details with fields and raw text
router.get('/:id', (req, res) => {
  const guardDoc = store.getDocumentById(req.params.id);
  if (!guardDoc || !allowedForApplication(req, guardDoc.applicationId)) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }
  const doc = store.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }

  const fields = store.getFieldsByDocument(doc.id);

  res.json({
    success: true,
    document: doc,
    fields
  });
});

// Serve physical file for preview
router.get('/:id/file', (req, res) => {
  const guardDoc = store.getDocumentById(req.params.id);
  if (!guardDoc || !allowedForApplication(req, guardDoc.applicationId)) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }
  const doc = store.getDocumentById(req.params.id);
  if (!doc || !fs.existsSync(doc.filePath)) {
    return res.status(404).json({ success: false, message: 'File not found on storage.' });
  }

  res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
  res.sendFile(path.resolve(doc.filePath));
});

// Update or manually verify extracted fields (Human-in-the-Loop Review)
// Human-in-the-loop correction is authority-only: the UI only shows the editor to the
// authority, and the API must match - otherwise a submitting institution could rewrite an
// extracted value (for example a mismatched institution name) and make its own finding disappear.
router.put('/:id/fields', requireRole('authority'), (req, res) => {
  const guardDoc = store.getDocumentById(req.params.id);
  if (!guardDoc || !allowedForApplication(req, guardDoc.applicationId)) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }
  try {
    const { fieldName, newValue } = req.body;
    if (!fieldName) {
      return res.status(400).json({ success: false, message: 'fieldName is required.' });
    }

    const updated = store.updateField(req.params.id, fieldName, newValue, true, { id: req.user.id, role: req.user.role });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Field not found for this document.' });
    }

    res.json({
      success: true,
      message: 'Field updated and verified.',
      field: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete document
router.delete('/:id', (req, res) => {
  const guardDoc = store.getDocumentById(req.params.id);
  if (!guardDoc || !allowedForApplication(req, guardDoc.applicationId)) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }
  const doc = store.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }

  if (fs.existsSync(doc.filePath)) {
    try {
      fs.unlinkSync(doc.filePath);
    } catch (e) {
      // Ignore unlink error if locked
    }
  }

  store.deleteDocument(doc.id);
  res.json({ success: true, message: 'Document deleted successfully.' });
});

module.exports = router;
