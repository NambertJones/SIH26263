"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed.seed_data import seed_database

# Import models so Base.metadata knows about them
import app.models

# Import routers
from app.routers import (
    auth,
    dashboard,
    submissions,
    validation,
    students,
    verification,
    reports,
    integrations,
    users,
    institutions,
    audit,
    certificate,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan events."""
    print("[LIFESPAN] Creating database tables...")
    Base.metadata.create_all(bind=engine)

    if settings.SEED_ON_STARTUP:
        print("[LIFESPAN] Running synthetic data seeder...")
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()

    yield
    print("[LIFESPAN] Application shutdown.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="APAAR ID-Based Student Data Management and Verification Platform",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(submissions.router)
app.include_router(validation.router)
app.include_router(students.router)
app.include_router(verification.router)
app.include_router(reports.router)
app.include_router(integrations.router)
app.include_router(users.router)
app.include_router(institutions.router)
app.include_router(audit.router)
app.include_router(certificate.router)
app.include_router(certificate.public_router)


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check potential frontend dist paths (local dev vs container/monorepo)
FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "dist")
    )

if os.path.exists(FRONTEND_DIST) and os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_index():
        """Serve index.html at root."""
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "online",
        }

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        """Serve frontend static assets or fallback to SPA index.html."""
        if full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "online",
        }
else:
    @app.get("/")
    def root():
        """Health check endpoint when frontend dist is not present."""
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "online",
            "docs_url": "/docs",
        }

