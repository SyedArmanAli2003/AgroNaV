import aiosqlite
import os
import csv
import sqlite3
from pathlib import Path

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agronav.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

DATASET_DIR = Path(__file__).resolve().parents[2] / "Syngenta_IITM_Hackathon_2026_dataset (1)"


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        await db.execute("PRAGMA journal_mode = WAL")
        yield db


async def init_tables():
    with open(SCHEMA_PATH, "r") as f:
        schema_sql = f.read()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.execute("PRAGMA journal_mode = WAL")
        await db.executescript(schema_sql)

        # ── Incremental column migrations ────────────────────────────────────
        migrations = [
            "ALTER TABLE users ADD COLUMN state TEXT",
            "ALTER TABLE users ADD COLUMN district TEXT",
            "ALTER TABLE users ADD COLUMN territory_id TEXT",
            "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'rep'",
            "ALTER TABLE users ADD COLUMN manager_id INTEGER",
            "ALTER TABLE users ADD COLUMN phone TEXT",
            "ALTER TABLE alerts ADD COLUMN outlet_name TEXT",
            "ALTER TABLE alerts ADD COLUMN timestamp TEXT",
            "ALTER TABLE alerts ADD COLUMN district TEXT",
            "ALTER TABLE visit_logs ADD COLUMN competitor_observation TEXT",
            "ALTER TABLE visit_logs ADD COLUMN retailer_name TEXT",
            "ALTER TABLE visit_logs ADD COLUMN retailer_id TEXT",
            "ALTER TABLE visit_logs ADD COLUMN visit_type TEXT",
            "ALTER TABLE visit_logs ADD COLUMN product_discussed TEXT",
            "ALTER TABLE visit_logs ADD COLUMN order_value INTEGER DEFAULT 0",
            "ALTER TABLE visit_logs ADD COLUMN outcome_score INTEGER DEFAULT 0",
            "ALTER TABLE visit_logs ADD COLUMN rejection_reason TEXT",
            "ALTER TABLE visit_logs ADD COLUMN submitted_at TEXT",
            "ALTER TABLE growers ADD COLUMN lat REAL",
            "ALTER TABLE growers ADD COLUMN lng REAL",
            "ALTER TABLE growers ADD COLUMN geocoded_at TEXT",
            "ALTER TABLE growers ADD COLUMN distance_km REAL",
            "ALTER TABLE growers ADD COLUMN nearest_retailer_id TEXT",
            "ALTER TABLE retailers ADD COLUMN lat REAL",
            "ALTER TABLE retailers ADD COLUMN lng REAL",
            "ALTER TABLE retailers ADD COLUMN geocoded_at TEXT",
        ]
        for sql in migrations:
            try:
                await db.execute(sql)
            except Exception:
                pass

        await db.commit()

    print("[DB] Schema and migrations applied.")

    _seed_real_data_sync()


def _seed_real_data_sync():
    if not DATASET_DIR.exists():
        print(f"[DB] Dataset not found at {DATASET_DIR} — skipping seed.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

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

    # 2. retailers.csv
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
                h = int(hashlib.md5(rid.encode()).hexdigest(), 16)
                word = SHOP_WORDS[h % len(SHOP_WORDS)]
                stype = SHOP_TYPES[(h // len(SHOP_WORDS)) % len(SHOP_TYPES)]
                tehsil = row.get("tehsil", "").split("_T")[0]
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
