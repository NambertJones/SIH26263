# Demo reset procedure

The demo always starts from the freshly seeded state: 8 fictional colleges, their programmes and seat
figures, seeded students and cases, and the sandbox reference records. The upload files in `demo-data/`
(also offered under **Bulk Import → sample files**) are sized for that state. In particular,
`students_intake_overflow.csv` goes exactly 3 over Mechanical's reference only on a fresh seed.

## Live site (Render)

The service runs SQLite inside its container, and the container's disk is not persistent:

* **Restart or redeploy = full reset.** In the Render dashboard, open the `apaar-reconx` service and choose
  **Manual Deploy → Deploy latest commit** (or **Restart**). On startup the database is created and seeded
  again (`SEED_ON_STARTUP=true`).
* **The free plan sleeps after about 15 minutes without traffic, and waking it is also a reset.** Anything
  imported before then is lost. So:
  1. Open the site 2–3 minutes before presenting (the first request takes about a minute to wake it).
  2. Import the files **during** the demo, or no more than a few minutes before it.
  3. Keep a tab open and click around every few minutes until you present.
* There is no reset button in the app. Resetting is a hosting operation and is never exposed to users.

## Local machine

With the server stopped, from `backend/`:

```bash
.venv/Scripts/python scripts/reset_local_demo.py
```

It asks you to type `reset`, deletes the local SQLite file named in `DATABASE_URL`, and seeds it again.
It **refuses** when:

* `APP_ENV=production`;
* `DATABASE_URL` is not SQLite (for example PostgreSQL);
* the database file is outside the `backend/` folder or the system temp folder.

Then start the server again (for example the `reconx` launch configuration, or
`.venv/Scripts/python -m uvicorn app.main:app --port 8000` from `backend/`).

## Rehearsal check (optional, about 30 seconds)

Before a demo, confirm the build behaves exactly as tested. This uses its own throwaway database and does
not touch your local data:

```bash
.venv/Scripts/python scripts/demo_e2e.py
```

Expected last line: `69/69 checks passed`.

## Regenerating the dataset

Only needed if the seed data changes. Run `.venv/Scripts/python scripts/generate_demo_dataset.py` from
`backend/`. Don't run it from inside the `demo-data/` folder: the script recreates that folder. Then rebuild
the frontend so the sample downloads update (`npm run build` in `frontend/`, then copy `frontend/dist`
to `backend/dist`).
