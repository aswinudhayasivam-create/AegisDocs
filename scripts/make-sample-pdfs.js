/**
 * Makes the FICTIONAL sample PDFs in demo-data/sample-documents/.
 * Run once:  node scripts/make-sample-pdfs.js
 * Every file says SYNTHETIC SAMPLE. None of this is a real certificate.
 */
const fs = require('fs');
const path = require('path');
const sample = require('../server/services/sampleDataService');

const OUT = path.join(__dirname, '..', 'demo-data', 'sample-documents');
const NOTE = 'SYNTHETIC SAMPLE - FICTIONAL DATA, NOT A REAL DOCUMENT';

const files = {
  '01_institutional_application.pdf': [
    'APPROVAL APPLICATION', NOTE, '',
    'Name of the Institution: ABC Engineering College',
    'Application ID: APP001',
    'Issue Date: 20-10-2026',
    'Issued by: All India Council for Technical Education (AICTE)',
    'Approved Intake: 120'
  ],
  '02_faculty_qualification_record.pdf': [
    'FACULTY QUALIFICATION RECORD', NOTE, '',
    'Name of the Institution: ABC Engineering College',
    'Faculty ID: FAC001',
    'Faculty Name: Arun Kumar',
    'Qualification: M.E.',
    'Certificate Reference: CERT001',
    'Issue Date: 10-05-2024',
    'Total Faculty: 1'
  ],
  '03_faculty_record_missing_id.pdf': [
    'FACULTY QUALIFICATION RECORD', NOTE, '',
    'Name of the Institution: ABC Engineering College',
    'Faculty Name: Meena Devi',
    'Qualification: M.Tech.',
    'Issue Date: 10-05-2024'
  ]
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, lines] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name), await sample.createSimplePdf(lines));
    console.log('made', name);
  }
})();
