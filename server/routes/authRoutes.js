const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { createToken } = require('../middleware/auth');
const { verifyEmailRealLife } = require('../services/emailValidator');

// Slow down password guessing: 10 failed logins per username per 15 minutes
const failedLogins = new Map();
function tooManyFailures(key) {
  const rec = failedLogins.get(key);
  return rec && rec.until > Date.now() && rec.count >= 10;
}
function noteFailure(key) {
  const rec = failedLogins.get(key);
  if (!rec || rec.until < Date.now()) failedLogins.set(key, { count: 1, until: Date.now() + 15 * 60 * 1000 });
  else rec.count++;
}

/**
 * GET /api/auth/check-email?email=...&role=...
 * Validates email format, checks real-world MX records, and verifies registration.
 */
router.get('/check-email', async (req, res) => {
  try {
    const { email, role } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Verify real-life validity & live MX mail servers
    const realCheck = await verifyEmailRealLife(cleanEmail);
    if (!realCheck.valid) {
      return res.json({
        success: true,
        isValidFormat: false,
        realLifeValid: false,
        exists: false,
        message: realCheck.reason
      });
    }

    // 2. Check if registered in AegisDocs database
    const check = store.checkEmailExists(role || 'institution', cleanEmail);
    return res.json({
      success: true,
      isValidFormat: true,
      realLifeValid: true,
      exists: check.exists,
      institutionName: check.institutionName,
      message: check.exists
        ? `Verified: Existing registered account found.`
        : `Email domain is active in real life, but not registered in AegisDocs.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/login
 * Body: { role: 'institution' | 'authority', username (or email), password }
 */
router.post('/login', async (req, res) => {
  try {
    const { role, username, email, password } = req.body;
    const loginIdentifier = (username || email || '').trim();

    if (!role || !['institution', 'authority'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Valid role (institution or authority) is required.' });
    }
    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Email or username and password are required.' });
    }

    // If an email address was entered, verify real-life domain validity
    if (loginIdentifier.includes('@')) {
      const realCheck = await verifyEmailRealLife(loginIdentifier);
      if (!realCheck.valid) {
        return res.status(400).json({ success: false, message: realCheck.reason });
      }
    }

    const limitKey = `${role}:${loginIdentifier.toLowerCase()}`;
    if (tooManyFailures(limitKey)) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    const result = store.authenticateUser(role, loginIdentifier, password);
    if (!result.success) {
      noteFailure(limitKey);
      return res.status(401).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: { ...result.user, token: createToken(result.user) }
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
});

/**
 * POST /api/auth/register
 * Body: { role: 'institution' | 'authority', username, email, password, institutionName }
 */
router.post('/register', async (req, res) => {
  try {
    const { role, username, email, password, institutionName } = req.body;

    if (!role || !['institution', 'authority'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Valid role (institution or authority) is required.' });
    }
    if (role === 'authority') {
      return res.status(403).json({ success: false, message: 'Authority accounts cannot be self-registered. Use the authority login provided by your administrator (demo: username "authority").' });
    }
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    // Verify email is a real-life valid email address with active mail servers
    const realCheck = await verifyEmailRealLife(email);
    if (!realCheck.valid) {
      return res.status(400).json({ success: false, message: realCheck.reason });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (role === 'institution' && (!institutionName || institutionName.trim().length < 2)) {
      return res.status(400).json({ success: false, message: 'Institution name is required for institution accounts.' });
    }

    const user = store.registerUser({
      role,
      username,
      email,
      password,
      institutionName
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      user: { ...user, token: createToken(user) }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Registration failed.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Two steps with the same URL:
 *   1. Body { role, username, email }                    -> a 6-digit code is made and printed in the
 *                                                           SERVER console (stand-in for an email).
 *   2. Body { role, username, email, code, newPassword } -> password is changed if the code is right.
 * The answer to step 1 is the same whether or not the account exists, so
 * nobody can use it to find out which usernames are real.
 */
router.post('/forgot-password', (req, res) => {
  try {
    const { role, username, email, code, newPassword } = req.body;

    if (!role || !['institution', 'authority'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Valid role (institution or authority) is required.' });
    }
    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Username and registered email are required.' });
    }

    if (!code) {
      const made = store.createResetCode(role, username, email);
      if (made) console.log(`[password reset] code for ${role} "${username}": ${made}  (valid 15 minutes)`);
      return res.json({
        success: true,
        codeRequired: true,
        message: 'If the account exists, a reset code was created. In this demo build the code is printed in the server window.'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const user = store.resetPassword(role, username, email, code, newPassword);
    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
      user
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Password reset failed.' });
  }
});

module.exports = router;
