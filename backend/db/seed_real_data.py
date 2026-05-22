#!/usr/bin/env python3
"""
seed_real_data.py — Load Syngenta hackathon dataset into agronav.db

Tables populated:
  retailers        ← retailers.csv + retailers.csv location data
  retailer_pos     ← retailer_pos.csv  (POS transactions)
  retailer_inventory ← retailer_inventory_weekly.csv
  retailer_visit_log ← retailer_visit_log.csv (historical visits)
  reps_territory   ← reps_territory.csv

Run from: backend/  (so DB path is correct)
    python db/seed_real_data.py
"""

import os
import sys
import sqlite3
import csv
import ast
import json
from pathlib import Path
from datetime import datetime

# ── Paths ──────────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent        # backend/
REPO_ROOT   = BACKEND_DIR.parent                            # AgroNaV/
DATASET_DIR = REPO_ROOT / "Syngenta_IITM_Hackathon_2026_dataset (1)"
DB_PATH     = BACKEND_DIR / "agronav.db"

print(f"[seed] Dataset dir : {DATASET_DIR}")
print(f"[seed] DB path     : {DB_PATH}")

if not DATASET_DIR.exists():
    print(f"[seed] ERROR: dataset folder not found at {DATASET_DIR}")
    sys.exit(1)

conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ── 0. Create new tables if missing ──────────────────────────────────────────
cur.executescript("""
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

CREATE INDEX IF NOT EXISTS idx_hvlog_rep      ON historical_visit_log(rep_id);
CREATE INDEX IF NOT EXISTS idx_hvlog_date     ON historical_visit_log(visit_date);

CREATE TABLE IF NOT EXISTS reps_territory (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rep_id         TEXT UNIQUE NOT NULL,
  territory_id   TEXT,
  territory_name TEXT,
  state          TEXT,
  district       TEXT,
  tehsil_list    TEXT
);
""")
conn.commit()
print("[seed] Tables ready")

# ── 1. Load reps_territory.csv ───────────────────────────────────────────────
print("[seed] Loading reps_territory.csv …")
reps_path = DATASET_DIR / "reps_territory.csv"
inserted_reps = 0
with open(reps_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        cur.execute("""
            INSERT OR IGNORE INTO reps_territory
              (rep_id, territory_id, territory_name, state, district, tehsil_list)
            VALUES (?,?,?,?,?,?)
        """, (row["rep_id"], row["territory_id"], row.get("territory_name",""),
              row.get("state",""), row.get("district",""), row.get("tehsil_list","")))
        inserted_reps += cur.rowcount
conn.commit()
print(f"[seed]   -> {inserted_reps} reps inserted")

# ── 2. Load retailers.csv into retailers table ───────────────────────────────
print("[seed] Loading retailers.csv ...")
retailers_path = DATASET_DIR / "retailers.csv"
inserted_ret = 0

# Check actual columns in DB
cur.execute("PRAGMA table_info(retailers)")
ret_cols = {r[1] for r in cur.fetchall()}
print(f"[seed]   retailers table columns: {ret_cols}")

with open(retailers_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        cur.execute("""
            INSERT OR IGNORE INTO retailers
              (retailer_id, retailer_name, territory_id, tehsil, state, district)
            VALUES (?,?,?,?,?,?)
        """, (
            row["retailer_id"],
            row.get("retailer_name", row["retailer_id"]),
            row.get("territory_id",""),
            row.get("tehsil",""),
            row.get("state",""),
            row.get("district","")
        ))
        inserted_ret += cur.rowcount
conn.commit()
print(f"[seed]   -> {inserted_ret} retailers inserted")

# ── 3. Load retailer_pos.csv ─────────────────────────────────────────────────
print("[seed] Loading retailer_pos.csv (large file, please wait) …")
pos_path = DATASET_DIR / "retailer_pos.csv"
batch, BATCH_SIZE = [], 5000
inserted_pos = 0
with open(pos_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        batch.append((
            row["retailer_id"],
            row.get("transaction_id",""),
            row.get("sku_id",""),
            row.get("sku_name",""),
            int(float(row.get("sku_qty",0) or 0)),
            float(row.get("sku_price",0) or 0),
            row.get("transaction_date","")
        ))
        if len(batch) >= BATCH_SIZE:
            cur.executemany("""
                INSERT INTO retailer_pos
                  (retailer_id, transaction_id, sku_id, sku_name, sku_qty, sku_price, transaction_date)
                VALUES (?,?,?,?,?,?,?)
            """, batch)
            inserted_pos += len(batch)
            batch = []
            print(f"[seed]   … {inserted_pos} POS rows so far")

if batch:
    cur.executemany("""
        INSERT INTO retailer_pos
          (retailer_id, transaction_id, sku_id, sku_name, sku_qty, sku_price, transaction_date)
        VALUES (?,?,?,?,?,?,?)
    """, batch)
    inserted_pos += len(batch)

conn.commit()
print(f"[seed]   -> {inserted_pos} POS transactions inserted")

# ── 4. Load retailer_inventory_weekly.csv ─────────────────────────────────────
print("[seed] Loading retailer_inventory_weekly.csv (large file) …")
inv_path = DATASET_DIR / "retailer_inventory_weekly.csv"
batch = []
inserted_inv = 0
with open(inv_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        batch.append((
            row["retailer_id"],
            row.get("sku_id",""),
            row.get("sku_name",""),
            int(float(row.get("sku_qty",0) or 0)),
            row.get("week_end_date","")
        ))
        if len(batch) >= BATCH_SIZE:
            cur.executemany("""
                INSERT INTO retailer_inventory
                  (retailer_id, sku_id, sku_name, sku_qty, week_end_date)
                VALUES (?,?,?,?,?)
            """, batch)
            inserted_inv += len(batch)
            batch = []
            print(f"[seed]   … {inserted_inv} inventory rows so far")

if batch:
    cur.executemany("""
        INSERT INTO retailer_inventory
          (retailer_id, sku_id, sku_name, sku_qty, week_end_date)
        VALUES (?,?,?,?,?)
    """, batch)
    inserted_inv += len(batch)

conn.commit()
print(f"[seed]   -> {inserted_inv} inventory rows inserted")

# ── 5. Load retailer_visit_log.csv ───────────────────────────────────────────
print("[seed] Loading retailer_visit_log.csv …")
vlog_path = DATASET_DIR / "retailer_visit_log.csv"
batch = []
inserted_vlog = 0
with open(vlog_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        batch.append((
            row.get("rep_id",""),
            row.get("visit_date",""),
            row.get("territory_id",""),
            row.get("visit_tehsil",""),
            row.get("visit_type",""),
            row.get("product_recommended","")
        ))

if batch:
    cur.executemany("""
        INSERT INTO historical_visit_log
          (rep_id, visit_date, territory_id, visit_tehsil, visit_type, product_recommended)
        VALUES (?,?,?,?,?,?)
    """, batch)
    inserted_vlog = len(batch)

conn.commit()
print(f"[seed]   -> {inserted_vlog} historical visit rows inserted")

# ── 6. Summary ────────────────────────────────────────────────────────────────
print("\n[seed] OK Real dataset loaded successfully!")
print(f"  Retailers          : {inserted_ret:,}")
print(f"  Reps/Territories   : {inserted_reps:,}")
print(f"  POS transactions   : {inserted_pos:,}")
print(f"  Inventory records  : {inserted_inv:,}")
print(f"  Historical visits  : {inserted_vlog:,}")

conn.close()
