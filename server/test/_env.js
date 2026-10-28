// Every test file loads this FIRST. It points the app at a throwaway database and
// upload folder in the system temp folder, so tests never touch real data.
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sih-test-'));
process.env.DB_FILE = path.join(dir, 'db.json');
process.env.UPLOADS_DIR = path.join(dir, 'uploads');
process.env.AUTH_SECRET = 'test-secret-not-for-real-use';
module.exports = { dir };
