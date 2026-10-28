/**
 * Key-Field Information Extraction Engine (Member 2 - Step 3, Section 5.3)
 * 
 * Extracts structured fields from raw OCR or PDF text:
 * - Document Classification
 * - Institution Name
 * - Certificate / Approval Number
 * - Issue Date & Validity / Expiry Date (standardized to ISO)
 * - Issuing Authority
 * - Quantitative fields (Intake, Faculty)
 * 
 * Provides extraction confidence and source line snippets for human auditability.
 */

const { documentTypes, fieldRules } = require('../config/rulesConfig');

class FieldExtractor {
  /**
   * Main extraction pipeline
   */
  extract(rawText, docHint = {}) {
    if (!rawText || typeof rawText !== 'string') {
      return {
        documentType: 'UNCLASSIFIED',
        fields: []
      };
    }

    const cleanText = rawText.replace(/\r/g, '');
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Classify Document Type
    const classifiedType = this.classifyDocumentType(cleanText, docHint.suggestedType);

    // 2. Extract Fields
    const fields = [];

    // Institution Name
    const inst = this.extractInstitutionName(cleanText, lines);
    if (inst) fields.push(inst);

    // Certificate / Approval Number
    const cert = this.extractCertificateNumber(cleanText, lines);
    if (cert) fields.push(cert);

    // Issue Date
    const issueDate = this.extractIssueDate(cleanText, lines);
    if (issueDate) fields.push(issueDate);

    // Expiry / Validity Date
    const expiryDate = this.extractExpiryDate(cleanText, lines);
    if (expiryDate) fields.push(expiryDate);

    // Issuing Authority
    const authority = this.extractAuthority(cleanText, lines, classifiedType);
    if (authority) fields.push(authority);

    // Intake / Faculty counts if present
    const intake = this.extractIntake(cleanText);
    if (intake) fields.push(intake);

    const faculty = this.extractFacultyCount(cleanText);
    if (faculty) fields.push(faculty);

    // Faculty ID / Faculty Name (used by Member 4 rules R004, R005)
    const facultyId = this.extractSimple(cleanText, 'facultyId');
    if (facultyId) fields.push(facultyId);
    const facultyName = this.extractSimple(cleanText, 'facultyName');
    if (facultyName) fields.push(facultyName);

    return {
      documentType: classifiedType,
      fields
    };
  }

  /**
   * Classify Document Type based on keyword scoring
   */
  classifyDocumentType(text, suggested = null) {
    if (suggested && documentTypes.some(d => d.id === suggested)) {
      return suggested;
    }

    const lower = text.toLowerCase();
    let bestType = 'UNCLASSIFIED';
    let highestScore = 0;

    for (const doc of documentTypes) {
      let score = 0;
      for (const kw of doc.keywords) {
        if (lower.includes(kw)) {
          score += 1;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestType = doc.id;
      }
    }

    return bestType;
  }

  /**
   * Extract Institution Name
   */
  extractInstitutionName(text, lines) {
    const rule = fieldRules.institutionName;
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = rule.cleaner ? rule.cleaner(match[1]) : match[1].trim();
        if (val.length >= 5 && val.length <= 120) {
          const snippet = this.findSnippet(lines, val);
          return {
            fieldName: 'institutionName',
            label: rule.label,
            extractedValue: val,
            confidence: 0.92,
            sourceSnippet: snippet,
            pageNumber: 1
          };
        }
      }
    }

    // Heuristic fallback: check lines containing key educational suffixes
    for (const line of lines) {
      if (rule.keywords.some(kw => line.includes(kw))) {
        if (!line.toLowerCase().includes('authority') && !line.toLowerCase().includes('board') && line.length <= 100) {
          return {
            fieldName: 'institutionName',
            label: rule.label,
            extractedValue: line.trim(),
            confidence: 0.75,
            sourceSnippet: line,
            pageNumber: 1
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract Certificate / Approval Number
   */
  extractCertificateNumber(text, lines) {
    const rule = fieldRules.certificateNumber;
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = rule.cleaner ? rule.cleaner(match[1]) : match[1].trim();
        if (val.length >= 4 && val.length <= 50) {
          return {
            fieldName: 'certificateNumber',
            label: rule.label,
            extractedValue: val,
            confidence: 0.90,
            sourceSnippet: this.findSnippet(lines, val),
            pageNumber: 1
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract Issue Date and normalize to ISO YYYY-MM-DD
   */
  extractIssueDate(text, lines) {
    const rule = fieldRules.issueDate;
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rawDate = match[1].trim();
        const iso = this.normalizeDate(rawDate);
        return {
          fieldName: 'issueDate',
          label: rule.label,
          extractedValue: iso || rawDate,
          rawMatch: rawDate,
          confidence: iso ? 0.93 : 0.70,
          sourceSnippet: this.findSnippet(lines, rawDate),
          pageNumber: 1
        };
      }
    }
    return null;
  }

  /**
   * Extract Expiry / Valid Until Date
   */
  extractExpiryDate(text, lines) {
    const rule = fieldRules.expiryDate;
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rawDate = match[1].trim();
        const iso = this.normalizeDate(rawDate);
        return {
          fieldName: 'expiryDate',
          label: rule.label,
          extractedValue: iso || rawDate,
          rawMatch: rawDate,
          confidence: iso ? 0.91 : 0.70,
          sourceSnippet: this.findSnippet(lines, rawDate),
          pageNumber: 1
        };
      }
    }
    return null;
  }

  /**
   * Extract Issuing Authority
   */
  extractAuthority(text, lines, docType) {
    const rule = fieldRules.issuingAuthority;
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = rule.cleaner ? rule.cleaner(match[1]) : match[1].trim();
        return {
          fieldName: 'issuingAuthority',
          label: rule.label,
          extractedValue: val,
          confidence: 0.88,
          sourceSnippet: this.findSnippet(lines, val),
          pageNumber: 1
        };
      }
    }

    // Default based on recognized document type
    const defaultAuthorities = {
      'AICTE_APPROVAL': 'All India Council for Technical Education (AICTE)',
      'FIRE_SAFETY_NOC': 'State Fire and Emergency Services Department',
      'BUILDING_LAND_SAFETY': 'Competent Building Authority / PWD'
    };

    if (defaultAuthorities[docType]) {
      return {
        fieldName: 'issuingAuthority',
        label: rule.label,
        extractedValue: defaultAuthorities[docType],
        confidence: 0.80,
        sourceSnippet: `Inferred from classified document type: ${docType}`,
        pageNumber: 1
      };
    }

    return null;
  }

  extractIntake(text) {
    const rule = fieldRules.approvedIntake;
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          fieldName: 'approvedIntake',
          label: rule.label,
          extractedValue: match[1].trim(),
          confidence: 0.85,
          sourceSnippet: match[0],
          pageNumber: 1
        };
      }
    }
    return null;
  }

  // Plain "label: value" field taken from the first matching pattern in rulesConfig
  extractSimple(text, key) {
    const rule = fieldRules[key];
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          fieldName: key,
          label: rule.label,
          extractedValue: match[1].trim(),
          confidence: 0.85,
          sourceSnippet: match[0],
          pageNumber: 1
        };
      }
    }
    return null;
  }

  extractFacultyCount(text) {
    const rule = fieldRules.facultyCount;
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          fieldName: 'facultyCount',
          label: rule.label,
          extractedValue: match[1].trim(),
          confidence: 0.85,
          sourceSnippet: match[0],
          pageNumber: 1
        };
      }
    }
    return null;
  }

  /**
   * Date normalization helper
   */
  normalizeDate(str) {
    try {
      // 1. DD/MM/YYYY or DD-MM-YYYY
      const dmy = str.match(/^([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})$/);
      if (dmy) {
        let [, d, m, y] = dmy;
        if (y.length === 2) y = `20${y}`;
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        return `${y}-${month}-${day}`;
      }

      // 2. Text dates like 15 June 2026 or June 15, 2026
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {
      // Return raw string if normalization fails
    }
    return null;
  }

  /**
   * Helper: Locate surrounding snippet of matched text for audit traceability
   */
  findSnippet(lines, query) {
    if (!query) return '';
    const cleanQuery = query.toLowerCase();
    const idx = lines.findIndex(l => l.toLowerCase().includes(cleanQuery));
    if (idx >= 0) {
      const start = Math.max(0, idx - 1);
      const end = Math.min(lines.length, idx + 2);
      return lines.slice(start, end).join(' | ');
    }
    return query;
  }
}

module.exports = new FieldExtractor();
