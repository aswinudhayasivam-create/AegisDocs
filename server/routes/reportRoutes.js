/**
 * Report Routes
 * GET /api/applications/:id/report  — stream a generated PDF report
 */

const express = require('express');
const router  = express.Router();
const { generateReport } = require('../services/reportService');
const store = require('../db/store');
const { requireAuth, canAccessApplication } = require('../middleware/auth');

router.get('/:id/report', requireAuth, async (req, res) => {
  try {
    const found = store.getApplicationById(req.params.id);
    if (!found || !canAccessApplication(req.user, found)) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    const pdfBytes = await generateReport(req.params.id);
    const filename = `verification_report_${req.params.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('[reportRoutes] PDF generation error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
