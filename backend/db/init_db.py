# What it does: Creates all database tables from schema.sql
# Input: schema.sql file
# Output: agronav.db with all tables created
# Called by: Run directly: python db/init_db.py

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agronav.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def init_db():
    """Read schema.sql and execute against agronav.db."""
    with open(SCHEMA_PATH, "r") as f:
        schema_sql = f.read()

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(schema_sql)
    conn.commit()
    conn.close()
    print("Database ready.")


if __name__ == "__main__":
    init_db()
