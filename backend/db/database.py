# What it does: Provides async SQLite database connection for FastAPI
# Input: None (uses agronav.db file)
# Output: Async database connection via get_db() dependency
# Called by: All FastAPI routers via Depends(get_db)

import aiosqlite
import os
import csv
import sqlite3
from pathlib import Path

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agronav.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

DATASET_DIR = Path(__file__).resolve().parents[2] / "Syngenta_IITM_Hackathon_2026_dataset (1)"


async def get_db():
    """FastAPI dependency that yields an async SQLite connection."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_tables():
    """Read schema.sql and execute all statements to create tables.
    Also runs incremental migrations for new columns and seeds real dataset.
    """
    with open(SCHEMA_PATH, "r") as f:
        schema_sql = f.read()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(schema_sql)

        # ── Incremental column migrations ────────────────────────────────────
        migrations = [
            "ALTER TABLE users ADD COLUMN state TEXT",
            "ALTER TABLE users ADD COLUMN district TEXT",
            "ALTER TABLE users ADD COLUMN territory_id TEXT",
            "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'rep'",
            "ALTER TABLE users ADD COLUMN manager_id INTEGER",
            # alerts table: add outlet_name and timestamp columns if missing
            "ALTER TABLE alerts ADD COLUMN outlet_name TEXT",
            "ALTER TABLE alerts ADD COLUMN timestamp TEXT",
            # visit_logs: add columns referenced by visit_log.py / visits.py /
            # outcomes.py so older DBs created before these columns existed work.
            "ALTER TABLE visit_logs ADD COLUMN competitor_observation TEXT",
            "ALTER TABLE visit_logs ADD COLUMN retailer_name TEXT",
            "ALTER TABLE visit_logs ADD COLUMN retailer_id TEXT",
            "ALTER TABLE visit_logs ADD COLUMN visit_type TEXT",
            "ALTER TABLE visit_logs ADD COLUMN product_discussed TEXT",
            "ALTER TABLE visit_logs ADD COLUMN order_value INTEGER DEFAULT 0",
            "ALTER TABLE visit_logs ADD COLUMN outcome_score INTEGER DEFAULT 0",
            "ALTER TABLE visit_logs ADD COLUMN rejection_reason TEXT",
            "ALTER TABLE visit_logs ADD COLUMN submitted_at TEXT",
            # growers: geocoded columns
            "ALTER TABLE growers ADD COLUMN lat REAL",
            "ALTER TABLE growers ADD COLUMN lng REAL",
            "ALTER TABLE growers ADD COLUMN geocoded_at TEXT",
            "ALTER TABLE growers ADD COLUMN distance_km REAL",
            "ALTER TABLE growers ADD COLUMN nearest_retailer_id TEXT",
            # BUG 2 — retailers: geocoding columns (safe if already present)
            "ALTER TABLE retailers ADD COLUMN lat REAL",
            "ALTER TABLE retailers ADD COLUMN lng REAL",
            "ALTER TABLE retailers ADD COLUMN geocoded_at TEXT",
            # BUG 1 — competitor_intel: add the newer column set to pre-existing DBs
            "ALTER TABLE competitor_intel ADD COLUMN rep_id TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN at_risk_products TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN defensive_talking_point TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN immediate_action TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN escalate_to_manager INTEGER DEFAULT 0",
            "ALTER TABLE competitor_intel ADD COLUMN opportunity_flag INTEGER DEFAULT 0",
            "ALTER TABLE competitor_intel ADD COLUMN rep_raw_observation TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN nearby_stores_detected TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN source TEXT DEFAULT 'llm'",
            "ALTER TABLE competitor_intel ADD COLUMN threat_type TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN threat_level TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN competitor_name TEXT",
            # BUG 1 — competitor_intel: keep legacy columns for fresh DBs created
            # from the new schema.sql so analyze_competitor_threat()/get_history work
            "ALTER TABLE competitor_intel ADD COLUMN rep_observation TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN nearby_stores TEXT",
            "ALTER TABLE competitor_intel ADD COLUMN at_risk_skus TEXT DEFAULT '[]'",
            "ALTER TABLE competitor_intel ADD COLUMN defensive_tp TEXT",
            # BUG 7 — ensure weather_cache (district,date) is unique on older DBs
            # so INSERT OR REPLACE dedups correctly (no-op if rows already unique).
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_weather_cache_district_date "
            "ON weather_cache(district, date)",
        ]
        for sql in migrations:
            try:
                await db.execute(sql)
            except Exception:
                pass  # column already exists

        # ── weekly_plans table (added for weekly visit plan feature) ─────────
        await db.execute("""
CREATE TABLE IF NOT EXISTS weekly_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  rep_id            TEXT NOT NULL,
  week_label        TEXT NOT NULL,
  week_start_date   TEXT NOT NULL,
  week_end_date     TEXT NOT NULL,
  assigned_outlets  TEXT NOT NULL DEFAULT '[]',
  daily_split       TEXT NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'pending',
  created_by        TEXT,
  created_at        TEXT DEFAULT (datetime('now'))
)""")
        try:
            await db.execute("CREATE INDEX IF NOT EXISTS idx_wp_rep_week ON weekly_plans(rep_id, week_start_date)")
        except Exception:
            pass

        # ── Create real-data tables if missing ───────────────────────────────
        await db.executescript("""
CREATE TABLE IF NOT EXISTS retailer_pos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id     TEXT NOT NULL,
  transaction_id  TEXT,
  sku_id          TEXT,
  sku_name        TEXT,
  sku_qty         INTEGER DEFAULT 0,
  sku_price       REAL DEFAULT 0,
  transaction_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_pos_retailer ON retailer_pos(retailer_id);
CREATE INDEX IF NOT EXISTS idx_pos_date     ON retailer_pos(transaction_date);

CREATE TABLE IF NOT EXISTS retailer_inventory (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id     TEXT NOT NULL,
  sku_id          TEXT,
  sku_name        TEXT,
  sku_qty         INTEGER DEFAULT 0,
  week_end_date   TEXT
);
CREATE INDEX IF NOT EXISTS idx_inv_retailer ON retailer_inventory(retailer_id);
CREATE INDEX IF NOT EXISTS idx_inv_date     ON retailer_inventory(week_end_date);

CREATE TABLE IF NOT EXISTS historical_visit_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  rep_id              TEXT,
  visit_date          TEXT,
  territory_id        TEXT,
  visit_tehsil        TEXT,
  visit_type          TEXT,
  product_recommended TEXT
);
CREATE INDEX IF NOT EXISTS idx_hvlog_rep  ON historical_visit_log(rep_id);
CREATE INDEX IF NOT EXISTS idx_hvlog_date ON historical_visit_log(visit_date);

CREATE TABLE IF NOT EXISTS reps_territory (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rep_id         TEXT UNIQUE NOT NULL,
  territory_id   TEXT,
  territory_name TEXT,
  state          TEXT,
  district       TEXT,
  tehsil_list    TEXT
);

CREATE TABLE IF NOT EXISTS weather_cache (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  district     TEXT NOT NULL,
  date         TEXT NOT NULL,
  rainfall_mm  REAL DEFAULT 0,
  temp_c       REAL DEFAULT 32,
  humidity_pct REAL DEFAULT 60,
  weather_risk TEXT DEFAULT 'normal',
  ndvi_value   REAL DEFAULT 0.41,
  ndvi_label   TEXT DEFAULT 'moderate crop stress',
  source       TEXT DEFAULT 'open-meteo-live',
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(district, date)
);

CREATE TABLE IF NOT EXISTS competitor_intel (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id          TEXT NOT NULL,
  date                 TEXT NOT NULL,
  rep_observation      TEXT,
  nearby_stores        TEXT,
  threat_type          TEXT DEFAULT 'none',
  threat_level         TEXT,
  competitor_name      TEXT,
  at_risk_skus         TEXT DEFAULT '[]',
  defensive_tp         TEXT,
  immediate_action     TEXT,
  escalate_to_manager  INTEGER DEFAULT 0,
  opportunity_flag     INTEGER DEFAULT 0,
  created_at           TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ci_retailer ON competitor_intel(retailer_id);
CREATE INDEX IF NOT EXISTS idx_ci_date     ON competitor_intel(date);

-- Gap 6: Farmer Visit Planner
CREATE TABLE IF NOT EXISTS growers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  grower_id           TEXT UNIQUE NOT NULL,
  farmer_name         TEXT NOT NULL,
  village             TEXT NOT NULL,
  tehsil              TEXT,
  district            TEXT NOT NULL,
  state               TEXT DEFAULT 'Maharashtra',
  farm_acres          REAL DEFAULT 2.0,
  crop_type           TEXT DEFAULT 'cotton',
  growth_stage        TEXT DEFAULT 'vegetative',
  last_product        TEXT,
  last_purchase_date  TEXT,
  nearest_retailer_id TEXT,
  distance_km         REAL,
  lat                 REAL,
  lng                 REAL,
  geocoded_at         TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_growers_district ON growers(district);
CREATE INDEX IF NOT EXISTS idx_growers_tehsil   ON growers(tehsil);

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grower_id       TEXT NOT NULL,
  campaign_name   TEXT,
  message_status  TEXT DEFAULT 'sent',
  sent_at         TEXT,
  opened_at       TEXT,
  clicked_at      TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wa_grower ON whatsapp_campaigns(grower_id);
""")
        await db.commit()

    print("[DB] Schema and migrations applied.")

    # ── Seed real dataset (idempotent) ────────────────────────────────────────
    _seed_real_data_sync()


def _seed_real_data_sync():
    """Synchronously seed real Syngenta dataset into DB if not already loaded."""
    if not DATASET_DIR.exists():
        print(f"[DB] Dataset not found at {DATASET_DIR} — skipping seed.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # ── Check if already seeded ──────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM retailers")
    existing_retailers = cur.fetchone()[0]
    if existing_retailers >= 1000:
        print(f"[DB] Real data already seeded ({existing_retailers} retailers). Skipping.")
        conn.close()
        return

    print(f"[DB] Seeding real dataset from {DATASET_DIR} ...")
    BATCH = 5000

    # 1. reps_territory.csv
    reps_path = DATASET_DIR / "reps_territory.csv"
    if reps_path.exists():
        with open(reps_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cur.execute("""
                    INSERT OR IGNORE INTO reps_territory
                      (rep_id, territory_id, territory_name, state, district, tehsil_list)
                    VALUES (?,?,?,?,?,?)
                """, (row["rep_id"], row["territory_id"], row.get("territory_name", ""),
                      row.get("state", ""), row.get("district", ""), row.get("tehsil_list", "")))
        conn.commit()
        print("[DB]   reps_territory seeded")

    # 2. retailers.csv — with synthetic human-readable name
    retailers_path = DATASET_DIR / "retailers.csv"
    if retailers_path.exists():
        SHOP_WORDS = ["Agro", "Krishi", "Farm", "Seeds", "Kisan", "Shakti", "Sona",
                      "Bharat", "India", "Green", "Prakash", "Raj", "Jai", "Shree"]
        SHOP_TYPES = ["Store", "Traders", "Suppliers", "Center", "Depot",
                      "Kendra", "Agency", "Mart", "Enterprises", "Point"]
        import hashlib

        with open(retailers_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rid = row["retailer_id"]
                # Generate a deterministic human-readable name from retailer_id
                h = int(hashlib.md5(rid.encode()).hexdigest(), 16)
                word = SHOP_WORDS[h % len(SHOP_WORDS)]
                stype = SHOP_TYPES[(h // len(SHOP_WORDS)) % len(SHOP_TYPES)]
                tehsil = row.get("tehsil", "").split("_T")[0]  # e.g. "Jalgaon"
                display_name = f"{tehsil} {word} {stype}" if tehsil else f"{word} {stype}"

                cur.execute("""
                    INSERT OR IGNORE INTO retailers
                      (retailer_id, retailer_name, territory_id, tehsil, state, district)
                    VALUES (?,?,?,?,?,?)
                """, (rid, display_name, row.get("territory_id", ""),
                      row.get("tehsil", ""), row.get("state", ""), row.get("district", "")))
        conn.commit()
        print("[DB]   retailers seeded with readable names")

    # 3. retailer_pos.csv
    pos_path = DATASET_DIR / "retailer_pos.csv"
    if pos_path.exists():
        batch = []
        with open(pos_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                batch.append((
                    row["retailer_id"], row.get("transaction_id", ""),
                    row.get("sku_id", ""), row.get("sku_name", ""),
                    int(float(row.get("sku_qty", 0) or 0)),
                    float(row.get("sku_price", 0) or 0),
                    row.get("transaction_date", "")
                ))
                if len(batch) >= BATCH:
                    cur.executemany("""
                        INSERT INTO retailer_pos
                          (retailer_id,transaction_id,sku_id,sku_name,sku_qty,sku_price,transaction_date)
                        VALUES (?,?,?,?,?,?,?)
                    """, batch)
                    batch = []
        if batch:
            cur.executemany("""
                INSERT INTO retailer_pos
                  (retailer_id,transaction_id,sku_id,sku_name,sku_qty,sku_price,transaction_date)
                VALUES (?,?,?,?,?,?,?)
            """, batch)
        conn.commit()
        print("[DB]   retailer_pos seeded")

    # 4. retailer_inventory_weekly.csv
    inv_path = DATASET_DIR / "retailer_inventory_weekly.csv"
    if inv_path.exists():
        batch = []
        with open(inv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                batch.append((
                    row["retailer_id"], row.get("sku_id", ""), row.get("sku_name", ""),
                    int(float(row.get("sku_qty", 0) or 0)), row.get("week_end_date", "")
                ))
                if len(batch) >= BATCH:
                    cur.executemany("""
                        INSERT INTO retailer_inventory
                          (retailer_id,sku_id,sku_name,sku_qty,week_end_date)
                        VALUES (?,?,?,?,?)
                    """, batch)
                    batch = []
        if batch:
            cur.executemany("""
                INSERT INTO retailer_inventory (retailer_id,sku_id,sku_name,sku_qty,week_end_date)
                VALUES (?,?,?,?,?)
            """, batch)
        conn.commit()
        print("[DB]   retailer_inventory seeded")

    # 5. retailer_visit_log.csv
    vlog_path = DATASET_DIR / "retailer_visit_log.csv"
    if vlog_path.exists():
        batch = []
        with open(vlog_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                batch.append((
                    row.get("rep_id", ""), row.get("visit_date", ""),
                    row.get("territory_id", ""), row.get("visit_tehsil", ""),
                    row.get("visit_type", ""), row.get("product_recommended", "")
                ))
        if batch:
            cur.executemany("""
                INSERT INTO historical_visit_log
                  (rep_id,visit_date,territory_id,visit_tehsil,visit_type,product_recommended)
                VALUES (?,?,?,?,?,?)
            """, batch)
        conn.commit()
        print("[DB]   historical_visit_log seeded")

    cur.execute("SELECT COUNT(*) FROM retailers")
    n = cur.fetchone()[0]
    print(f"[DB] Seed complete. {n} retailers in DB.")
    conn.close()
