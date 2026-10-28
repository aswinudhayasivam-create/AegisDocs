/**
 * Document Preprocessor Service (Member 2 - Step 2, Section 5.2)
 * 
 * Responsibilities:
 * - Validate file format and size limits.
 * - Calculate SHA-256 cryptographic checksum for duplicate detection.
 * - Detect whether a PDF has machine-readable text or is a scanned image.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const store = require('../db/store');

const ALLOWED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg'
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

class Preprocessor {
  /**
   * Validate file buffer, size, and extension
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided for processing.');
    }

    if (file.size > MAX_FILE_SIZE) {
      const err = new Error(`File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum allowed limit of 25MB.`);
      err.statusCode = 400;
      throw err;
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isMimeAllowed = Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TYPES, file.mimetype);
    const isExtAllowed = ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);

    if (!isMimeAllowed && !isExtAllowed) {
      const err = new Error(`Unsupported file type: .${ext}. Only PDF, PNG, and JPEG documents are permitted.`);
      err.statusCode = 400;
      throw err;
    }

    return {
      isValid: true,
      extension: ext,
      mimeType: file.mimetype || `image/${ext}`
    };
  }

  /**
   * Calculate SHA-256 cryptographic checksum of file buffer
   */
  calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if exact duplicate file exists across current or other applications
   */
  checkDuplicate(checksum, currentAppId = null) {
    const existing = store.findDocumentByChecksum(checksum);
    if (existing) {
      return {
        isDuplicate: true,
        originalDocumentId: existing.id,
        originalApplicationId: existing.applicationId,
        isSameApplication: existing.applicationId === currentAppId,
        message: existing.applicationId === currentAppId
          ? `Warning: Exact file already uploaded under this application as "${existing.originalName}".`
          : `Warning: This exact file was previously submitted in Application ID: ${existing.applicationId}.`
      };
    }
    return {
      isDuplicate: false,
      message: 'Checksum verified. No duplicate detected.'
    };
  }
}

module.exports = new Preprocessor();
