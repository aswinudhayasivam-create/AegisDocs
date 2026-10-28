# Known gaps

1. **Real-world OCR is unproven.** Image OCR was tested on the supplied role-plan image and on a clean synthetic scan-style image. Phone photos and real scans may extract badly.
2. **No accuracy measurement.** The tests check behaviour on a tiny fictional set. They say nothing about accuracy on real documents.
3. **Rules are illustrative.** R001-R006 only check that a field is not blank. They are not AICTE rules.
4. **Team's own engine not reviewed** (`ai-validation-engine.zip`), and `File_001` backend is not merged.
5. **Storage is a JSON file.** Fine for a demo, not for many users. Two requests at the same moment could overwrite each other. MongoDB is not used.
6. **Password reset prints the code in the server window.** There is no email sending. A real system would email it.
7. **Demo accounts have a known password** (`password123`). Change them or delete `server/data/db.json` and register your own.
8. **Login tokens are kept in the browser's local storage** and last 12 hours. There is no logout-everywhere.
9. **Rate limiting is basic and in memory.** It resets when the server restarts.
10. **Browser checks use fictional files and Chrome only.** A scripted Chrome run passes (see README), but other browsers and real-world files were not tried.
11. **Duplicate detection** only catches byte-identical files.
12. **The tech stack differs from the role-plan image** (it said Python/Streamlit). The team must decide and say so in the PPT.
13. **Field-correction history is stored but has no screen.** Since 2026-10-27 every authority
   correction appends the old value, new value, editor and time to the field record (visible via the
   document API or `server/data/db.json`). No page in the app shows this history yet.
14. **Authority accounts are seeded, not provisioned by a flow.** Public registration is
   institution-only (the server refuses authority sign-ups), so the only way to add another authority
   in this demo is to edit `server/data/db.json` directly. A real system needs an admin flow.
