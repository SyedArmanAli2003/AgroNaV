# What it does: Seeds demo users + retailers on first app startup if DB is empty
# Called by: main.py lifespan startup
# Safe to call every startup — checks user count first

import bcrypt as _bcrypt
from datetime import datetime

DEMO_RETAILERS = [
    {"retailer_id": "RTL_001", "retailer_name": "Sharma Krishi Kendra",
     "territory_id": "TERR_001", "tehsil": "Jalgaon", "district": "Jalgaon",
     "state": "Maharashtra", "contact_name": "Ramesh Sharma", "phone": "9876543210",
     "manager_id": 2},
    {"retailer_id": "RTL_002", "retailer_name": "Kisan Agro Store",
     "territory_id": "TERR_001", "tehsil": "Jalgaon", "district": "Jalgaon",
     "state": "Maharashtra", "contact_name": "Suresh Patel", "phone": "9876543211",
     "manager_id": 2},
    {"retailer_id": "RTL_003", "retailer_name": "Green Fields Traders",
     "territory_id": "TERR_001", "tehsil": "Amalner", "district": "Jalgaon",
     "state": "Maharashtra", "contact_name": "Vijay Desai", "phone": "9876543212",
     "manager_id": 2},
    {"retailer_id": "RTL_004", "retailer_name": "Annapurna Beej Bhandar",
     "territory_id": "TERR_001", "tehsil": "Amalner", "district": "Jalgaon",
     "state": "Maharashtra", "contact_name": "Sanjay Patil", "phone": "9876543213",
     "manager_id": 2},
    {"retailer_id": "RTL_005", "retailer_name": "Jai Kisan Agri Center",
     "territory_id": "TERR_001", "tehsil": "Dharangaon", "district": "Jalgaon",
     "state": "Maharashtra", "contact_name": "Pramod Jadhav", "phone": "9876543214",
     "manager_id": 2},
    {"retailer_id": "RTL_006", "retailer_name": "Narmada Agro Supplies",
     "territory_id": "TERR_002", "tehsil": "Hisar", "district": "Hisar",
     "state": "Haryana", "contact_name": "Deepak Yadav", "phone": "9876543215",
     "manager_id": 2},
    {"retailer_id": "RTL_007", "retailer_name": "Punjab Krishi Store",
     "territory_id": "TERR_002", "tehsil": "Hisar", "district": "Hisar",
     "state": "Haryana", "contact_name": "Gurpreet Singh", "phone": "9876543216",
     "manager_id": 2},
    {"retailer_id": "RTL_008", "retailer_name": "Bharat Agro Kendra",
     "territory_id": "TERR_002", "tehsil": "Barwala", "district": "Hisar",
     "state": "Haryana", "contact_name": "Harish Kumar", "phone": "9876543217",
     "manager_id": 2},
    {"retailer_id": "RTL_009", "retailer_name": "Sai Krishi Seva",
     "territory_id": "TERR_001", "tehsil": "Jalgaon", "district": "Jalgaon",
     "state": "Maharashtra", "contact_name": "Manoj More", "phone": "9876543218",
     "manager_id": 2},
    {"retailer_id": "RTL_010", "retailer_name": "Mahalaxmi Agri Inputs",
     "territory_id": "TERR_001", "tehsil": "Bhusawal", "district": "Jalgaon",
     "state": "Maharashtra", "contact_name": "Nilesh Chaudhari", "phone": "9876543219",
     "manager_id": 2},
]

DEMO_USERS = [
    {
        "email": "admin@agronav.com",
        "name": "Admin User",
        "rep_id": "ADMIN_001",
        "password": "Admin1234!",
        "role": "admin",
        "district": "Jalgaon",
        "state": "Maharashtra",
        "territory_id": "TERR_001",
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
        "territory_id": "TERR_001",
        "manager_id": None,
    },
    {
        "email": "rep@agronav.com",
        "name": "Ali Khan",
        "rep_id": "REP_0203",
        "password": "Rep1234!",
        "role": "rep",
        "district": "Jalgaon",
        "state": "Maharashtra",
        "territory_id": "TERR_001",
        "manager_id": 2,
    },
]


async def seed_demo_data(db):
    """Seed demo users and retailers if DB is empty. Idempotent."""
    try:
        async with db.execute("SELECT COUNT(*) as c FROM users") as cursor:
            row = await cursor.fetchone()
            if row and row["c"] > 0:
                print("[seed] DB already seeded — skipping")
                return
    except Exception as e:
        print(f"[seed] Could not check users table: {e}")
        return

    print("[seed] Seeding demo data...")

    # Ensure role column exists
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

    # Seed users
    for u in DEMO_USERS:
        pw = u["password"].encode("utf-8")
        pw_hash = _bcrypt.hashpw(pw, _bcrypt.gensalt()).decode("utf-8")
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

    # Seed retailers
    for r in DEMO_RETAILERS:
        try:
            await db.execute(
                """INSERT OR IGNORE INTO retailers
                   (retailer_id, retailer_name, territory_id, tehsil,
                    district, state, contact_name, phone, manager_id, is_active)
                   VALUES (?,?,?,?,?,?,?,?,?,1)""",
                (r["retailer_id"], r["retailer_name"], r["territory_id"],
                 r["tehsil"], r["district"], r["state"],
                 r.get("contact_name"), r.get("phone"), r.get("manager_id"))
            )
        except Exception as e:
            print(f"[seed] Retailer insert error for {r['retailer_id']}: {e}")

    await db.commit()
    print(f"[seed] Done — {len(DEMO_USERS)} users + {len(DEMO_RETAILERS)} retailers seeded")
