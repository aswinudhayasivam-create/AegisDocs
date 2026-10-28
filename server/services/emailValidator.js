/**
 * Real-Life Email & Domain MX Verification Service
 * Validates email structure and verifies that the domain has live MX (mail server) records via DNS.
 */

const dns = require('dns').promises;

const DEMO_DOMAINS = new Set([
  'example.edu.in',
  'example.com',
  'aicte.gov.in',
  'aicte-india.org',
  'localhost'
]);

async function verifyEmailRealLife(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email address is required.' };
  }

  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, reason: 'Invalid email address format (e.g. name@institution.edu.in).' };
  }

  const parts = clean.split('@');
  const domain = parts[1];

  // Allow internal demo domains so pre-seeded demo users function reliably
  if (DEMO_DOMAINS.has(domain) || domain.endsWith('.example')) {
    return { valid: true, domain, isDemo: true };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { 
        valid: false, 
        domain, 
        reason: `The domain "${domain}" does not have active mail servers (MX records) configured in real life.` 
      };
    }
    return { valid: true, domain, mxCount: mxRecords.length };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'ESERVFAIL') {
      return { 
        valid: false, 
        domain, 
        reason: `The domain "${domain}" does not exist in real life on the internet.` 
      };
    }
    // Fallback: check if domain has an A record (some domains handle mail on root IP)
    try {
      await dns.resolve(domain);
      return { valid: true, domain, fallbackA: true };
    } catch (_) {
      return { 
        valid: false, 
        domain, 
        reason: `The domain "${domain}" cannot be resolved on the internet.` 
      };
    }
  }
}

module.exports = { verifyEmailRealLife };
