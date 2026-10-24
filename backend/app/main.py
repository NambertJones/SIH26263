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


@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "demo_mode": True,
        "docs_url": "/docs",
    }
