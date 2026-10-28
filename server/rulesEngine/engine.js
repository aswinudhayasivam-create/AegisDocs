/**
 * Rule Engine (Member 3 role)
 *
 * NEW IMPLEMENTATION written by Member 6's assistant. It is NOT the team's
 * separate "ai-validation-engine.zip", which has not been reviewed.
 *
 * It reads simple rules (config/validationRules.json, Member 4's R001-R006)
 * and checks them against structured application data:
 *
 *   {
 *     application_id: "APP001",
 *     institution: { institution_id: "INST001", institution_name: "ABC College" },
 *     faculty:   [ { faculty_id: "FAC001", faculty_name: "Arun Kumar" } ],
 *     documents: [ { document_type: "institutional_application" } ]
 *   }
 *
 * Each rule has a "scope" that says where to look:
 *   application  -> data[field]
 *   institution  -> data.institution[field]
 *   faculty      -> every item in data.faculty
 *   documents    -> every item in data.documents
 *
 * Only rule_type "required" exists today. To add a new type (for example
 * "date_not_expired"), add one case in checkRule().
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_RULES_FILE = path.join(__dirname, '..', 'config', 'validationRules.json');

function loadRules(file = DEFAULT_RULES_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf-8')).rules;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

// Returns the list of things a rule should look at: [{ label, record }]
function targetsFor(rule, data) {
  switch (rule.scope) {
    case 'application':
      return [{ label: 'application', record: data }];
    case 'institution':
      return [{ label: 'institution', record: data.institution || {} }];
    case 'faculty':
      return (data.faculty || []).map((r, i) => ({ label: `faculty #${i + 1}`, record: r }));
    case 'documents':
      return (data.documents || []).map((r, i) => ({ label: `document #${i + 1}`, record: r }));
    default:
      return null;
  }
}

function checkRule(rule, data) {
  const targets = targetsFor(rule, data);
  if (!targets) {
    return [{ ruleId: rule.id, name: rule.name, severity: rule.severity, status: 'ERROR',
      target: rule.scope, message: `Unknown scope "${rule.scope}".` }];
  }

  return targets.map(({ label, record }) => {
    let passed;
    switch (rule.rule_type) {
      case 'required':
        passed = !isBlank(record[rule.field]);
        break;
      default:
        return { ruleId: rule.id, name: rule.name, severity: rule.severity, status: 'ERROR',
          target: label, message: `Unknown rule type "${rule.rule_type}".` };
    }
    return {
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      status: passed ? 'PASS' : 'FAIL',
      target: label,
      message: passed ? 'OK' : rule.description
    };
  });
}

/** Run every rule against the data. */
function evaluate(data, rules = loadRules()) {
  const results = [];
  for (const rule of rules) results.push(...checkRule(rule, data));
  return {
    results,
    checked: results.length,
    passed: results.filter(r => r.status === 'PASS').length,
    failed: results.filter(r => r.status === 'FAIL').length
  };
}

/**
 * Turn what the app has stored (application + uploaded documents + extracted
 * fields) into the structured shape above.
 */
function buildApplicationData(app, docs = [], fields = []) {
  // Faculty: use the structured list if the application came from an import,
  // otherwise build one record per document that had a Faculty ID / Name.
  let faculty = (app.faculty || []).map(f => ({ ...f }));
  if (faculty.length === 0) {
    for (const doc of docs) {
      const id = fields.find(f => f.documentId === doc.id && f.fieldName === 'facultyId');
      const name = fields.find(f => f.documentId === doc.id && f.fieldName === 'facultyName');
      if (id || name) {
        faculty.push({
          faculty_id: id ? id.extractedValue : '',
          faculty_name: name ? name.extractedValue : ''
        });
      }
    }
  }

  const documents = [
    ...(app.declaredDocuments || []).map(d => ({ ...d })),
    ...docs.map(d => ({ document_type: d.documentType, file_name: d.originalName }))
  ];

  return {
    application_id: app.applicationId,
    institution: { institution_id: app.institutionId, institution_name: app.institutionName },
    faculty,
    documents
  };
}

module.exports = { loadRules, evaluate, buildApplicationData, isBlank };
