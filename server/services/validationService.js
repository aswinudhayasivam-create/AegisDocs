/**
 * Validation Engine Integration Hook (Prepared for Member 3)
 * 
 * Member 3's validation entry point (checks 1-3 are the original basic checks, check 4 runs Member 4's rules via rulesEngine/engine.js).
 * Demonstrates how Member 3's validation rules plug directly into
 * the data extracted by Member 2 and registered by Member 1:
 * - Checks for missing documents against category checklist.
 * - Checks cross-document institution name consistency (Section 5.4).
 * - Checks expired certificates against current date.
 * - Detects duplicate file uploads using SHA-256 checksums.
 */

const complianceConfig = require('../config/complianceRules.json');
const store = require('../db/store');
const rulesEngine = require('../rulesEngine/engine');

class ValidationService {
  /**
   * Run validation checks for an application
   */
  validateApplication(applicationId) {
    const app = store.getApplicationById(applicationId);
    if (!app) {
      throw new Error(`Application ${applicationId} not found.`);
    }

    const docs = store.getDocuments(applicationId);
    const fields = store.getFieldsByApplication(applicationId);

    const findings = [];

    // 1. Missing Documents Check (against Category checklist)
    const categoryRules = complianceConfig.applicationCategories.find(c => c.id === app.category);
    if (categoryRules) {
      for (const reqDoc of categoryRules.requiredDocuments) {
        const uploaded = docs.find(d => d.documentType === reqDoc.type);
        if (!uploaded && reqDoc.mandatory) {
          findings.push({
            id: `FIND-MISSING-${reqDoc.type}`,
            checkType: 'MANDATORY_DOCUMENT_CHECK',
            severity: 'ERROR',
            title: `Missing Mandatory Document: ${reqDoc.label}`,
            description: `The application requires ${reqDoc.label} (${reqDoc.description}), but it has not been uploaded.`,
            status: 'UNRESOLVED'
          });
        }
      }
    }

    // 2. Cross-Document Institution Name Consistency Check
    const nameFields = fields.filter(f => f.fieldName === 'institutionName');
    const registeredName = app.institutionName.toLowerCase().trim();

    for (const nf of nameFields) {
      const extracted = nf.extractedValue.toLowerCase().trim();
      if (extracted && !registeredName.includes(extracted) && !extracted.includes(registeredName)) {
        findings.push({
          id: `FIND-NAME-MISMATCH-${nf.documentId}`,
          checkType: 'CONSISTENCY_CHECK',
          severity: 'WARNING',
          title: 'Institution Name Inconsistency Detected',
          description: `Application registered as "${app.institutionName}", but document contains "${nf.extractedValue}".`,
          evidence: {
            applicationValue: app.institutionName,
            documentValue: nf.extractedValue,
            documentId: nf.documentId,
            sourceSnippet: nf.sourceSnippet
          },
          status: 'REQUIRES_REVIEW'
        });
      }
    }

    // 3. Certificate Expiration Date Check
    const today = new Date().toISOString().split('T')[0];
    const expiryFields = fields.filter(f => f.fieldName === 'expiryDate');

    for (const ef of expiryFields) {
      if (ef.extractedValue && ef.extractedValue.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        if (ef.extractedValue < today) {
          findings.push({
            id: `FIND-EXPIRED-${ef.documentId}`,
            checkType: 'DATE_VALIDITY_CHECK',
            severity: 'WARNING',
            title: 'Potentially Expired Certificate',
            description: `Certificate validity ended on ${ef.extractedValue} (Current date: ${today}).`,
            evidence: {
              expiryDate: ef.extractedValue,
              documentId: ef.documentId,
              sourceSnippet: ef.sourceSnippet
            },
            status: 'REQUIRES_REVIEW'
          });
        }
      }
    }

    // 4. Member 4 rules (R001-R006) run by the rule engine
    const ruleRun = rulesEngine.evaluate(rulesEngine.buildApplicationData(app, docs, fields));
    const severityMap = { high: 'ERROR', medium: 'WARNING', low: 'WARNING' };
    for (const r of ruleRun.results.filter(x => x.status !== 'PASS')) {
      findings.push({
        id: `FIND-RULE-${r.ruleId}-${r.target.replace(/\W+/g, '_')}`,
        checkType: 'RULE_CHECK',
        severity: severityMap[r.severity] || 'WARNING',
        title: `${r.ruleId}: ${r.name} (${r.target})`,
        description: r.message,
        status: 'REQUIRES_REVIEW'
      });
    }

    return {
      applicationId,
      rules: { checked: ruleRun.checked, passed: ruleRun.passed, failed: ruleRun.failed },
      evaluatedAt: new Date().toISOString(),
      totalFindings: findings.length,
      errorsCount: findings.filter(f => f.severity === 'ERROR').length,
      warningsCount: findings.filter(f => f.severity === 'WARNING').length,
      findings
    };
  }
}

module.exports = new ValidationService();
