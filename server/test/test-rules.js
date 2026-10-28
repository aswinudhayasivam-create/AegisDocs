/**
 * Member 3 / Member 4 tests: the rule engine and rules R001-R006.
 * The four cases T001-T004 come from Member 4's test_cases.json.
 */
require('./_env');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const engine = require('../rulesEngine/engine');

const baseFile = path.join(__dirname, '..', '..', 'demo-data', 'application_data.json');
const fresh = () => JSON.parse(fs.readFileSync(baseFile, 'utf-8'));
const failedIds = run => run.results.filter(r => r.status === 'FAIL').map(r => r.ruleId);

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ✔', name);
}

console.log('Rule engine tests (Member 3 + Member 4 data)');

test('rules file has R001-R006', () => {
  assert.deepStrictEqual(engine.loadRules().map(r => r.id), ['R001', 'R002', 'R003', 'R004', 'R005', 'R006']);
});

test('T001 valid data: no rule fails', () => {
  const run = engine.evaluate(fresh());
  assert.strictEqual(run.failed, 0);
  assert.strictEqual(run.checked, run.passed);
});

test('T002 missing institution name: only R002 fails', () => {
  const d = fresh(); d.institution.institution_name = '';
  assert.deepStrictEqual(failedIds(engine.evaluate(d)), ['R002']);
});

test('T003 missing faculty ID: only R004 fails, and it names the faculty record', () => {
  const d = fresh(); d.faculty[0].faculty_id = '';
  const run = engine.evaluate(d);
  assert.deepStrictEqual(failedIds(run), ['R004']);
  assert.strictEqual(run.results.find(r => r.status === 'FAIL').target, 'faculty #1');
});

test('T004 missing document type: only R006 fails for that document', () => {
  const d = fresh(); d.documents[0].document_type = '';
  const run = engine.evaluate(d);
  assert.deepStrictEqual(failedIds(run), ['R006']);
  assert.strictEqual(run.results.find(r => r.status === 'FAIL').target, 'document #1');
});

test('missing application ID and institution ID fail R001 and R003', () => {
  const d = fresh(); delete d.application_id; d.institution.institution_id = '   ';
  assert.deepStrictEqual(failedIds(engine.evaluate(d)).sort(), ['R001', 'R003']);
});

test('two faculty records: each checked separately', () => {
  const d = fresh(); d.faculty.push({ faculty_id: 'FAC002', faculty_name: '' });
  const run = engine.evaluate(d);
  assert.deepStrictEqual(failedIds(run), ['R005']);
  assert.strictEqual(run.results.find(r => r.status === 'FAIL').target, 'faculty #2');
});

test('unknown rule type is reported, not silently passed', () => {
  const run = engine.evaluate(fresh(), [{ id: 'RX', name: 'x', scope: 'application', field: 'a', rule_type: 'magic', severity: 'low' }]);
  assert.strictEqual(run.results[0].status, 'ERROR');
});

test('buildApplicationData reads faculty from extracted fields', () => {
  const app = { applicationId: 'A1', institutionName: 'X College', institutionId: 'I1' };
  const docs = [{ id: 'D1', documentType: 'FACULTY_RECORD', originalName: 'f.pdf' }];
  const fields = [
    { documentId: 'D1', fieldName: 'facultyId', extractedValue: 'FAC9' },
    { documentId: 'D1', fieldName: 'facultyName', extractedValue: 'Ravi' }
  ];
  const data = engine.buildApplicationData(app, docs, fields);
  assert.deepStrictEqual(data.faculty, [{ faculty_id: 'FAC9', faculty_name: 'Ravi' }]);
  assert.strictEqual(data.documents[0].document_type, 'FACULTY_RECORD');
});

console.log(`\n${passed} rule-engine tests passed.`);
