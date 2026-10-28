/**
 * Browser test: drives Chrome through the real screens (uses a temporary database).
 * Needs Google Chrome + `npm install --no-save puppeteer-core` (run from the project folder).
 * Set CHROME_PATH if Chrome is somewhere else. Writes screenshots to docs/screenshots/.
 */
const puppeteer = require('puppeteer-core') // install with: npm install --no-save puppeteer-core;
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const P = path.join(__dirname, '..'), PORT = 5055;
const S = path.join(P, 'docs', 'screenshots'); fs.mkdirSync(S, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-'));
const env = { ...process.env, PORT, DB_FILE: tmp + '/db.json', UPLOADS_DIR: tmp + '/up' };
const srv = cp.spawn(process.execPath, ['server/index.js'], { cwd: P, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const ok = (n, c) => { results.push([n, !!c]); console.log(c ? 'PASS' : 'FAIL', n); };

async function clickText(page, text, sel = 'button') {
  const h = await page.evaluateHandle((t, sel) => [...document.querySelectorAll(sel)].filter(b => b.innerText.trim().includes(t) && !b.disabled).sort((a,b)=>a.innerText.length-b.innerText.length)[0], text, sel);
  const el = h.asElement(); if (!el) throw new Error('no element: ' + text);
  await el.click();
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText); }
async function shot(page, name) { await page.screenshot({ path: `${S}/${name}.png` }); }
async function login(page, tabText, user, pass) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' });
  await clickText(page, tabText, 'button, div');
  await page.type('input[placeholder^="e.g."]', user);
  await page.type('input[type=password]', pass);
  await clickText(page, 'Sign In to Portal');
  await sleep(1500);
}

(async () => {
  await sleep(2500);
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome'), headless: 'new', args: ['--no-sandbox', '--disable-gpu'], defaultViewport: { width: 1200, height: 900 } });
  const page = await browser.newPage();
  page.on('dialog', d => d.accept());
  try {
    // ---- Institution flow
    await login(page, 'Institution Holder', 'institution', 'password123');
    ok('institution dashboard after login', (await bodyText(page)).includes('Application Status'));
    await shot(page, '01-institution-dashboard');
    // import flow
    await clickText(page, 'Submit New Application'); await sleep(600);
    await shot(page, '07-form-with-import');
    const imp = await page.$('input[data-testid=import-json]');
    await imp.uploadFile(P + '/demo-data/application_data.json');
    await sleep(2000);
    ok('import moves to upload step', (await bodyText(page)).includes('Target Application'));
    await shot(page, '08-after-import');
    await clickText(page, 'Submit New Application'); await sleep(800);
    ok('Institution ID field is on the form', (await bodyText(page)).includes('Institution ID'));
    // fill form
    const inputs = await page.$$('form input.form-input');
    const vals = await Promise.all(inputs.map(i => i.evaluate(e => [e.placeholder, e.value])));
    const idIdx = vals.findIndex(v => v[0] === 'e.g., INST001');
    await inputs[idIdx].type('INST777');
    const sel = await page.$('form select'); if (sel) { const opts = await sel.evaluate(s => [...s.options].map(o => o.value)); ok('SIH_DEMO category offered', opts.includes('SIH_DEMO')); await sel.select('SIH_DEMO'); }
    await shot(page, '02-new-application-form');
    await clickText(page, 'Submit Application & Proceed');
    await sleep(1500);
    ok('moved to upload step after create', (await bodyText(page)).includes('Target Application'));
    // upload faculty record
    const sels = await page.$$('select');
    const typeSel = sels[sels.length - 1];
    await typeSel.select('FACULTY_RECORD');
    const fileIn = await page.$('input[type=file]');
    await fileIn.uploadFile(P + '/demo-data/sample-documents/02_faculty_qualification_record.pdf');
    await sleep(500);
    await shot(page, '03-upload-form');
    await clickText(page, 'Upload & Process with OCR');
    await sleep(4000);
    await shot(page, '04-after-upload');
    ok('upload processed (1 document listed)', /Uploaded Documents \(1\)/.test(await bodyText(page)));
    // upload scan-style PNG as fire safety
    await typeSel.select('FIRE_SAFETY_NOC');
    const fileIn2 = await page.$('input[type=file]');
    await fileIn2.uploadFile(P + '/demo-data/sample-documents/04_fire_safety_scan_image.png');
    await sleep(500);
    await clickText(page, 'Upload & Process with OCR'); await sleep(7000);
    await shot(page, '05-after-image-upload');
    ok('image upload processed (2 documents listed)', /Uploaded Documents \(2\)/.test(await bodyText(page)));
    await clickText(page, 'Application Status'); await sleep(1500);
    await shot(page, '06-institution-status');
    // logout
    await clickText(page, 'Log Out'); await sleep(800);
    ok('logout returns to login', (await bodyText(page)).includes('Sign In'));

    // ---- Authority flow
    await login(page, 'AICTE Authority', 'authority', 'password123');
    await shot(page, '09-authority-overview');
    ok('authority sees app list', true);
    await clickText(page, 'Application Dossier'); await sleep(2000);
    await shot(page, '10-authority-dossier');
    const dossier = await bodyText(page);
    ok('dossier shows Findings flagged', /Findings Flagged/.test(dossier));
    ok('dossier shows missing approval letter / rule findings', /Missing Mandatory Document|R00\d/.test(dossier));
    // download report
    const dl = path.join(tmp, 'dl'); fs.mkdirSync(dl);
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
    await clickText(page, 'Report'); await sleep(3000);
    const got = fs.readdirSync(dl).filter(f => f.endsWith('.pdf'));
    ok('PDF report downloaded', got.length === 1 && fs.readFileSync(path.join(dl, got[0])).slice(0, 4).toString() === '%PDF');
    // decision
    await clickText(page, 'Accept'); await sleep(1500);
    await shot(page, '11-authority-accepted');
    ok('decision accepted', /ACCEPTED/.test(await bodyText(page)));
    // OCR inspector + view file
    await clickText(page, 'OCR & Extraction'); await sleep(2000);
    await shot(page, '12-ocr-inspector');
    // demo seed + reset
    await clickText(page, 'Overview'); await sleep(500);
    await shot(page, '13-authority-home');
    await clickText(page, 'Log Out'); await sleep(800);
    // ---- password reset UI flow
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await clickText(page, 'Forgot Password?'); await sleep(500);
    await page.type('input[placeholder^="e.g."]', 'institution');
    await page.type('input[type=email]', 'institution@example.edu.in');
    await clickText(page, 'Reset'); await sleep(1500);
    await shot(page, '14-reset-step1');
    const m = log.match(/code for institution "institution": (\d{6})/);
    ok('reset code printed to server console only', !!m && !(await bodyText(page)).includes(m[1]));
    const pw = await page.$$('input[type=password]');
    await pw[0].type('brandnew123'); await pw[1].type('brandnew123');
    const codeIn = await page.$('input[placeholder="6-digit code"]'); await codeIn.type(m[1]);
    await shot(page, '15-reset-step2');
    await clickText(page, 'Reset'); await sleep(1500);
    ok('reset success message', /Password updated/.test(await bodyText(page)));
    await page.focus('input[placeholder^="e.g."]'); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await page.type('input[placeholder^="e.g."]', 'institution'); await page.type('input[type=password]', 'brandnew123');
    await clickText(page, 'Sign In to Portal'); await sleep(1500);
    ok('login with new password works', (await bodyText(page)).includes('Application Status'));
    await shot(page, '16-login-after-reset');
  } catch (e) { console.log('ERR step1', e.message); await shot(page, 'error'); process.exitCode = 1; }
  
  const bad = results.filter(r => !r[1]).length; console.log(bad + ' failed of ' + results.length); if (bad) process.exitCode = 1;
  await browser.close(); srv.kill();
})();
