"""Reset a LOCAL demo database to the freshly seeded state.

Usage (from the backend folder, with the server stopped):
    .venv/Scripts/python scripts/reset_local_demo.py [--yes]

Safety: refuses when APP_ENV is production, when DATABASE_URL is not a SQLite file, or when the file is
outside this backend folder or the system temp folder. It never touches a PostgreSQL database.
"""

import os
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)

from app.config import settings  # noqa: E402

if os.environ.get("APP_ENV", getattr(settings, "APP_ENV", "")).lower() == "production":
    sys.exit("Refusing: APP_ENV is production. On Render, restart or redeploy the service instead.")
url = settings.DATABASE_URL
if not url.startswith("sqlite:///"):
    sys.exit(f"Refusing: DATABASE_URL is not a local SQLite file ({url.split(':')[0]}).")
db = Path(url.replace("sqlite:///", "", 1)).resolve()
allowed = (BACKEND.resolve(), Path(tempfile.gettempdir()).resolve())
if not any(str(db).startswith(str(a)) for a in allowed):
    sys.exit(f"Refusing: {db} is outside the backend folder and the temp folder.")

if "--yes" not in sys.argv:
    answer = input(f"Delete {db} and re-seed it? Type 'reset' to continue: ")
    if answer.strip() != "reset":
        sys.exit("Cancelled.")

for suffix in ("", "-shm", "-wal", "-journal"):
    Path(str(db) + suffix).unlink(missing_ok=True)

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

with TestClient(app):  # the startup hook creates the tables and seeds them
    pass
print(f"Reset complete: {db} re-seeded. Start the server again and sign in.")
