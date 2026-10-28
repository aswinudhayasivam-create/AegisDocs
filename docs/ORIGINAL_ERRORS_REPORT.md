# Errors found in the teammates' original files

The originals were NOT edited. The supplied ZIP is stored unchanged (SHA-256 below). Everything else in this
package is a separate, assistant-made or assistant-fixed copy, labelled as such.

Original ZIP: `ai-application-validator-mern.zip` (Member 1 + Member 2 handover, per its own package files)
SHA-256: c635e5b4e99a74fb32fc5c03649ed73c93a96c198c4edb7e91d39478a0eaece2

## A. ai-application-validator-mern.zip (checked by running it, Oct 27)
Security
1. No authorization anywhere. An application could be set to ACCEPTED with no login. Document delete, report download, file viewing and demo reset were also open.
2. Forgot-password changed a password from username + email alone (no code or token).
3. CORS allowed every website (`*`).
4. Uploaded files were served publicly at `/uploads/...`.
5. Passwords hashed with PBKDF2 at only 1,000 rounds.
Bugs
6. Demo reset (`/api/demo/reset`) deleted all user accounts, not just applications.
7. `npm test` fails as shipped: the shipped `db.json` holds leftover demo data (25 documents, 137 fields, 5 users) and Test 3 checks exact counts. It passes on a clean database (4/4).
8. Field extractor bug: "Certificate Reference: CERT001" extracts "erence" as the certificate number.
9. Front end calls a fixed `http://localhost:5000/api`, so it fails on any other port.
10. OCR depended on the folder it was started from (it looked for `eng.traineddata` in the current folder or downloaded it).
Design / documentation
11. Name says MERN but there is no MongoDB; data is a JSON file. The README says MongoDB is optional but no code uses it.
12. Role-plan image says Member 2/3 planned Python (Streamlit); the code is React + Node. Needs a team decision.
13. Validation is only 3 basic checks (missing documents, name mismatch, expiry). It does not use Member 4's rules.
14. Real scanned-certificate OCR was not tested by the authors. Only a role-plan image was OCR'd.
What works (verified): all 15 server JS files pass syntax check; health, login, upload, PDF text extraction, duplicate detection, validation, PDF report; image OCR on the supplied image.

## B. Earlier findings (Oct 25 review, NOT re-run in this build)
- `File_001` backend: 8 of 18 JS files had syntax errors (broken strings) and 4 imported model files were missing. Different codebase from the ZIP above.
- Its document types and rules did not match Member 4's package.
- `ai-validation-engine.zip` (36.7 MB) could not be retrieved, so it was never reviewed. Nothing says it is wrong.

## C. Member 4 starter files (Oct 24 review, from the earlier session)
- Sample documents were `.txt`, which the app does not accept for upload.
- The app did not read the rules/data JSON format. The app also did not extract application ID, institution ID, faculty ID or faculty name, so R001-R006 could not run.
(The original Member 4 ZIP was not available in this build and is untouched.)

Full list of changes the fixed copy makes: `docs/CHANGES.md`. Exact line-by-line difference from the original source: `docs/changes-vs-original.diff`.
