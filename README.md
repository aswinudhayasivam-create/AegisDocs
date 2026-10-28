# ZENITH - AI Application and Document Verification

A Smart India Hackathon prototype by **Team ZENITH**

**Theme:** Smart Automation &nbsp;|&nbsp; **Category:** Software

Institutions applying for AICTE approval upload their certificates. This system reads them
(PDF text, or OCR for scanned images), extracts the key fields, checks them against compliance
rules, and gives the authority a clear report to accept or reject the application.

## How it works

1. **Submit** - an institution creates an application with its basic details.
2. **Upload** - certificates and records are uploaded as PDFs or scanned images.
3. **Read** - the server extracts text directly from PDFs, or runs OCR (Tesseract) on scanned images.
4. **Extract** - key fields (institution name, dates, approval numbers, and so on) are pulled out of the text.
5. **Check** - the rule engine runs rules R001-R006 (required documents present, name match, certificate expiry, and more).
6. **Decide** - the authority reviews the dossier, downloads the PDF report, and accepts or rejects.

## Tech stack

| Layer | Used |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| OCR | Tesseract.js (English data in `eng.traineddata`) |
| PDF | pdf-parse / unpdf to read, pdf-lib to generate the report |
| Storage | Local JSON file (`server/data/db.json`, created on first run) |
| Tests | Plain Node test suites, no extra framework |

Everything used is free and open source.

## Project structure

```
client/            React web app (Vite)
server/            Express API: login, upload, OCR, extraction, report
  rulesEngine/     compliance rule engine
  config/          validationRules.json (rules R001-R006)
  test/            automated test suites
demo-data/         fictional sample data, rules and sample documents for the demo
docs/              design notes, change log, screenshots, known gaps
scripts/           optional browser end-to-end test and sample-PDF generator
eng.traineddata    OCR language data (English)
```

## Run on Windows (plain steps)

1. Install **Node.js LTS** from https://nodejs.org (free). Restart PowerShell afterwards.
2. Open PowerShell inside this folder (right-click in the folder, "Open in Terminal").
3. Install the libraries (needs internet, one time):
   ```
   npm run install:all
   ```
4. Build the web app (one time, and again after any change in `client/src`):
   ```
   npm run build
   ```
5. Start the app:
   ```
   npm start
   ```
6. Open http://localhost:5000 in Chrome.

**Demo logins** (created automatically the first time):

| Role | Username | Password |
|---|---|---|
| Institution | `institution` | `password123` |
| Authority | `authority` | `password123` |

Change these before showing the app to anyone outside the team.

**Registering:** only institutions self-register. Authority is a privileged role (it decides every
application), so authority accounts are provisioned, not self-registered - this build ships with the
seeded authority login above. The server refuses public authority registration (HTTP 403).

**Forgot password:** the app makes a 6-digit code and prints it in the PowerShell window where
`npm start` is running (it stands in for an email). Type that code in the app.

## Demo script (about 5 minutes)

1. Log in as `institution`. Open "Submit New Application", fill the form (including Institution ID)
   and submit. Or import `demo-data/application_data.json` with the import box on the same page.
2. Upload `demo-data/sample-documents/02_faculty_qualification_record.pdf` (type: Faculty record) and
   `04_fire_safety_scan_image.png` (type: Fire safety). The second one goes through OCR.
3. Log out and log in as `authority`. Open "OCR & Extraction" to show fields and confidence, then
   "Application Dossier" to show the findings (missing approval letter, name mismatch, rule results),
   download the PDF report, then Accept or Reject.
4. Optional: the authority's "One-Click Demo" button loads a ready-made 3-document scenario with a
   name mismatch and an expired certificate.

## Tests

Three automated suites, all passing on this packaged code. Run everything from the project root:

```
npm test
```

| Suite | Covers |
|---|---|
| Backend & OCR engine (`server/test/test-engine.js`) | checksum generation, field extraction, record seeding, name-mismatch and expiry detection |
| Rule engine (`server/test/test-rules.js`) | 9 tests over rules R001-R006 |
| API (`server/test/test-api.js`) | 27 tests over login, registration rules, upload, extraction, decisions, field-edit authorization + history, and bad-file rejection |

The suites use a temporary database, so they never touch your data. Expect "ALL BACKEND & OCR
ENGINE TESTS PASSED", "9 rule-engine tests passed" and "27 API tests passed".

An optional browser test drives Chrome through the full app (16 checks: institution
create/import/upload, authority findings, report download, accept, password reset):

```
npm install --no-save puppeteer-core
node scripts/browser-e2e.js
```

Screenshots from the last browser run are in `docs/screenshots/`.

## Honest scope and limitations

- This is a **screening aid, not a document-authentication system**. It does not prove a certificate is genuine.
- All sample data is fictional. The rules in `demo-data` are **illustrative, not official AICTE rules**.
- OCR was tested only on synthetic sample images made for this demo; there are **no accuracy claims**.
- Data is stored in a local JSON file, not MongoDB, despite the original "MERN" label.
- It runs as a local demo: the password-reset code is printed in the server console instead of being emailed.
- The full, honest list of what is not done: `docs/KNOWN_GAPS.md`.

## Credits

- Original working prototype (React client, Express server, upload, OCR, extraction, PDF report): Member 1 & Member 2
- Compliance rules R001-R006 and sample data: Member 4
- Security fixes, rule-engine wiring, integration and demo packaging: Member 6 (Aswin Udhaya Sivam)
- Rule-engine implementation and automated test suites were written with AI assistance under the Member 3 and Member 5 roles

## More documentation

- `docs/VERIFICATION_2026-10-27.md` - independent re-verification of this package (what was tested, what was fixed, what is still unproven)
- `docs/EXPLAINER.md` - plain-language explanation of everything and what changed
- `docs/ROLES.md` - who owns what and what is still missing from each member
- `docs/CHANGES.md` and `docs/changes-vs-original.diff` - exact changes from the supplied prototype
- `docs/ORIGINAL_ERRORS_REPORT.md` - errors found in the originally supplied code
- `docs/ORIGINAL_README_from_Member1-2.md` - the README that came with the supplied prototype (some parts are out of date)

## Push this to GitHub

See `GIT-PUSH-GUIDE.md`.
