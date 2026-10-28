/**
 * Automated Verification Test Suite for Member 2 Backend Engine
 * Tests Preprocessor, Text Extraction, Field Identifier, and Sample Seeder
 */

require('./_env'); // throwaway database
const assert = require('assert');
const preprocessor = require('../services/preprocessor');
const fieldExtractor = require('../services/fieldExtractor');
const sampleDataService = require('../services/sampleDataService');
const validationService = require('../services/validationService');
const store = require('../db/store');

async function runTests() {
  console.log('🧪 Starting Member 2 Backend Engine Verification Tests...\n');

  // Test 1: Preprocessor Checksum & Duplicate Detection
  console.log('▶ Test 1: Checksum & Duplicate Detection');
  const testBuffer = Buffer.from('Antigravity Verification Test Document Content');
  const hash1 = preprocessor.calculateChecksum(testBuffer);
  const hash2 = preprocessor.calculateChecksum(testBuffer);
  assert.strictEqual(hash1, hash2, 'Checksums for identical buffers must match');
  assert.strictEqual(hash1.length, 64, 'SHA-256 hash length must be 64 characters');
  console.log('  ✔ SHA-256 Checksum generation verified:', hash1.slice(0, 16) + '...');

  // Test 2: Field Extraction on Real Sample Regulatory Text
  console.log('\n▶ Test 2: Field Extraction Engine (Regex & Heuristics)');
  const sampleAicteText = `
    ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
    Nelson Mandela Marg, New Delhi
    APPROVAL PROCESS 2026-27: EXTENSION OF APPROVAL
    F.No. Western/1-98765432/2026/EOA
    Issue Date: 15/06/2026
    To, The Principal,
    Example Engineering College
    Pune, Maharashtra
    Approved Intake: 360
    Total Faculty: 24
    Valid Until: 31/05/2027
    Issued by: All India Council for Technical Education (AICTE)
  `;

  const extraction = fieldExtractor.extract(sampleAicteText, {});
  assert.strictEqual(extraction.documentType, 'AICTE_APPROVAL', 'Document type should be AICTE_APPROVAL');

  const fieldsMap = {};
  extraction.fields.forEach(f => { fieldsMap[f.fieldName] = f.extractedValue; });

  console.log('  Extracted Fields:', fieldsMap);
  assert.ok(fieldsMap.institutionName.includes('Example Engineering College'), 'Should extract Institution Name');
  assert.ok(fieldsMap.certificateNumber.includes('1-98765432'), 'Should extract Certificate/Approval Number');
  assert.strictEqual(fieldsMap.issueDate, '2026-06-15', 'Should normalize Issue Date to 2026-06-15');
  assert.strictEqual(fieldsMap.expiryDate, '2027-05-31', 'Should normalize Expiry Date to 2027-05-31');
  assert.strictEqual(fieldsMap.approvedIntake, '360', 'Should extract Approved Intake 360');
  console.log('  ✔ Key-field extraction and date normalization verified.');

  // Test 3: Sample Data Seeding & Database Persistence
  console.log('\n▶ Test 3: Demo Scenario Seeding & Storage');
  const demoResult = await sampleDataService.seedDemoScenario();
  assert.strictEqual(demoResult.application.applicationId, 'APP-2026-DEMO-01');
  assert.strictEqual(demoResult.documentsCount, 3, 'Should seed 3 demo documents');

  const loadedApp = store.getApplicationById('APP-2026-DEMO-01');
  assert.ok(loadedApp, 'Application should persist in database');
  const loadedDocs = store.getDocuments('APP-2026-DEMO-01');
  assert.strictEqual(loadedDocs.length, 3, 'Should have 3 documents persisted');
  const loadedFields = store.getFieldsByApplication('APP-2026-DEMO-01');
  assert.ok(loadedFields.length >= 6, 'Should have extracted fields saved');
  console.log(`  ✔ Successfully seeded ${loadedDocs.length} documents with ${loadedFields.length} extracted fields.`);

  // Test 4: Member 3 Validation Hook
  console.log('\n▶ Test 4: Downstream Validation Engine Compatibility');
  const validation = validationService.validateApplication('APP-2026-DEMO-01');
  console.log(`  Validation Findings Count: ${validation.totalFindings}`);
  console.log('  Findings:', validation.findings.map(f => `[${f.severity}] ${f.title}`));

  // Verify that the intentional discrepancy in Fire Safety NOC was caught
  const nameFinding = validation.findings.find(f => f.checkType === 'CONSISTENCY_CHECK');
  assert.ok(nameFinding, 'Should detect the name mismatch with Example Technical College');
  console.log('  ✔ Correctly detected institution name mismatch for Member 3.');

  // Verify that the expired certificate in Building Safety was caught
  const expiryFinding = validation.findings.find(f => f.checkType === 'DATE_VALIDITY_CHECK');
  assert.ok(expiryFinding, 'Should detect the expired 2024 certificate');
  console.log('  ✔ Correctly detected expired certificate for Member 3.');

  console.log('\n=======================================================');
  console.log('🎉 ALL BACKEND & OCR ENGINE TESTS PASSED SUCCESSFULLY!');
  console.log('=======================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
