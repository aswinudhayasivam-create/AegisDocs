/**
 * Synthetic Sample Data & Demo Generator (Sections 6 & 10)
 * 
 * Generates realistic sample documents to demonstrate:
 * 1. AICTE Approval Letter (Digital PDF, matching name, valid).
 * 2. Fire Safety Certificate (Scanned NOC with institution name discrepancy: 'Example Technical College').
 * 3. Building Safety Certificate (Expired certificate with validity ended in 2024).
 * 4. Complete Application record ready for live demonstration.
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const store = require('../db/store');
const preprocessor = require('./preprocessor');
const ocrService = require('./ocrService');
const fieldExtractor = require('./fieldExtractor');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

class SampleDataService {
  /**
   * Helper: Generate a valid, standards-compliant PDF buffer using pdf-lib
   */
  async createSimplePdf(lines) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 740;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeader = i === 0 || line.includes('CERTIFICATE') || line.includes('APPROVAL');
      page.drawText(line, {
        x: 50,
        y: y,
        size: isHeader ? 13 : 11,
        font: isHeader ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 26;
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    return Buffer.from(pdfBytes);
  }

  /**
   * Seed the complete Section 6 Scenario
   */
  async seedDemoScenario() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // 1. Create Demo Application
    const appId = 'APP-2026-DEMO-01';
    const app = store.saveApplication({
      id: appId,
      applicationId: appId,
      institutionName: 'Example Engineering College',
      institutionId: 'INST-DEMO-001',
      category: 'EOA_TECHNICAL',
      representative: {
        name: 'Dr. R. K. Sharma',
        designation: 'Principal / Director',
        email: 'principal@example-college.edu.in',
        phone: '+91 98765 43210'
      },
      status: 'UNDER_VERIFICATION'
    });

    // 2. Sample 1: AICTE Approval Letter (Valid Digital PDF)
    const aictePdfBuffer = await this.createSimplePdf([
      'ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)',
      'APPROVAL PROCESS 2026-27: EXTENSION OF APPROVAL (EoA)',
      'F.No. Western/1-98765432/2026/EOA',
      'Issue Date: 15/06/2026',
      'Name of Institution: Example Engineering College',
      'Subject: Extension of Approval for Academic Year 2026-2027',
      'Approved Intake: 360',
      'Total Faculty: 24',
      'Valid Until: 31/05/2027',
      'Issued by: All India Council for Technical Education (AICTE)'
    ]);
    const aictePath = path.join(UPLOADS_DIR, 'aicte_approval_2026.pdf');
    fs.writeFileSync(aictePath, aictePdfBuffer);

    // 3. Sample 2: Fire Safety NOC (Has name mismatch: 'Example Technical College')
    const firePdfBuffer = await this.createSimplePdf([
      'GOVERNMENT OF MAHARASHTRA',
      'DIRECTORATE OF FIRE AND EMERGENCY SERVICES',
      'NO OBJECTION CERTIFICATE (FIRE SAFETY NOC)',
      'Certificate No: FS-NOC-2026-4491',
      'Issue Date: 10/01/2026',
      'Name of Institution: Example Technical College',
      'Building Type: Educational Building (Group B)',
      'Valid Until: 09/01/2027',
      'Issuing Authority: Directorate of Fire and Emergency Services, Pune Division'
    ]);
    const firePath = path.join(UPLOADS_DIR, 'fire_safety_noc.pdf');
    fs.writeFileSync(firePath, firePdfBuffer);

    // 4. Sample 3: Building Safety Certificate (Has expired date: Valid until 31/12/2024)
    const bldgPdfBuffer = await this.createSimplePdf([
      'PUBLIC WORKS DEPARTMENT (PWD)',
      'CERTIFICATE OF STRUCTURAL STABILITY & SAFETY',
      'Certificate Ref: PWD-BLDG-2022-81',
      'Issue Date: 12/08/2022',
      'Name of Institution: Example Engineering College',
      'Structural Audit: All academic and laboratory blocks inspected.',
      'Valid Until: 31/12/2024',
      'Issuing Authority: Executive Engineer, Public Works Department (PWD)'
    ]);
    const bldgPath = path.join(UPLOADS_DIR, 'building_safety_certificate.pdf');
    fs.writeFileSync(bldgPath, bldgPdfBuffer);

    // Process all three documents through Member 2's pipeline
    const sampleFiles = [
      {
        fileName: 'aicte_approval_2026.pdf',
        originalName: 'AICTE_EoA_Approval_Letter_2026-27.pdf',
        filePath: aictePath,
        buffer: aictePdfBuffer,
        mimeType: 'application/pdf',
        suggestedType: 'AICTE_APPROVAL'
      },
      {
        fileName: 'fire_safety_noc.pdf',
        originalName: 'Fire_Safety_NOC_Pune.pdf',
        filePath: firePath,
        buffer: firePdfBuffer,
        mimeType: 'application/pdf',
        suggestedType: 'FIRE_SAFETY_NOC'
      },
      {
        fileName: 'building_safety_certificate.pdf',
        originalName: 'PWD_Building_Safety_Certificate.pdf',
        filePath: bldgPath,
        buffer: bldgPdfBuffer,
        mimeType: 'application/pdf',
        suggestedType: 'BUILDING_LAND_SAFETY'
      }
    ];

    const processedDocs = [];

    for (const sf of sampleFiles) {
      // 1. Checksum
      const checksum = preprocessor.calculateChecksum(sf.buffer);

      // 2. OCR / Extraction
      const extracted = await ocrService.extractText(sf.buffer, sf.mimeType, sf.originalName);

      // 3. Save Document Record
      const docRecord = store.saveDocument({
        applicationId: appId,
        documentType: sf.suggestedType,
        originalName: sf.originalName,
        fileName: sf.fileName,
        filePath: sf.filePath,
        fileType: sf.mimeType,
        fileSize: sf.buffer.length,
        checksum: checksum,
        isDigitalPdf: extracted.isDigitalPdf,
        pageCount: extracted.pageCount,
        rawText: extracted.rawText
      });

      // 4. Field Extraction
      const fieldResults = fieldExtractor.extract(extracted.rawText, { suggestedType: sf.suggestedType });

      // Associate fields with doc
      const fieldsToSave = fieldResults.fields.map(f => ({
        ...f,
        documentId: docRecord.id,
        applicationId: appId
      }));

      store.saveFields(fieldsToSave);

      processedDocs.push({
        document: docRecord,
        fields: fieldsToSave
      });
    }

    return {
      application: app,
      documentsCount: processedDocs.length,
      documents: processedDocs
    };
  }
}

module.exports = new SampleDataService();
