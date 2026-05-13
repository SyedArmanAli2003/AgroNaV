# What it does: Seeds the database with demo data (8 outlets, 1 rep, 4 alerts, 6 weekly stats)
# Input: None (uses agronav.db)
# Output: Populated database tables with demo data
# Called by: Run directly: python db/seed.py, or from routers/demo.py

import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agronav.db")


def _days_ago(n):
    """Return a YYYY-MM-DD string for n days before today."""
    return (datetime.now() - timedelta(days=n)).strftime("%Y-%m-%d")


def _fallback_score(outlet):
    """Calculate fallback priority score for an outlet (same formula as services/scoring.py)."""
    pest = 35 if outlet["has_pest_alert"] else 0
    stock = max(0, int(30 * (1 - outlet["stock_days_remaining"] / 10)))
    days_since = (datetime.now() - datetime.strptime(outlet["last_visit_date"], "%Y-%m-%d")).days
    recency = min(20, int(20 * days_since / 14))
    spike = 15 if outlet["sales_spike"] else 0
    score = pest + stock + recency + spike
    return score


def seed():
    """Delete existing rows and insert exact demo data. Idempotent."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Clear existing data
    for table in ["visit_logs", "alerts", "nba_cache", "weekly_stats", "outlets", "reps"]:
        cur.execute(f"DELETE FROM {table}")

    # ── Rep ──
    cur.execute(
        "INSERT INTO reps (id, name, territory, district) VALUES (?, ?, ?, ?)",
        (1, "Arjun Kumar", "Nalgonda", "Nalgonda")
    )

    # ── Outlets (8 rows) ──
    outlets = [
        {
            "id": 1, "name": "Raju Agro Stores", "type": "retailer",
            "owner_name": "Raju Patel", "district": "Nalgonda",
            "lat": 17.0575, "lng": 79.2671,
            "last_visit_date": _days_ago(9), "stock_days_remaining": 2,
            "has_pest_alert": 1, "sales_spike": 0, "crop_stage": None
        },
        {
            "id": 2, "name": "Krishna Seeds & Agri", "type": "retailer",
            "owner_name": "Krishna Rao", "district": "Nalgonda",
            "lat": 17.0612, "lng": 79.2710,
            "last_visit_date": _days_ago(5), "stock_days_remaining": 3,
            "has_pest_alert": 1, "sales_spike": 0, "crop_stage": None
        },
        {
            "id": 3, "name": "Lakshmi Farm Supplies", "type": "retailer",
            "owner_name": "Lakshmi Devi", "district": "Nalgonda",
            "lat": 17.0490, "lng": 79.2580,
            "last_visit_date": _days_ago(4), "stock_days_remaining": 8,
            "has_pest_alert": 0, "sales_spike": 1, "crop_stage": None
        },
        {
            "id": 4, "name": "Srinivas Agro Center", "type": "retailer",
            "owner_name": "Srinivas Reddy", "district": "Nalgonda",
            "lat": 17.0650, "lng": 79.2800,
            "last_visit_date": _days_ago(6), "stock_days_remaining": 6,
            "has_pest_alert": 1, "sales_spike": 0, "crop_stage": None
        },
        {
            "id": 5, "name": "Farmer Venkat Reddy", "type": "farmer",
            "owner_name": "Venkat Reddy", "district": "Nalgonda",
            "lat": 17.0420, "lng": 79.2500,
            "last_visit_date": _days_ago(7), "stock_days_remaining": 4,
            "has_pest_alert": 0, "sales_spike": 0, "crop_stage": "boll_formation"
        },
        {
            "id": 6, "name": "Farmer Ramesh Naidu", "type": "farmer",
            "owner_name": "Ramesh Naidu", "district": "Nalgonda",
            "lat": 17.0700, "lng": 79.2900,
            "last_visit_date": _days_ago(3), "stock_days_remaining": 10,
            "has_pest_alert": 0, "sales_spike": 0, "crop_stage": "boll_formation"
        },
        {
            "id": 7, "name": "Bharat Agro Mart", "type": "retailer",
            "owner_name": "Bharat Singh", "district": "Nalgonda",
            "lat": 17.0550, "lng": 79.2750,
            "last_visit_date": _days_ago(2), "stock_days_remaining": 12,
            "has_pest_alert": 0, "sales_spike": 0, "crop_stage": None
        },
        {
            "id": 8, "name": "Sri Venkateswara Agri", "type": "retailer",
            "owner_name": "Suresh Kumar", "district": "Nalgonda",
            "lat": 17.0480, "lng": 79.2620,
            "last_visit_date": _days_ago(5), "stock_days_remaining": 9,
            "has_pest_alert": 0, "sales_spike": 0, "crop_stage": None
        },
    ]

    for o in outlets:
        cur.execute(
            """INSERT INTO outlets
               (id, name, type, owner_name, district, lat, lng,
                last_visit_date, stock_days_remaining, has_pest_alert,
                sales_spike, crop_stage)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (o["id"], o["name"], o["type"], o["owner_name"], o["district"],
             o["lat"], o["lng"], o["last_visit_date"], o["stock_days_remaining"],
             o["has_pest_alert"], o["sales_spike"], o["crop_stage"])
        )

    # ── Alerts (4 rows) ──
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    alerts_data = [
        (None, "pest_outbreak", "Spotted bollworm outbreak in Nalgonda — 5 retailers not reordered insecticide", "high", now),
        (1, "stock_out", "Raju Agro Stores — stock runs out in 2 days", "high", now),
        (3, "sales_spike", "Lakshmi Farm Supplies — sales up 40% vs last 4 weeks", "medium", now),
        (None, "crop_stage", "Cotton at boll formation stage — insecticide window open this week", "info", now),
    ]
    for a in alerts_data:
        cur.execute(
            "INSERT INTO alerts (outlet_id, type, message, severity, created_at) VALUES (?, ?, ?, ?, ?)",
            a
        )

    # ── Weekly stats (6 rows) ──
    weekly_data = [
        ("Week 1", 22, 8, 36.0),
        ("Week 2", 25, 11, 44.0),
        ("Week 3", 24, 12, 50.0),
        ("Week 4", 26, 14, 53.8),
        ("Week 5", 28, 17, 60.7),
        ("Week 6", 28, 18, 64.3),
    ]
    for w in weekly_data:
        cur.execute(
            "INSERT INTO weekly_stats (week_label, visits, accepted, acceptance_rate) VALUES (?, ?, ?, ?)",
            w
        )

    conn.commit()

    # Print each outlet with fallback score
    print("\n=== Seeded outlets with fallback scores ===")
    for o in outlets:
        score = _fallback_score(o)
        label = "HIGH" if score >= 65 else ("MEDIUM" if score >= 40 else "LOW")
        print(f"  {o['id']}. {o['name']:30s} | score={score:3d} | {label}")

    print(f"\nInserted: 1 rep, {len(outlets)} outlets, {len(alerts_data)} alerts, {len(weekly_data)} weekly stats")
    print("Seed complete.")

    conn.close()


if __name__ == "__main__":
    seed()
