/**
 * Report Generation Service
 * Generates a structured multi-page PDF report for an application using pdf-lib.
 */

const { PDFDocument, rgb, StandardFonts, PageSizes } = require('pdf-lib');
const store = require('../db/store');
const validationService = require('./validationService');
const complianceRules = require('../config/complianceRules.json');

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary:      rgb(0.18, 0.35, 0.78),
  primaryDark:  rgb(0.12, 0.25, 0.62),
  gold:         rgb(0.96, 0.70, 0.12),
  success:      rgb(0.06, 0.55, 0.32),
  danger:       rgb(0.82, 0.18, 0.18),
  warning:      rgb(0.82, 0.48, 0.05),
  dangerBg:     rgb(1.00, 0.93, 0.93),
  warningBg:    rgb(1.00, 0.97, 0.88),
  slate600:     rgb(0.28, 0.36, 0.47),
  slate400:     rgb(0.58, 0.64, 0.72),
  slate100:     rgb(0.95, 0.96, 0.97),
  white:        rgb(1, 1, 1),
  black:        rgb(0.06, 0.08, 0.12),
};

// ── Constants ─────────────────────────────────────────────────────────────────
const W        = PageSizes.A4[0]; // 595.28
const H        = PageSizes.A4[1]; // 841.89
const MARGIN   = 48;
const CW       = W - 2 * MARGIN;  // content width
const HDR_H    = 54;               // header bar height
const FTR_H    = 38;               // footer clearance
const BODY_TOP = H - HDR_H - 20;  // first usable Y on content pages
const BODY_BOT = FTR_H + 14;      // last usable Y on content pages

// Truncate helper
const tr = (v, n) => { const s = String(v ?? ''); return s.length > n ? s.slice(0, n - 2) + '..' : s || '-'; };

// ── Report Generator ──────────────────────────────────────────────────────────
async function generateReport(applicationId) {
  const app = store.getApplicationById(applicationId);
  if (!app) throw new Error(`Application not found: ${applicationId}`);

  // Strictly filter documents and fields belonging to this single application
  const validAppIds = new Set([app.id, app.applicationId].filter(Boolean));
  const docs   = store.getDocuments(app.id).filter(d => validAppIds.has(d.applicationId));
  const fields = store.getFieldsByApplication(app.id).filter(f => validAppIds.has(f.applicationId));

  let validation = { totalFindings: 0, findings: [] };
  try { validation = validationService.validateApplication(app.id); } catch (_) {}

  const catObj = complianceRules.applicationCategories.find(c => c.id === app.category)
              || { name: app.category, requiredDocuments: [] };

  const checklist = (catObj.requiredDocuments || []).map(item => {
    const found = docs.find(d => d.documentType === item.type);
    return { ...item, isUploaded: !!found, documentName: found?.originalName || '-' };
  });

  const genTime = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  // ── Create PDF document ────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create();
  const fontR  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Page helpers ───────────────────────────────────────────────────────────
  function drawHeader(page) {
    const pgNum = pdfDoc.getPageCount();
    page.drawRectangle({ x: 0, y: H - HDR_H, width: W, height: HDR_H, color: C.primary });
    page.drawRectangle({ x: 0, y: H - HDR_H - 3, width: W, height: 3, color: C.gold });
    page.drawText('AICTE Application Verification Report', {
      x: MARGIN, y: H - 26, size: 11, font: fontB, color: C.white
    });
    page.drawText(`${tr(app.institutionName, 50)}  •  ${app.applicationId}`, {
      x: MARGIN, y: H - 42, size: 8, font: fontR, color: rgb(0.78, 0.84, 0.97)
    });
    page.drawText(`Page ${pgNum}`, {
      x: W - MARGIN - 36, y: H - 32, size: 8.5, font: fontB, color: C.white
    });
  }

  function drawFooter(page) {
    page.drawLine({
      start: { x: MARGIN, y: FTR_H }, end: { x: W - MARGIN, y: FTR_H },
      thickness: 0.5, color: C.slate400
    });
    page.drawText(
      `Generated: ${genTime}  •  AICTE Regulatory Compliance Verification System  •  Confidential`,
      { x: MARGIN, y: FTR_H - 14, size: 7, font: fontR, color: C.slate400 }
    );
  }

  function newContentPage() {
    const page = pdfDoc.addPage(PageSizes.A4);
    drawHeader(page);
    drawFooter(page);
    return { page, y: BODY_TOP };
  }

  function drawSectionTitle(page, y, title) {
    page.drawText(title, { x: MARGIN, y, size: 14, font: fontB, color: C.primary });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 1.5, color: C.primary });
    return y - 22;
  }

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  const cover = pdfDoc.addPage(PageSizes.A4);

  // Blue header banner
  cover.drawRectangle({ x: 0, y: H - 240, width: W, height: 240, color: C.primary });
  cover.drawRectangle({ x: 0, y: H - 244, width: W, height: 4,   color: C.gold });

  // Titles
  cover.drawText('AICTE Application',           { x: MARGIN, y: H - 88,  size: 26, font: fontB, color: C.white });
  cover.drawText('Verification Report',          { x: MARGIN, y: H - 122, size: 26, font: fontB, color: C.white });
  cover.drawText('AI-Powered Regulatory Compliance Verification System', {
    x: MARGIN, y: H - 153, size: 9.5, font: fontR, color: rgb(0.80, 0.86, 1.0)
  });

  // Status badge
  const statusColor = app.status === 'ACCEPTED' ? C.success
                    : app.status === 'REJECTED'  ? C.danger
                    : C.warning;
  cover.drawRectangle({ x: MARGIN, y: H - 218, width: 130, height: 24, color: statusColor });
  cover.drawText(app.status || 'SUBMITTED', {
    x: MARGIN + 10, y: H - 210, size: 9.5, font: fontB, color: C.white
  });

  // ── Details section ────────────────────────────────────────────────────────
  let cy = H - 285;

  function coverLabel(label, value) {
    cover.drawText(label, { x: MARGIN,       y: cy, size: 8.5, font: fontB, color: C.slate600 });
    cover.drawText(tr(value, 52), { x: MARGIN + 162, y: cy, size: 9,   font: fontR, color: C.black });
    cy -= 20;
  }

  cover.drawText('Application Details', { x: MARGIN, y: cy + 14, size: 12, font: fontB, color: C.black });
  cy -= 4;
  cover.drawLine({ start: { x: MARGIN, y: cy + 6 }, end: { x: W - MARGIN, y: cy + 6 }, thickness: 1, color: C.primary });
  cy -= 16;

  coverLabel('Application ID',        app.applicationId);
  coverLabel('Institution Name',      app.institutionName);
  coverLabel('Application Category',  catObj.name || app.category);
  coverLabel('Submission Date',       new Date(app.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' }));
  coverLabel('Representative',        app.representative?.name || '-');
  coverLabel('Designation',           app.representative?.designation || '-');
  coverLabel('Email',                 app.representative?.email || '-');
  coverLabel('Phone',                 app.representative?.phone || '-');
  coverLabel('Final Status',          app.status || 'SUBMITTED');
  if (app.reviewedAt) {
    coverLabel('Reviewed At', new Date(app.reviewedAt).toLocaleDateString('en-IN', { dateStyle: 'long' }));
  }

  // ── Summary stat boxes ─────────────────────────────────────────────────────
  cy -= 16;
  const boxW = (CW - 20) / 3;
  const stats = [
    { label: 'Documents Uploaded',  value: docs.length,                color: C.primary },
    { label: 'Fields Extracted',    value: fields.length,              color: C.success },
    { label: 'Validation Findings', value: validation.totalFindings,   color: validation.totalFindings > 0 ? C.danger : C.success },
  ];

  stats.forEach((s, i) => {
    const bx = MARGIN + i * (boxW + 10);
    cover.drawRectangle({ x: bx,   y: cy - 50, width: boxW, height: 58, color: C.slate100 });
    cover.drawRectangle({ x: bx,   y: cy + 8,  width: boxW, height: 4,  color: s.color });
    const numStr = String(s.value);
    cover.drawText(numStr, {
      x: bx + boxW / 2 - numStr.length * 7.5,
      y: cy - 15, size: 24, font: fontB, color: s.color
    });
    cover.drawText(s.label, { x: bx + 8, y: cy - 38, size: 7.5, font: fontR, color: C.slate600 });
  });

  // Cover footer
  cover.drawLine({
    start: { x: MARGIN, y: 40 }, end: { x: W - MARGIN, y: 40 },
    thickness: 0.5, color: C.slate400
  });
  cover.drawText(
    'AICTE • All India Council for Technical Education  •  Confidential  •  For Official Use Only',
    { x: MARGIN, y: 26, size: 7, font: fontR, color: C.slate400 }
  );

  // ── CHECKLIST PAGE(S) ──────────────────────────────────────────────────────
  let ctx = newContentPage();
  let { page } = ctx;
  let y = ctx.y;

  y = drawSectionTitle(page, y, 'Document Checklist Audit');

  // Column layout: [Document (175), File (135), Type (65), Status (rest)]
  const cl = [MARGIN, MARGIN + 180, MARGIN + 320, MARGIN + 388];

  // Table header row
  page.drawRectangle({ x: MARGIN, y: y - 6, width: CW, height: 22, color: C.primary });
  ['Required Document', 'Uploaded File', 'Type', 'Status'].forEach((h, i) => {
    page.drawText(h, { x: cl[i] + 5, y: y, size: 8, font: fontB, color: C.white });
  });
  y -= 26;

  checklist.forEach((item, idx) => {
    if (y < BODY_BOT + 18) {
      ctx  = newContentPage();
      page = ctx.page;
      y    = ctx.y;
    }
    const bg = idx % 2 === 0 ? C.white : C.slate100;
    page.drawRectangle({ x: MARGIN, y: y - 5, width: CW, height: 20, color: bg });

    page.drawText(tr(item.label, 28),                   { x: cl[0] + 5, y, size: 8,   font: fontB, color: C.black });
    page.drawText(tr(item.documentName, 26),             { x: cl[1] + 5, y, size: 7.5, font: fontR, color: C.slate600 });
    page.drawText(item.mandatory ? 'Mandatory' : 'Optional', { x: cl[2] + 5, y, size: 7.5, font: fontR, color: C.slate600 });

    const sText = item.isUploaded ? 'UPLOADED' : 'MISSING';
    const sCol  = item.isUploaded ? C.success  : (item.mandatory ? C.danger : C.warning);
    page.drawText(sText, { x: cl[3] + 5, y, size: 8, font: fontB, color: sCol });
    y -= 22;
  });

  // ── EXTRACTED FIELDS BY DOCUMENT PAGE(S) ──────────────────────────────────
  ctx  = newContentPage();
  page = ctx.page;
  y    = ctx.y;

  y = drawSectionTitle(page, y, 'Extracted Fields by Document');

  if (docs.length === 0) {
    page.drawRectangle({ x: MARGIN, y: y - 40, width: CW, height: 46, color: C.slate100 });
    page.drawText('No documents have been uploaded for this application yet.', {
      x: MARGIN + 14, y: y - 18, size: 9, font: fontB, color: C.slate600
    });
    page.drawText('Extracted fields will appear here once certificates are uploaded and processed through OCR.', {
      x: MARGIN + 14, y: y - 32, size: 8, font: fontR, color: C.slate600
    });
    y -= 54;
  } else {
    // Render extracted fields document-by-document
    docs.forEach((doc, docIndex) => {
      const docFields = fields.filter(f => f.documentId === doc.id);

      // Need enough space for document banner + table header + at least 1 row (~90pt)
      if (y < BODY_BOT + 90) {
        ctx  = newContentPage();
        page = ctx.page;
        y    = ctx.y;
      }

      // Document Section Banner Header
      const docLabel = doc.originalName || doc.fileName || `Document ${docIndex + 1}`;
      const docTypeFormatted = doc.documentType ? doc.documentType.replace(/_/g, ' ') : 'CERTIFICATE';

      page.drawRectangle({ x: MARGIN, y: y - 26, width: CW, height: 26, color: rgb(0.93, 0.95, 0.99) });
      page.drawRectangle({ x: MARGIN, y: y - 26, width: 4, height: 26, color: C.primary });

      page.drawText(`Document ${docIndex + 1}: ${tr(docLabel, 44)}`, {
        x: MARGIN + 12, y: y - 11, size: 9.5, font: fontB, color: C.primaryDark
      });
      page.drawText(`Type: ${docTypeFormatted}  •  File Size: ${Math.round((doc.fileSize || 0) / 1024)} KB  •  Fields Extracted: ${docFields.length}`, {
        x: MARGIN + 12, y: y - 22, size: 7.5, font: fontR, color: C.slate600
      });
      y -= 42; // increased gap to prevent overlap between banner and table header

      // Table Header for this Document
      const fl = [MARGIN, MARGIN + 140, MARGIN + 300, MARGIN + 372];
      page.drawRectangle({ x: MARGIN, y: y - 6, width: CW, height: 20, color: C.primary });
      ['Field Name', 'Extracted Value', 'Confidence', 'Status'].forEach((h, i) => {
        page.drawText(h, { x: fl[i] + 5, y: y, size: 8, font: fontB, color: C.white });
      });
      y -= 24;

      if (docFields.length === 0) {
        page.drawRectangle({ x: MARGIN, y: y - 4, width: CW, height: 18, color: C.slate100 });
        page.drawText('No structured fields extracted from this document.', {
          x: MARGIN + 8, y, size: 7.5, font: fontR, color: C.slate400
        });
        y -= 24;
      } else {
        docFields.forEach((f, idx) => {
          if (y < BODY_BOT + 18) {
            ctx  = newContentPage();
            page = ctx.page;
            y    = ctx.y;

            // Re-render table header on page break
            page.drawRectangle({ x: MARGIN, y: y - 6, width: CW, height: 20, color: C.primary });
            ['Field Name', 'Extracted Value', 'Confidence', 'Status'].forEach((h, i) => {
              page.drawText(h, { x: fl[i] + 5, y: y, size: 8, font: fontB, color: C.white });
            });
            y -= 24;
          }

          const bg = idx % 2 === 0 ? C.white : C.slate100;
          page.drawRectangle({ x: MARGIN, y: y - 5, width: CW, height: 19, color: bg });

          page.drawText(tr(f.label || f.fieldName, 22), { x: fl[0] + 5, y, size: 8,   font: fontB, color: C.black });
          page.drawText(tr(f.extractedValue, 25),        { x: fl[1] + 5, y, size: 7.5, font: fontR, color: C.slate600 });

          const conf    = Math.round((f.confidence ?? 0.8) * 100);
          const confCol = conf >= 85 ? C.success : conf >= 65 ? C.warning : C.danger;
          page.drawText(`${conf}%`, { x: fl[2] + 5, y, size: 8, font: fontB, color: confCol });

          const vText = f.isVerified ? 'Verified' : 'Automated';
          page.drawText(vText, { x: fl[3] + 5, y, size: 7.5, font: fontR, color: f.isVerified ? C.success : C.slate600 });
          y -= 20;
        });
      }

      // Spacing between document tables
      y -= 14;
    });
  }

  // ── VALIDATION FINDINGS PAGE ───────────────────────────────────────────────
  ctx  = newContentPage();
  page = ctx.page;
  y    = ctx.y;

  y = drawSectionTitle(page, y, 'Validation Findings');

  if (!validation.totalFindings) {
    page.drawRectangle({ x: MARGIN, y: y - 44, width: CW, height: 52, color: C.slate100 });
    page.drawText('✓  No validation findings detected. All automated checks passed.', {
      x: MARGIN + 16, y: y - 18, size: 10, font: fontB, color: C.success
    });
  } else {
    page.drawText(`${validation.totalFindings} finding(s) flagged during automated review:`, {
      x: MARGIN, y, size: 9, font: fontR, color: C.slate600
    });
    y -= 24;

    validation.findings.forEach(f => {
      const cardH  = 66;
      const isErr  = f.severity === 'ERROR';
      const bgCol  = isErr ? C.dangerBg  : C.warningBg;
      const bdCol  = isErr ? C.danger    : C.warning;
      const ttlCol = isErr ? C.danger    : C.warning;

      if (y < BODY_BOT + cardH + 8) {
        ctx  = newContentPage();
        page = ctx.page;
        y    = ctx.y;
      }

      page.drawRectangle({ x: MARGIN,      y: y - cardH + 10, width: CW,  height: cardH, color: bgCol });
      page.drawRectangle({ x: MARGIN,      y: y - cardH + 10, width: 4,   height: cardH, color: bdCol });

      page.drawText(`[${f.severity}]  ${tr(f.title, 62)}`, {
        x: MARGIN + 14, y: y - 2, size: 9, font: fontB, color: ttlCol
      });
      page.drawText(`Check Type: ${f.checkType || 'N/A'}`, {
        x: MARGIN + 14, y: y - 16, size: 7.5, font: fontR, color: C.slate600
      });

      // Description: up to two lines of 92 chars each
      const desc = String(f.description || '');
      const l1   = tr(desc, 92);
      page.drawText(l1, { x: MARGIN + 14, y: y - 30, size: 7.5, font: fontR, color: C.black });
      if (desc.length > 92) {
        page.drawText(tr(desc.slice(90), 92), { x: MARGIN + 14, y: y - 42, size: 7.5, font: fontR, color: C.black });
      }

      y -= cardH + 12;
    });
  }

  // ── Finalise ───────────────────────────────────────────────────────────────
  return await pdfDoc.save();
}

module.exports = { generateReport };
