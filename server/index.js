/**
 * AI-Powered Application Validation Server
 * MERN Backend — OCR, Field Extraction, Validation & Compliance
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const applicationRoutes = require('./routes/applicationRoutes');
const documentRoutes    = require('./routes/documentRoutes');
const demoRoutes        = require('./routes/demoRoutes');
const reportRoutes      = require('./routes/reportRoutes');
const authRoutes        = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for React frontend
// Only the local React app may call the API from a browser (override with CORS_ORIGINS="http://a,http://b")
const allowedOrigins = (process.env.CORS_ORIGINS ||
  `http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:${PORT},http://127.0.0.1:${PORT}`).split(',');
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded documents are NOT served as public files any more.
// They are only available through GET /api/documents/:id/file, which checks the login.

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/applications', reportRoutes);   // PDF report: GET /api/applications/:id/report
app.use('/api/documents', documentRoutes);
app.use('/api/demo', demoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'AI-Powered Application Validation Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Upload errors from multer (for example a file over the 25 MB limit) arrive here:
// answer with a clear 400 JSON instead of Express's default 500 HTML page.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File exceeds the maximum allowed size of 25MB.'
      : `Upload failed: ${err.message}`;
    return res.status(400).json({ success: false, message });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Serve production React client build if present
const fs = require('fs');
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server (only when run directly, so the tests can load the app without listening)
if (require.main === module) app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Validation Backend Engine running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

module.exports = app;
