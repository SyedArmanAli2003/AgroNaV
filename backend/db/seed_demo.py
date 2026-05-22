# What it does: Seeds demo users + real Syngenta dataset retailers on first startup
# Called by: main.py lifespan startup
# Safe to call every startup — checks user count first
# On Cloud Run: DB starts empty, this seeds all 4000 real retailers from CSV
# On local: DB already has data, just ensures demo users exist

import csv
import hashlib
import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
_BACKEND_DIR = Path(__file__).resolve().parent.parent   # /app/backend
_REPO_ROOT   = _BACKEND_DIR.parent                      # /app
_DATASET_DIR = _REPO_ROOT / "Syngenta_IITM_Hackathon_2026_dataset (1)"

# Name generator — deterministic human-readable names from retailer_id
_SHOP_WORDS = ["Agro","Krishi","Farm","Seeds","Kisan","Shakti","Sona","Bharat",
               "India","Green","Prakash","Raj","Jai","Shree","Narmada","Sai"]
_SHOP_TYPES = ["Store","Traders","Suppliers","Center","Depot",
               "Kendra","Agency","Mart","Enterprises","Point"]

def _make_retailer_name(rid: str, tehsil: str) -> str:
    h = int(hashlib.md5(rid.encode()).hexdigest(), 16)
    word  = _SHOP_WORDS[h % len(_SHOP_WORDS)]
    stype = _SHOP_TYPES[(h // len(_SHOP_WORDS)) % len(_SHOP_TYPES)]
    district = tehsil.split("_T")[0] if tehsil and "_T" in tehsil else (tehsil or "")
    return f"{district} {word} {stype}".strip() if district else f"{word} {stype}"


# ── Demo users (always seeded) ─────────────────────────────────────────────────
DEMO_USERS = [
    {
        "email": "admin@agronav.com",
        "name": "Admin User",
        "rep_id": "ADMIN_001",
        "password": "Admin1234!",
        "role": "admin",
        "district": "Jalgaon",
        "state": "Maharashtra",
        "territory_id": "TER_0203",
        "manager_id": None,
    },
    {
        "email": "manager@agronav.com",
        "name": "Priya Sharma",
        "rep_id": "MGR_001",
        "password": "Manager1234!",
        "role": "manager",
        "district": "Jalgaon",
        "state": "Maharashtra",
        "territory_id": "TER_0203",
        "manager_id": None,
    },
    {
        "email": "rep@agronav.com",
        "name": "Ali Khan",
        # REP_0203 is the actual Jalgaon rep in the dataset
        "rep_id": "REP_0203",
        "password": "Rep1234!",
        "role": "rep",
        "district": "Jalgaon",
        "state": "Maharashtra",
        "territory_id": "TER_0203",
        "manager_id": 2,
    },
]


async def seed_demo_data(db):
    """Seed demo users and real Syngenta retailers if DB is empty. Idempotent."""
    import bcrypt as _bcrypt

    # ── Check if already seeded ──────────────────────────────────────────────
    try:
        async with db.execute("SELECT COUNT(*) as c FROM users") as cursor:
            row = await cursor.fetchone()
            if row and row["c"] > 0:
                # Users exist — just make sure real retailers are there too
                async with db.execute("SELECT COUNT(*) as c FROM retailers") as rc:
                    rrow = await rc.fetchone()
                    if rrow and rrow["c"] >= 1000:
                        print("[seed] DB already seeded — skipping")
                        return
                    # Users exist but retailers not loaded — seed retailers only
                    print("[seed] Users found but retailers missing — seeding retailers")
                    await _seed_all_tables(db)
                    return
    except Exception as e:
        print(f"[seed] Could not check users table: {e}")
        return

    print("[seed] Fresh DB — seeding demo users + real dataset...")

    # ── Ensure extra columns exist ───────────────────────────────────────────
    for col_sql in [
        "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'rep'",
        "ALTER TABLE users ADD COLUMN manager_id INTEGER",
        "ALTER TABLE retailers ADD COLUMN contact_name TEXT",
        "ALTER TABLE retailers ADD COLUMN phone TEXT",
        "ALTER TABLE retailers ADD COLUMN manager_id INTEGER",
        "ALTER TABLE retailers ADD COLUMN is_active INTEGER DEFAULT 1",
        "ALTER TABLE retailers ADD COLUMN created_at TEXT DEFAULT (datetime('now'))",
    ]:
        try:
            await db.execute(col_sql)
        except Exception:
            pass  # column already exists

    # ── Seed demo users ──────────────────────────────────────────────────────
    for u in DEMO_USERS:
        pw_hash = _bcrypt.hashpw(u["password"].encode(), _bcrypt.gensalt()).decode()
        try:
            await db.execute(
                """INSERT OR IGNORE INTO users
                   (email, password_hash, name, rep_id, role,
                    district, state, territory_id, manager_id)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (u["email"], pw_hash, u["name"], u["rep_id"], u.get("role", "rep"),
                 u.get("district"), u.get("state"), u.get("territory_id"),
                 u.get("manager_id"))
            )
        except Exception as e:
            print(f"[seed] User insert error for {u['email']}: {e}")

    await db.commit()
    print(f"[seed] {len(DEMO_USERS)} demo users seeded")

    # ── Seed all real data tables ────────────────────────────────────────────
    await _seed_all_tables(db)


async def _seed_all_tables(db):
    """Seed all real Syngenta dataset tables (idempotent)."""

    # Check retailers count before proceeding
    async with db.execute("SELECT COUNT(*) as c FROM retailers") as rc:
        rrow = await rc.fetchone()
        if rrow and rrow["c"] >= 1000:
            print("[seed] Real retailers already seeded")
            return

    if not _DATASET_DIR.exists():
        print(f"[seed] WARNING: Dataset dir not found at {_DATASET_DIR}")
        print("[seed] Seeding 10 fallback retailers for demo mode")
        await _seed_fallback_retailers(db)
        return

    print(f"[seed] Loading Syngenta dataset from {_DATASET_DIR} ...")

    # 1. reps_territory
    reps_path = _DATASET_DIR / "reps_territory.csv"
    if reps_path.exists():
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS reps_territory (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              rep_id TEXT UNIQUE NOT NULL,
              territory_id TEXT, territory_name TEXT,
              state TEXT, district TEXT, tehsil_list TEXT
            );
        """)
        with open(str(reps_path), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    await db.execute(
                        """INSERT OR IGNORE INTO reps_territory
                           (rep_id, territory_id, territory_name, state, district, tehsil_list)
                           VALUES (?,?,?,?,?,?)""",
                        (row["rep_id"], row["territory_id"], row.get("territory_name",""),
                         row.get("state",""), row.get("district",""), row.get("tehsil_list",""))
                    )
                except Exception:
                    pass
        await db.commit()
        print("[seed]   reps_territory done")

    # 2. retailers.csv — 4000 real retailers with readable names
    retailers_path = _DATASET_DIR / "retailers.csv"
    if retailers_path.exists():
        with open(str(retailers_path), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            batch = []
            for row in reader:
                rid   = row["retailer_id"]
                name  = _make_retailer_name(rid, row.get("tehsil",""))
                batch.append((rid, name, row.get("territory_id",""),
                              row.get("tehsil",""), row.get("state",""), row.get("district","")))
                if len(batch) >= 500:
                    await db.executemany(
                        """INSERT OR IGNORE INTO retailers
                           (retailer_id, retailer_name, territory_id, tehsil, state, district)
                           VALUES (?,?,?,?,?,?)""", batch)
                    batch = []
            if batch:
                await db.executemany(
                    """INSERT OR IGNORE INTO retailers
                       (retailer_id, retailer_name, territory_id, tehsil, state, district)
                       VALUES (?,?,?,?,?,?)""", batch)
        await db.commit()
        print("[seed]   4000 retailers done")

    # 3. retailer_pos (large — 235K rows, batch)
    pos_path = _DATASET_DIR / "retailer_pos.csv"
    if pos_path.exists():
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS retailer_pos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              retailer_id TEXT NOT NULL, transaction_id TEXT,
              sku_id TEXT, sku_name TEXT,
              sku_qty INTEGER DEFAULT 0, sku_price REAL DEFAULT 0,
              transaction_date TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_pos_retailer ON retailer_pos(retailer_id);
            CREATE INDEX IF NOT EXISTS idx_pos_date ON retailer_pos(transaction_date);
        """)
        async with db.execute("SELECT COUNT(*) as c FROM retailer_pos") as cc:
            existing = (await cc.fetchone())["c"]
        if existing < 100000:
            with open(str(pos_path), encoding="utf-8") as f:
                reader = csv.DictReader(f)
                batch = []
                total = 0
                for row in reader:
                    batch.append((
                        row["retailer_id"], row.get("transaction_id",""),
                        row.get("sku_id",""), row.get("sku_name",""),
                        int(float(row.get("sku_qty",0) or 0)),
                        float(row.get("sku_price",0) or 0),
                        row.get("transaction_date","")
                    ))
                    if len(batch) >= 5000:
                        await db.executemany(
                            """INSERT INTO retailer_pos
                               (retailer_id,transaction_id,sku_id,sku_name,sku_qty,sku_price,transaction_date)
                               VALUES (?,?,?,?,?,?,?)""", batch)
                        total += len(batch)
                        batch = []
                if batch:
                    await db.executemany(
                        """INSERT INTO retailer_pos
                           (retailer_id,transaction_id,sku_id,sku_name,sku_qty,sku_price,transaction_date)
                           VALUES (?,?,?,?,?,?,?)""", batch)
                    total += len(batch)
            await db.commit()
            print(f"[seed]   {total} POS rows done")

    # 4. retailer_inventory_weekly (310K rows)
    inv_path = _DATASET_DIR / "retailer_inventory_weekly.csv"
    if inv_path.exists():
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS retailer_inventory (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              retailer_id TEXT NOT NULL,
              sku_id TEXT, sku_name TEXT,
              sku_qty INTEGER DEFAULT 0, week_end_date TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_inv_retailer ON retailer_inventory(retailer_id);
        """)
        async with db.execute("SELECT COUNT(*) as c FROM retailer_inventory") as cc:
            existing = (await cc.fetchone())["c"]
        if existing < 100000:
            with open(str(inv_path), encoding="utf-8") as f:
                reader = csv.DictReader(f)
                batch = []
                total = 0
                for row in reader:
                    batch.append((
                        row["retailer_id"], row.get("sku_id",""), row.get("sku_name",""),
                        int(float(row.get("sku_qty",0) or 0)), row.get("week_end_date","")
                    ))
                    if len(batch) >= 5000:
                        await db.executemany(
                            """INSERT INTO retailer_inventory
                               (retailer_id,sku_id,sku_name,sku_qty,week_end_date)
                               VALUES (?,?,?,?,?)""", batch)
                        total += len(batch)
                        batch = []
                if batch:
                    await db.executemany(
                        """INSERT INTO retailer_inventory
                           (retailer_id,sku_id,sku_name,sku_qty,week_end_date)
                           VALUES (?,?,?,?,?)""", batch)
                    total += len(batch)
            await db.commit()
            print(f"[seed]   {total} inventory rows done")

    # 5. historical_visit_log
    vlog_path = _DATASET_DIR / "retailer_visit_log.csv"
    if vlog_path.exists():
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS historical_visit_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              rep_id TEXT, visit_date TEXT, territory_id TEXT,
              visit_tehsil TEXT, visit_type TEXT, product_recommended TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_hvlog_rep ON historical_visit_log(rep_id);
        """)
        async with db.execute("SELECT COUNT(*) as c FROM historical_visit_log") as cc:
            existing = (await cc.fetchone())["c"]
        if existing < 1000:
            batch = []
            with open(str(vlog_path), encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    batch.append((
                        row.get("rep_id",""), row.get("visit_date",""),
                        row.get("territory_id",""), row.get("visit_tehsil",""),
                        row.get("visit_type",""), row.get("product_recommended","")
                    ))
            if batch:
                await db.executemany(
                    """INSERT INTO historical_visit_log
                       (rep_id,visit_date,territory_id,visit_tehsil,visit_type,product_recommended)
                       VALUES (?,?,?,?,?,?)""", batch)
            await db.commit()
            print(f"[seed]   {len(batch)} visit log rows done")

    print("[seed] Real dataset loaded successfully!")


async def _seed_fallback_retailers(db):
    """10 fallback retailers for when dataset CSVs are not available."""
    FALLBACK = [
        ("RTL_001","Sharma Krishi Kendra","TER_0203","Jalgaon_T001","Maharashtra","Jalgaon"),
        ("RTL_002","Kisan Agro Store","TER_0203","Jalgaon_T002","Maharashtra","Jalgaon"),
        ("RTL_003","Green Fields Traders","TER_0203","Jalgaon_T003","Maharashtra","Jalgaon"),
        ("RTL_004","Annapurna Beej Bhandar","TER_0203","Amalner_T001","Maharashtra","Jalgaon"),
        ("RTL_005","Jai Kisan Agri Center","TER_0203","Amalner_T002","Maharashtra","Jalgaon"),
        ("RTL_006","Narmada Agro Supplies","TER_0001","Patna_T001","Bihar","Patna"),
        ("RTL_007","Punjab Krishi Store","TER_0002","Hisar_T001","Haryana","Hisar"),
        ("RTL_008","Bharat Agro Kendra","TER_0002","Hisar_T002","Haryana","Hisar"),
        ("RTL_009","Sai Krishi Seva","TER_0203","Jalgaon_T004","Maharashtra","Jalgaon"),
        ("RTL_010","Mahalaxmi Agri Inputs","TER_0203","Bhusawal_T001","Maharashtra","Jalgaon"),
    ]
    for r in FALLBACK:
        try:
            await db.execute(
                """INSERT OR IGNORE INTO retailers
                   (retailer_id, retailer_name, territory_id, tehsil, state, district)
                   VALUES (?,?,?,?,?,?)""", r)
        except Exception:
            pass
    await db.commit()
    print("[seed] 10 fallback retailers seeded")
