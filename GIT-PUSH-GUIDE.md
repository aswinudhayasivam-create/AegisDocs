# Push this project to the GitHub repo (Windows, plain steps)

Repo: https://github.com/aswinudhayasivam-create/SIH---ZENITH-

The repo currently has only one file: an old README about "Hostel360" (a different, stale
description). These steps replace that README with this project. Nothing else exists in the repo,
so nothing else gets overwritten.

1. Unzip `SIH-ZENITH-FINAL-Project.zip`. You get a folder named `SIH-ZENITH` with the actual
   project files directly inside it (client, server, demo-data, docs, README, and so on).

2. Open PowerShell and go to your code folder:
   ```
   cd F:\ASWIN\ASH
   ```

3. Check that no old copy is in the way:
   ```
   dir SIH---ZENITH-
   ```
   - If you see "File Not Found", continue to step 4.
   - If the folder already exists, STOP. It may hold other work or a stale copy. Either rename it
     (`ren SIH---ZENITH- SIH---ZENITH--old`) or use a different empty folder instead of
     `F:\ASWIN\ASH` for these steps. Do not copy into it blindly.

4. Download the repo:
   ```
   git clone https://github.com/aswinudhayasivam-create/SIH---ZENITH-.git
   ```
   This makes a new folder `F:\ASWIN\ASH\SIH---ZENITH-`. It does not touch your other folders
   (DSA, DSA-Automation, MedBridge, ...).

5. Copy everything from inside the unzipped `SIH-ZENITH` folder into the `SIH---ZENITH-` folder.
   Windows will ask about `README.md`: choose **Replace**. That is the only name that already
   exists, and replacing it is intended - it removes the stale Hostel360 description.

6. Send it up:
   ```
   cd SIH---ZENITH-
   git add .
   git commit -m "Add SIH ZENITH AI application verification project"
   git push
   ```
   If git asks you to sign in, a browser window opens for your GitHub login.

7. Check https://github.com/aswinudhayasivam-create/SIH---ZENITH- afterwards: the README should
   now describe this project, and the folders `client`, `server`, `demo-data`, `docs`, `scripts`
   should be there.

Notes:
- Run these commands only inside `F:\ASWIN\ASH\SIH---ZENITH-`, never inside your other project folders.
- `.gitignore` already excludes `node_modules/`, `.env`, `server/data/` (runtime database),
  `server/uploads/` and `client/dist/` (build output), so `git add .` will not upload them.
- After cloning on any PC, follow "Run on Windows" in `README.md` (install, build, start).
