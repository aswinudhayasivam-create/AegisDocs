# What changed from the supplied Member 1 + 2 prototype

Security
- Login token (signed, 12 hours). Every application, document, report and demo route now needs it.
- Authority-only: change decision (accept/reject), reset demo data. An institution sees only its own applications and files.
- Uploaded files are no longer public at `/uploads/...`; they open through a checked route.
- Password reset needs a one-time code (15 minutes, 5 tries). The old version changed a password from username + email alone.
- CORS limited to the local app (was open to every website).
- Passwords: 210,000 PBKDF2 rounds (was 1,000). Old accounts are upgraded when they log in.
- Login attempts limited to 10 failures per username per 15 minutes.
- Demo reset no longer deletes user accounts (the old version did).

Features
- `server/rulesEngine/engine.js` runs Member 4's R001-R006. Results appear in the normal validation list.
- `POST /api/applications/import` takes Member 4's `application_data.json`.
- New demo category `SIH_DEMO` (approval letter + faculty record).
- Extracts Faculty ID and Faculty Name from documents. Fixed a bug where "Certificate Reference: CERT001" gave "erence".
- OCR reads its language file from the project folder (works offline).

UI
- New-application form has an Institution ID box (rule R003). Import box for Member 4's JSON file. Reset-password form is two steps (ask for code, then code + new password). "View File" sends the login token.
- The app now calls `/api/...` on the same address instead of a fixed `localhost:5000`, so it works on any port and in dev mode.

Tests
- `scripts/browser-e2e.js`: scripted Chrome run through the whole app.
- Tests use a temporary database (the old count tests failed against leftover demo data).
- Added rule-engine tests and API/security tests.

Cleanup
- Shipped `db.json` with demo data removed; it is created fresh on first start.
- Old README moved to `docs/`.

## Verification fixes (2026-10-27, independent re-check of this package)

Found by re-testing the packaged app directly (details in `docs/VERIFICATION_2026-10-27.md`):

- **Field correction was open to the submitting institution over the API.** The UI only shows the
  editor to the authority, but a direct API call (`PUT /api/documents/:id/fields`) also worked for
  the institution - it could rewrite an extracted value and make its own mismatch finding disappear.
  The route is now authority-only, matching the UI. Covered by a new test.
- **A rejected upload returned HTTP 500 and left the file on disk.** Unsupported file types now
  return HTTP 400 and the rejected file is removed from the uploads folder. Covered by a new test.
- **A file over the 25 MB limit hit Express's default error page (HTTP 500 HTML).** It now returns
  a clear HTTP 400 JSON message. Covered by a new test.
- Documentation: ROLES.md said "34 automated checks"; the real count was 35.

## Verification round 2 (2026-10-27, after independent review of round 1)

- **Public authority registration is now closed.** Round 1 found that anyone could self-register an
  authority account and accept/reject applications. Now: the register route refuses `authority`
  (HTTP 403), the store refuses any non-institution self-registration as a second line of defence,
  and the register screen is institution-only (the authority tab is disabled in register mode, with
  a note). The seeded demo authority login and institution signup/login are unchanged. Role
  injection/case variants (`Authority`, `AUTHORITY`, `admin`, padded values) were already rejected
  with 400 and are now covered by regression tests.
- **Field corrections keep an audit history.** Each authority correction appends
  `{ previousValue, newValue, editedBy, editedAt }` to the field record instead of silently
  overwriting. The machine-read original is never lost. Covered by a new regression test.
- `docs/changes-vs-original.diff` regenerated against the actual supplied prototype
  (`ai-application-validator-mern.zip`, retrieved again on 2026-10-27). The previously shipped diff
  was stale: it predated the final `.gitignore`, referenced a `NEWREADME.md` that was renamed before
  packaging, and missed a `client/package-lock.json` change.
- API suite now 27 tests (41 automated checks in total).
