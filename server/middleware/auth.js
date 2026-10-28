/**
 * Login tokens (Member 6 fix: the original prototype had no authorization at all).
 *
 * A token is "payload.signature". The payload holds the user id, role and an
 * expiry time. The signature is an HMAC made with a secret that only the server
 * knows, so nobody can edit a token or invent one.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_HOURS = 12;

function loadSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const file = path.join(path.dirname(process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json')), '.auth_secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf-8').trim();
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, secret, 'utf-8');
  return secret;
}

const SECRET = loadSecret();

function sign(text) {
  return crypto.createHmac('sha256', SECRET).update(text).digest('base64url');
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    role: user.role,
    exp: Date.now() + TOKEN_HOURS * 3600 * 1000
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  const a = Buffer.from(signature || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (_) {
    return null;
  }
}

/** Must be logged in. Sets req.user = { id, role }. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = readToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  req.user = user;
  next();
}

/** Must be logged in with one of the given roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'You are not allowed to do this.' });
      }
      next();
    });
  };
}

/** Authority sees everything. An institution sees only what it submitted. */
function canAccessApplication(user, app) {
  if (!app) return false;
  if (user.role === 'authority') return true;
  return app.submittedBy === user.id;
}

module.exports = { createToken, readToken, requireAuth, requireRole, canAccessApplication };
