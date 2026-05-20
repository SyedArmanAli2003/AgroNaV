# What it does: Provides async SQLite database connection for FastAPI
# Input: None (uses agronav.db file)
# Output: Async database connection via get_db() dependency
# Called by: All FastAPI routers via Depends(get_db)

import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agronav.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


async def get_db():
    """FastAPI dependency that yields an async SQLite connection."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_tables():
    """Read schema.sql and execute all statements to create tables."""
    with open(SCHEMA_PATH, "r") as f:
        schema_sql = f.read()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(schema_sql)
        try:
            await db.execute("ALTER TABLE users ADD COLUMN state TEXT")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE users ADD COLUMN district TEXT")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE users ADD COLUMN territory_id TEXT")
        except Exception:
            pass
        await db.commit()
    print("Database tables created.")
