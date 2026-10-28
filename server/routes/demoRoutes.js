/**
 * Demo & Testing Routes (Section 6 & Section 10)
 */

const express = require('express');
const router = express.Router();
const sampleDataService = require('../services/sampleDataService');
const store = require('../db/store');
const { requireAuth, requireRole } = require('../middleware/auth');

// One-Click Demo Seeder
router.post('/seed', requireAuth, async (req, res) => {
  try {
    const result = await sampleDataService.seedDemoScenario();
    // The demo application belongs to whoever clicked the button
    const seeded = store.getApplicationById(result.application.id || result.application.applicationId);
    if (seeded) result.application = store.saveApplication({ ...seeded, submittedBy: req.user.id });
    res.json({
      success: true,
      message: 'Demo scenario seeded successfully (Example Engineering College).',
      data: result
    });
  } catch (err) {
    console.error('Demo seed error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reset demo database
// Deletes ALL applications, documents and fields (accounts are kept). Authority only.
router.post('/reset', requireRole('authority'), (req, res) => {
  try {
    store.clearAll();
    res.json({
      success: true,
      message: 'Database reset successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
