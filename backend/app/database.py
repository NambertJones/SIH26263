"""SQLAlchemy database engine and session management."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


# Handle SQLite vs PostgreSQL connection args
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

# Enable WAL mode and foreign keys for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_new_columns() -> None:
    """Add columns introduced after a database was first created.

    `create_all` only creates missing tables, so an existing SQLite/PostgreSQL
    database would otherwise fail on the newer institution profile fields.
    """
    from sqlalchemy import inspect, text

    added = {
        "institutions": {
            "affiliating_university": "VARCHAR(255)",
            "established_year": "INTEGER",
            "approval_status": "VARCHAR(30)",
            "approval_reference": "VARCHAR(60)",
            "approval_valid_till": "VARCHAR(10)",
            "contact_email": "VARCHAR(255)",
        },
    }
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in added.items():
            if not inspector.has_table(table):
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl_type in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))
