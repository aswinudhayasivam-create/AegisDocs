/**
 * Member 5 role: end-to-end checks through the real HTTP API.
 * Covers security fixes (login required, roles, ownership, password reset code)
 * and the full flow with the fictional sample PDFs.
 *
 * NOTE: these are checks on a tiny synthetic set. They are NOT an accuracy
 * measurement of the system on real documents.
 */
require('./_env');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../index');

const SAMPLES = path.join(__dirname, '..', '..', 'demo-data', 'sample-documents');
let base;
let passed = 0;

async function call(method, url, { token, body, form, headers = {} } = {}) {
  const opts = { method, headers: { ...headers } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (form) opts.body = form;
  const res = await fetch(base + url, opts);
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

async function test(name, fn) {
  await fn();
  passed++;
  console.log('  ✔', name);
}

async function login(role, username, password = 'password123') {
  const r = await call('POST', '/api/auth/login', { body: { role, username, password } });
  assert.strictEqual(r.status, 200, `login ${username}`);
  return r.data.user;
}

function uploadForm(applicationId, documentType, file) {
  const form = new FormData();
  form.append('applicationId', applicationId);
  form.append('documentType', documentType);
  form.append('document', new Blob([fs.readFileSync(path.join(SAMPLES, file))], { type: 'application/pdf' }), file);
  return form;
}

(async () => {
  const server = http.createServer(app).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  console.log('API tests (security + full flow)');

  try {
    const inst = await login('institution', 'institution');
    const auth = await login('authority', 'authority');

    await test('health check is public', async () => {
      assert.strictEqual((await call('GET', '/api/health')).status, 200);
    });

    await test('no login: applications, documents, report, demo seed are refused (401)', async () => {
      for (const [m, u] of [['GET', '/api/applications'], ['GET', '/api/applications/x'], ['PATCH', '/api/applications/x/status'],
        ['GET', '/api/applications/x/report'], ['GET', '/api/documents/x'], ['DELETE', '/api/documents/x'],
        ['POST', '/api/documents/upload'], ['POST', '/api/demo/seed'], ['POST', '/api/demo/reset']]) {
        const r = await call(m, u, { body: m === 'PATCH' ? { status: 'ACCEPTED' } : undefined });
        assert.strictEqual(r.status, 401, `${m} ${u} gave ${r.status}`);
      }
    });

    await test('forged or edited token is refused', async () => {
      const bad = inst.token.slice(0, -3) + 'abc';
      assert.strictEqual((await call('GET', '/api/applications', { token: bad })).status, 401);
      assert.strictEqual((await call('GET', '/api/applications', { token: 'a.b' })).status, 401);
    });

    let appA;
    await test('institution creates an application', async () => {
      const r = await call('POST', '/api/applications', { token: inst.token, body: {
        institutionName: 'ABC Engineering College', applicationId: 'APP-T-1', category: 'SIH_DEMO', institutionId: 'INST001' } });
      assert.strictEqual(r.status, 201);
      appA = r.data.application;
      assert.strictEqual(appA.submittedBy, inst.id);
    });

    await test('duplicate application ID is refused (409)', async () => {
      const r = await call('POST', '/api/applications', { token: inst.token, body: { institutionName: 'X College', applicationId: 'APP-T-1' } });
      assert.strictEqual(r.status, 409);
    });

    await test('institution cannot accept its own application (403); authority can', async () => {
      const no = await call('PATCH', `/api/applications/${appA.id}/status`, { token: inst.token, body: { status: 'ACCEPTED' } });
      assert.strictEqual(no.status, 403);
      const yes = await call('PATCH', `/api/applications/${appA.id}/status`, { token: auth.token, body: { status: 'UNDER_REVIEW' } });
      assert.strictEqual(yes.status, 200);
    });

    await test('another institution cannot see or change the application', async () => {
      const other = await call('POST', '/api/auth/register', { body: { role: 'institution', username: 'other_college', email: 'o@example.edu', password: 'secret123', institutionName: 'Other College' } });
      assert.strictEqual(other.status, 201);
      const t = other.data.user.token;
      assert.strictEqual((await call('GET', `/api/applications/${appA.id}`, { token: t })).status, 404);
      assert.strictEqual((await call('GET', `/api/applications/${appA.id}/validation`, { token: t })).status, 404);
      assert.strictEqual((await call('GET', `/api/applications/${appA.id}/report`, { token: t })).status, 404);
      const list = await call('GET', '/api/applications', { token: t });
      assert.strictEqual(list.data.count, 0);
      const up = await call('POST', '/api/documents/upload', { token: t, form: uploadForm(appA.id, 'FACULTY_RECORD', '02_faculty_qualification_record.pdf') });
      assert.strictEqual(up.status, 404);
    });

    let docOk;
    await test('upload faculty record PDF: Faculty ID and Name are extracted', async () => {
      const r = await call('POST', '/api/documents/upload', { token: inst.token, form: uploadForm(appA.id, 'FACULTY_RECORD', '02_faculty_qualification_record.pdf') });
      assert.strictEqual(r.status, 201, JSON.stringify(r.data));
      docOk = r.data.document;
      const f = Object.fromEntries(r.data.fields.map(x => [x.fieldName, x.extractedValue]));
      assert.strictEqual(f.facultyId, 'FAC001');
      assert.strictEqual(f.facultyName, 'Arun Kumar');
      assert.strictEqual(f.certificateNumber, 'CERT001');
    });

    await test('validation: faculty rules pass, missing approval letter is flagged', async () => {
      const r = await call('GET', `/api/applications/${appA.id}/validation`, { token: inst.token });
      const titles = r.data.validation.findings.map(f => f.title);
      assert.ok(titles.some(t => t.startsWith('Missing Mandatory Document')), 'missing doc flagged');
      assert.ok(!titles.some(t => t.startsWith('R004') || t.startsWith('R005')), 'faculty rules should pass');
      assert.ok(r.data.validation.rules.checked > 0);
    });

    await test('faculty record without an ID fails rule R004', async () => {
      const mk = await call('POST', '/api/applications', { token: inst.token, body: { institutionName: 'ABC Engineering College', applicationId: 'APP-T-2', category: 'SIH_DEMO', institutionId: 'INST001' } });
      await call('POST', '/api/documents/upload', { token: inst.token, form: uploadForm('APP-T-2', 'FACULTY_RECORD', '03_faculty_record_missing_id.pdf') });
      const v = await call('GET', `/api/applications/${mk.data.application.id}/validation`, { token: inst.token });
      assert.ok(v.data.validation.findings.some(f => f.title.startsWith('R004')), 'R004 expected');
    });

    await test('scan-style PNG image: OCR reads institution, certificate number and dates', async () => {
      const form = new FormData();
      form.append('applicationId', appA.id);
      form.append('documentType', 'FIRE_SAFETY_NOC');
      form.append('document', new Blob([fs.readFileSync(path.join(SAMPLES, '04_fire_safety_scan_image.png'))], { type: 'image/png' }), '04_fire_safety_scan_image.png');
      const r = await call('POST', '/api/documents/upload', { token: inst.token, form });
      assert.strictEqual(r.status, 201, JSON.stringify(r.data));
      assert.strictEqual(r.data.extractionSummary.isDigitalPdf, false);
      const f = Object.fromEntries(r.data.fields.map(x => [x.fieldName, x.extractedValue]));
      assert.ok(/ABC Engineering College/i.test(f.institutionName), 'institution: ' + f.institutionName);
      assert.ok(/FS\/2026\/0042/.test(f.certificateNumber || ''), 'cert no: ' + f.certificateNumber);
      assert.strictEqual(f.issueDate, '2026-06-01');
      assert.strictEqual(f.expiryDate, '2027-05-31');
    });

    await test('only authority may correct extracted fields (institution gets 403)', async () => {
      const doc = await call('GET', `/api/documents/${docOk.id}`, { token: auth.token });
      const original = doc.data.fields.find(x => x.fieldName === 'certificateNumber').extractedValue;
      const no = await call('PUT', `/api/documents/${docOk.id}/fields`, { token: inst.token, body: { fieldName: 'certificateNumber', newValue: 'TAMPERED' } });
      assert.strictEqual(no.status, 403);
      const yes = await call('PUT', `/api/documents/${docOk.id}/fields`, { token: auth.token, body: { fieldName: 'certificateNumber', newValue: original } });
      assert.strictEqual(yes.status, 200);
      const after = await call('GET', `/api/documents/${docOk.id}`, { token: auth.token });
      assert.strictEqual(after.data.fields.find(x => x.fieldName === 'certificateNumber').extractedValue, 'CERT001');
    });

    await test('unsupported file type is refused with 400 and leaves no file behind', async () => {
      const before = fs.readdirSync(process.env.UPLOADS_DIR).length;
      const form = new FormData();
      form.append('applicationId', appA.id);
      form.append('documentType', 'UNCLASSIFIED');
      form.append('document', new Blob([Buffer.from('MZ not a document')], { type: 'application/x-msdownload' }), 'fake.exe');
      const r = await call('POST', '/api/documents/upload', { token: inst.token, form });
      assert.strictEqual(r.status, 400);
      assert.ok(/Unsupported file type/.test(r.data.message));
      assert.strictEqual(fs.readdirSync(process.env.UPLOADS_DIR).length, before, 'no orphan file left in uploads');
    });

    await test('authority accounts cannot be self-registered; seeded authority still logs in', async () => {
      const r = await call('POST', '/api/auth/register', { body: { role: 'authority', username: 'rogue_auth2', email: 'r2@x.example', password: 'secret123' } });
      assert.strictEqual(r.status, 403);
      const li = await call('POST', '/api/auth/login', { body: { role: 'authority', username: 'rogue_auth2', password: 'secret123' } });
      assert.strictEqual(li.status, 401, 'the refused account must not exist');
      const ok = await call('POST', '/api/auth/login', { body: { role: 'authority', username: 'authority', password: 'password123' } });
      assert.strictEqual(ok.status, 200, 'seeded authority login must keep working');
    });

    await test('registration rejects role variants and bad input (400)', async () => {
      for (const role of ['Authority', 'AUTHORITY', 'admin', ' institution', 'institution ']) {
        const r = await call('POST', '/api/auth/register', { body: { role, username: 'variantx', email: 'v@x.example', password: 'secret123', institutionName: 'X College' } });
        assert.strictEqual(r.status, 400, `role=${JSON.stringify(role)} gave ${r.status}`);
      }
      const noEmail = await call('POST', '/api/auth/register', { body: { role: 'institution', username: 'okuser', password: 'secret123', institutionName: 'X College' } });
      assert.strictEqual(noEmail.status, 400);
      const shortPw = await call('POST', '/api/auth/register', { body: { role: 'institution', username: 'okuser', email: 'ok@x.example', password: '123', institutionName: 'X College' } });
      assert.strictEqual(shortPw.status, 400);
      const inst = await call('POST', '/api/auth/register', { body: { role: 'institution', username: 'new_college', email: 'n@x.example', password: 'secret123', institutionName: 'New College' } });
      assert.strictEqual(inst.status, 201, 'normal institution signup must keep working');
    });

    await test('field corrections keep an audit history (who, when, old value)', async () => {
      let r = await call('PUT', `/api/documents/${docOk.id}/fields`, { token: auth.token, body: { fieldName: 'certificateNumber', newValue: 'CERT001-REV1' } });
      assert.strictEqual(r.status, 200);
      r = await call('PUT', `/api/documents/${docOk.id}/fields`, { token: auth.token, body: { fieldName: 'certificateNumber', newValue: 'CERT001' } });
      assert.strictEqual(r.status, 200);
      const doc = await call('GET', `/api/documents/${docOk.id}`, { token: auth.token });
      const f = doc.data.fields.find(x => x.fieldName === 'certificateNumber');
      assert.strictEqual(f.extractedValue, 'CERT001');
      assert.ok(Array.isArray(f.history) && f.history.length >= 2, 'history kept on the field record');
      const h = f.history;
      assert.strictEqual(h[h.length - 2].newValue, 'CERT001-REV1');
      assert.strictEqual(h[h.length - 2].previousValue, 'CERT001');
      assert.strictEqual(h[h.length - 1].newValue, 'CERT001');
      assert.strictEqual(h[h.length - 1].previousValue, 'CERT001-REV1');
      assert.ok(h[h.length - 1].editedBy && h[h.length - 1].editedBy.role === 'authority', 'editor identity recorded');
    });

    await test('a file over the 25MB limit is refused with a clear 400', async () => {
      const form = new FormData();
      form.append('applicationId', appA.id);
      form.append('documentType', 'UNCLASSIFIED');
      form.append('document', new Blob([Buffer.alloc(26 * 1024 * 1024, 1)], { type: 'application/pdf' }), 'big.pdf');
      const r = await call('POST', '/api/documents/upload', { token: inst.token, form });
      assert.strictEqual(r.status, 400);
      assert.ok(/25 ?MB/.test(r.data.message), r.data.message);
    });

    await test('owner can open the file; unauthenticated cannot', async () => {
      assert.strictEqual((await call('GET', `/api/documents/${docOk.id}/file`, { token: inst.token })).status, 200);
      assert.strictEqual((await call('GET', `/api/documents/${docOk.id}/file`)).status, 401);
    });

    await test('uploaded files are not served as public static files', async () => {
      const r = await call('GET', `/uploads/${path.basename(docOk.filePath)}`);
      assert.notStrictEqual(r.status, 200);
    });

    await test('report is a real PDF for the owner', async () => {
      const r = await call('GET', `/api/applications/${appA.id}/report`, { token: inst.token });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.data.slice(0, 4).toString(), '%PDF');
    });

    await test('import Member 4 data: valid passes, blank name fails R002', async () => {
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'demo-data', 'application_data.json'), 'utf-8'));
      const ok = await call('POST', '/api/applications/import', { token: inst.token, body: data });
      assert.strictEqual(ok.status, 201);
      const v1 = await call('GET', `/api/applications/${ok.data.application.id}/validation`, { token: inst.token });
      assert.strictEqual(v1.data.validation.rules.failed, 0);
      const bad = { ...data, application_id: 'APP002', institution: { ...data.institution, institution_name: '' } };
      const r2 = await call('POST', '/api/applications/import', { token: inst.token, body: bad });
      const v2 = await call('GET', `/api/applications/${r2.data.application.id}/validation`, { token: inst.token });
      assert.ok(v2.data.validation.findings.some(f => f.title.startsWith('R002')));
    });

    await test('demo seed works for a logged-in user and the demo flags the planned problems', async () => {
      const r = await call('POST', '/api/demo/seed', { token: inst.token });
      assert.strictEqual(r.status, 200, JSON.stringify(r.data));
      const v = await call('GET', '/api/applications/APP-2026-DEMO-01/validation', { token: inst.token });
      const types = v.data.validation.findings.map(f => f.checkType);
      assert.ok(types.includes('CONSISTENCY_CHECK') && types.includes('DATE_VALIDITY_CHECK'));
    });

    await test('only authority can reset the demo database; accounts survive', async () => {
      assert.strictEqual((await call('POST', '/api/demo/reset', { token: inst.token })).status, 403);
      assert.strictEqual((await call('POST', '/api/demo/reset', { token: auth.token })).status, 200);
      await login('institution', 'institution');
    });

    await test('password reset needs the emailed code (username + email alone is not enough)', async () => {
      const old = console.log; let code = null;
      console.log = (...a) => { const m = String(a[0]).match(/code for .*: (\d{6})/); if (m) code = m[1]; };
      const step1 = await call('POST', '/api/auth/forgot-password', { body: { role: 'institution', username: 'institution', email: 'institution@example.edu.in' } });
      console.log = old;
      assert.strictEqual(step1.data.codeRequired, true);
      assert.ok(!JSON.stringify(step1.data).includes(code), 'code must not be in the response');
      const noCode = await call('POST', '/api/auth/forgot-password', { body: { role: 'institution', username: 'institution', email: 'institution@example.edu.in', code: '000000', newPassword: 'hacked123' } });
      assert.strictEqual(noCode.status, 400);
      const good = await call('POST', '/api/auth/forgot-password', { body: { role: 'institution', username: 'institution', email: 'institution@example.edu.in', code, newPassword: 'newpass123' } });
      assert.strictEqual(good.status, 200);
      await login('institution', 'institution', 'newpass123');
      const reuse = await call('POST', '/api/auth/forgot-password', { body: { role: 'institution', username: 'institution', email: 'institution@example.edu.in', code, newPassword: 'again12345' } });
      assert.strictEqual(reuse.status, 400, 'code is one-use');
    });

    await test('reset answer is the same for an unknown account', async () => {
      const r = await call('POST', '/api/auth/forgot-password', { body: { role: 'institution', username: 'nobody', email: 'nobody@example.edu' } });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.data.codeRequired, true);
    });

    await test('CORS: unknown website origin gets no permission header', async () => {
      const r = await call('GET', '/api/health', { headers: { Origin: 'http://evil.example' } });
      assert.ok(!r.headers.get('access-control-allow-origin'));
    });

    await test('password hashes use 210000 rounds', async () => {
      const db = JSON.parse(fs.readFileSync(process.env.DB_FILE, 'utf-8'));
      assert.ok(db.users.every(u => u.iterations === 210000), 'all users upgraded or new');
    });

    console.log(`\n${passed} API tests passed.`);
  } catch (err) {
    console.error('❌ API test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
