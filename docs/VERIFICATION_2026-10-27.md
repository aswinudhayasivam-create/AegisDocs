# Independent verification, 2026-10-27

This package was re-verified from scratch on 2026-10-27 by an independent pass (not by re-reading
the previous test output). Everything below was executed against the packaged code on Node.js v22
on this date, in two rounds: an initial pass, then a second pass after review of the first set of
fixes. This is a **behaviour verification of a fictional demo**, not a certification, not an
accuracy measurement, and not a security audit.

## What was done

1. **Clean install and build** from the packaged files only (fresh `npm install` for server and
   client, then `vite build`). Both passed.
2. **Automated suites re-run:** backend/OCR engine checks (5), rule-engine tests (9), API tests
   (21 as received). All passed before any change.
3. **Independent live checks against a running server** (separate from the packaged tests):
   - Health endpoint public; wrong password refused (401); every application/document/report/demo
     route refuses anonymous calls (401); a tampered token is refused.
   - Institution created an application; upload of the sample PNG went through OCR and returned the
     expected fields (institution name, certificate number, issue/expiry dates, issuing authority).
   - Validation flagged the missing mandatory documents and the institution-name mismatch.
   - Byte-identical duplicate upload was detected and reported.
   - The PDF report downloads as a real PDF with readable content, for the owner only.
   - Data and login survived a server restart (JSON store persistence).
   - The one-click demo seed produced the planned findings (name mismatch, expired certificate,
     missing approval letter).
4. **Browser run:** the scripted Chrome end-to-end (`scripts/browser-e2e.js`, 16 checks) was
   re-executed after every change round; 16/16 PASS, with fresh screenshots in `docs/screenshots/`.
5. **Reproducibility proof:** the shipped ZIP itself was re-extracted to a clean folder;
   `npm run install:all` and the full test suite pass on the extracted copy.

## Defects found and fixed (this copy only; the original package is untouched)

| # | Defect | Why it matters | Fix |
|---|---|---|---|
| 1 | `PUT /api/documents/:id/fields` accepted calls from the owning institution | The UI only offers field correction to the authority, but a direct API call let a submitting institution rewrite an extracted value. Verified live: editing the institution name made its own mismatch finding disappear. | Route is now authority-only (matches the UI). Regression test added. |
| 2 | Unsupported file type returned HTTP 500 and left the rejected file in `uploads/` | Wrong status code and orphaned files. | Now HTTP 400, and the rejected file is deleted. Regression test added. |
| 3 | A file over 25 MB hit Express's default error page (HTTP 500 HTML) | Unclear failure for a normal user mistake. | Clear HTTP 400 JSON ("File exceeds the maximum allowed size of 25MB."). Regression test added. |
| 4 | `docs/ROLES.md` said "34 automated checks"; the real count was 35 | Documentation error. | Corrected; now 41 with the new tests. |
| 5 | **Anyone could self-register an authority account** (found in round 1, fixed in round 2 after review) | Authority can accept/reject every application, so a public signup for it defeats the role model. Verified live end-to-end with a rogue account in round 1. | Register route refuses `authority` (403); the store refuses non-institution self-registration as a second line of defence; the register screen is institution-only (see `docs/screenshots/17-register-institution-only.png`). Seeded authority login and institution signup verified working. Role injection / case variants (`Authority`, `AUTHORITY`, `admin`, padded values) return 400. Regression tests added. |
| 6 | Field corrections overwrote the machine-read value with no record | No way to show what OCR originally extracted after a correction. | Every correction now appends `{ previousValue, newValue, editedBy, editedAt }` to the field record. Regression test added. Note: there is no screen for the history yet (KNOWN_GAPS #13). |
| 7 | `docs/changes-vs-original.diff` was already stale before this verification | It predated the final `.gitignore`, referenced a `NEWREADME.md` that was renamed before packaging, and missed a `client/package-lock.json` change. | Regenerated against the actual supplied prototype (`ai-application-validator-mern.zip`, retrieved again on 2026-10-27) and this package as shipped. |

## Deliberate demo scope (documented, not fixed)

- Seeded demo logins use `password123`; the reset code prints in the server console; authority
  accounts can only be added by editing `server/data/db.json` (KNOWN_GAPS #14).
- Storage is a single JSON file with no concurrency protection.

## What this verification does NOT claim

- No accuracy figure for OCR or field extraction on real documents (synthetic samples only).
- The team's own `ai-validation-engine.zip` (36.7 MB) was never retrieved and is unverified.
  The separate `File_001` backend was reviewed on 2026-10-25 (8 of 18 JS files had syntax errors,
  4 imported model files missing) but was **not part of this verification pass**: it is not merged
  into this package and was unavailable to this run.
- Not tested: concurrent writes, browsers other than Chrome, phone photos of real certificates,
  load, or anything resembling official AICTE rules (R001-R006 are illustrative "field present"
  checks).
- This is not a statement that the app authenticates documents. It is a screening prototype.

## Evidence

- Fresh screenshots from the 2026-10-27 browser run: `docs/screenshots/01` - `16` (16/16 PASS),
  plus `17-register-institution-only.png` showing the closed authority registration.
- The regression tests are in `server/test/test-api.js` (now 27 tests; 41 automated checks total).
