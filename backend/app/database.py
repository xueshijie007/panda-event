import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parents[1]
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'simulator.db'}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_user_profile_columns() -> None:
    """Keep local SQLite dev databases compatible after adding profile fields."""
    existing_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    columns = {
        "password_hash": "VARCHAR(255)",
        "contact_type": "VARCHAR(16)",
        "contact_account": "VARCHAR(128)",
        "exchange_uid": "VARCHAR(128)",
        "review_status": "VARCHAR(20) DEFAULT 'approved' NOT NULL",
        "reviewed_at": "DATETIME",
    }
    missing_columns = [(name, column_type) for name, column_type in columns.items() if name not in existing_columns]
    if not missing_columns:
        return

    with engine.begin() as connection:
        for name, column_type in missing_columns:
            connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {column_type}"))
