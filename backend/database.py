# =========================================================
# DATABASE SETUP
# =========================================================

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from .env")


connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables known to SQLAlchemy."""
    Base.metadata.create_all(bind=engine)


def migrate_existing_cases(default_owner_id: int) -> None:
    """
    Lightweight compatibility migration for the pre-security database.

    The original prototype's `cases` table did not have `owner_id`.
    SQLAlchemy create_all() does not alter an existing table, so we add
    the column and backfill existing cases to the demo examiner.

    New databases are created directly from the current model and need
    no ALTER TABLE work.
    """
    inspector = inspect(engine)
    if "cases" not in inspector.get_table_names():
        return

    columns = {
        column["name"] for column in inspector.get_columns("cases")
    }

    if "owner_id" not in columns:
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE cases ADD COLUMN owner_id INTEGER")
            )

    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE cases "
                "SET owner_id = :owner_id "
                "WHERE owner_id IS NULL"
            ),
            {"owner_id": default_owner_id},
        )

        # Index creation is portable across PostgreSQL and SQLite.
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_cases_owner_id "
                "ON cases (owner_id)"
            )
        )

    # PostgreSQL-specific FK + NOT NULL hardening.
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            fks = inspector.get_foreign_keys("cases")
            has_owner_fk = any(
                fk.get("referred_table") == "users"
                and "owner_id" in (fk.get("constrained_columns") or [])
                for fk in fks
            )

            if not has_owner_fk:
                conn.execute(
                    text(
                        "ALTER TABLE cases "
                        "ADD CONSTRAINT cases_owner_id_fkey "
                        "FOREIGN KEY (owner_id) REFERENCES users(id)"
                    )
                )

            conn.execute(
                text(
                    "ALTER TABLE cases ALTER COLUMN owner_id SET NOT NULL"
                )
            )
