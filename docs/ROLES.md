# Roles: what exists and what is still needed

Role names come from the team's six-member plan image. The supplied prototype's own files say it is the
Member 1 + Member 2 handover. Nothing in the files names the people, so no names are used here.

| Role | Task | State in this repo | Still needed from the team |
|---|---|---|---|
| Member 1 | Application interface | React app works (login, dashboards, upload, inspector). Now sends a login token, has an Institution ID box, and has an import box for Member 4's JSON file. | Look over the screens; the layout itself was not redesigned. |
| Member 2 | OCR and document processing | Works: PDF text, image OCR (tested on a synthetic scan-style image only), field extraction, duplicate detection, PDF report. Added Faculty ID and Faculty Name extraction. | Test with real scanned certificates (blurry, rotated, phone photos). |
| Member 3 | Validation engine | The supplied prototype had 3 basic checks. A **new** rule engine was written here (`server/rulesEngine/`) that runs Member 4's R001-R006. | The team's own `ai-validation-engine.zip` (36.7 MB) could not be retrieved and was never reviewed. This build does not wait for it. If it turns out to hold a real engine, compare before choosing one. |
| Member 4 | Data and compliance rules | `demo-data/`: rules R001-R006 (unchanged), `application_data.json`, test cases T001-T004, 4 fictional sample files. Rules now run in the app. | Real rule list from the problem statement (current rules only check "field is present"). |
| Member 5 | Testing and accuracy | 41 automated checks in `server/test/` plus a 16-check browser run (`scripts/browser-e2e.js`). | No accuracy figure exists. Needs a set of real or realistic documents with known answers, then measure. Nothing here is an accuracy result. |
| Member 6 | Integration and demo | This repo: one project, security fixes, tests, setup steps. | Put it on GitHub, run the demo end to end on your PC, fill the PPT's problem-statement ID, title and team ID. |

Original teammate files are not edited anywhere. Not touched: `File_001` backend (from Oct 25; 8 of 18 JS files had syntax errors and 4 model files were missing) and
`ai-validation-engine.zip`. Neither was merged.
