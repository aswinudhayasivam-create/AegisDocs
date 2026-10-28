# ZENITH project - plain explainer (for Aswin, Member 6)

## 1. What the system does
An institution applies and uploads certificates. The server reads each file, finds the key facts
(institution name, certificate number, dates, faculty ID and name), and checks them. The authority sees the
problems, downloads a PDF report, and accepts or rejects.

## 2. How the pieces connect
```
Browser (React)  ->  Express server  ->  OCR / PDF text reader  ->  field extractor
                                      \->  checks (3 basic + rule engine R001-R006)  ->  report PDF
                         saved in server/data/db.json
```
- `client/src/` - screens (Member 1)
- `server/routes/` - the web addresses the screens call
- `server/services/ocrService.js`, `fieldExtractor.js` - reading files (Member 2)
- `server/services/validationService.js` - runs all checks and collects findings
- `server/rulesEngine/engine.js` - the rule engine (Member 3 role)
- `server/config/validationRules.json` - Member 4's rules; edit this file to change rules

## 3. The rules R001-R006
Each rule is a few lines of JSON: which part of the application to look at (`scope`), which `field`, and the
`rule_type`. Today the only type is `required` (not blank). `severity` high becomes an ERROR in the app;
medium and low become WARNINGs.

| Rule | Checks |
|---|---|
| R001 | Application ID present |
| R002 | Institution name present |
| R003 | Institution ID present |
| R004 | Every faculty record has a Faculty ID |
| R005 | Every faculty record has a Faculty name |
| R006 | Every document record has a document type |

To add a new kind of rule (for example "date must not be expired") add one `case` in `checkRule()` in
`server/rulesEngine/engine.js`, then add the rule to the JSON.

## 4. Try the rules
Log in as institution, open "Submit New Application" and use the import box with `demo-data/application_data.json`, or run `npm test` (tests T001-T004
do exactly this). To change the data, copy `demo-data/application_data.json`, blank one value (for example
`"institution_name": ""`), and import it. R002 should fail.

## 5. What was fixed and why
The prototype let anyone, with no login, change an application to ACCEPTED, download reports, delete documents
and reset passwords. Those holes are closed (see `docs/CHANGES.md`). The old tests failed because they were
run against leftover demo data; tests now use a temporary database.

## 6. What is honestly still open
See `docs/KNOWN_GAPS.md`. The big ones: real scanned-certificate OCR is untested, there is no accuracy number,
the team's own `ai-validation-engine.zip` was not reviewed, and the rules are illustrative.

## 7. Verified results (run on the Oct 27 build)
- Server JS files: all pass syntax check
- `npm test`: 4 engine tests, 9 rule-engine tests, 21 API/security tests all passed
- Server started and served the login page; protected addresses return 401 without a login
- Image OCR passed on a synthetic scan-style PNG (institution, certificate number, issue and expiry dates read correctly)
- A scripted Chrome run through the real screens passed 16 of 16 checks: institution creates an application (with Institution ID) and imports Member 4's JSON, uploads a PDF and a scan-style image, authority sees the findings, downloads the PDF report, accepts, and the password-reset code flow works end to end
These are checks on fictional samples, not accuracy measurements.

## 8. Before you push to GitHub
Nothing has been pushed. Tell the assistant when you are ready. The `.gitignore` already keeps `node_modules`,
uploads, the database and secrets out of the repository. Check that the team agrees on the stack first
(the role-plan image said Python).
