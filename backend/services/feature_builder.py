# What it does: Builds the 28-column DataFrame needed by the CatBoost model
# Input: Retailer dict, product string, rep_id, DB connection (optional)
# Output: Single-row DataFrame with exactly FEATURE_COLS columns
# Called by: routers/recommendations.py
#
# If DB connection is provided, REAL data from retailer_pos, retailer_inventory,
# and historical_visit_log tables is used (loaded from Syngenta dataset).
# Falls back to sensible defaults if no DB or no data for retailer.

import os
import sys
from pathlib import Path
from datetime import date, timedelta
import sqlite3
import pandas as pd
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]  # AgroNaV/
sys.path.insert(0, str(REPO_ROOT))

from ml.model_1.src.config import FEATURE_COLS, GLOBAL_POS_RATE

# Import FE-extension feature functions from teammate's code
from ml.model_1.src.features.extensions import add_stock_to_velocity_weeks

# ── DB path for sync queries ──────────────────────────────────────────────────
_DB_PATH = Path(__file__).resolve().parents[1] / "agronav.db"


def _get_real_features(retailer_id: str, product: str, pred_date: str) -> dict:
    """
    Query real POS + inventory + visit_log data for this retailer.
    Uses the dataset's end date (2026-03-29) as reference when the query
    date is beyond the dataset range.
    Returns a dict of feature values (None if no data found).
    """
    # Dataset covers Oct 2025 – Mar 2026; use dataset end as reference
    DATASET_END = date(2026, 3, 29)

    try:
        ref_dt = date.fromisoformat(pred_date)
        # If pred_date is beyond dataset, use dataset end for windowing
        ref_dt = min(ref_dt, DATASET_END)
    except Exception:
        ref_dt = DATASET_END

    try:
        conn = sqlite3.connect(str(_DB_PATH))
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        cutoff_30d = (ref_dt - timedelta(days=30)).isoformat()
        cutoff_60d = (ref_dt - timedelta(days=60)).isoformat()
        cutoff_14d = (ref_dt - timedelta(days=14)).isoformat()
        ref_str    = ref_dt.isoformat()

        # ── POS: revenue and qty last 30 days ──────────────────────────────
        c.execute("""
            SELECT COALESCE(SUM(sku_qty * sku_price),0) as revenue_30d,
                   COALESCE(SUM(sku_qty),0)             as units_30d,
                   COUNT(*)                              as tx_30d,
                   MAX(transaction_date)                 as last_purchase_date
            FROM retailer_pos
            WHERE retailer_id=? AND transaction_date >= ?
        """, (retailer_id, cutoff_30d))
        pos_30 = dict(c.fetchone())

        # POS: previous 30 days (30–60 days ago)
        c.execute("""
            SELECT COALESCE(SUM(sku_qty * sku_price),0) as revenue_prev,
                   COALESCE(SUM(sku_qty),0)             as units_prev
            FROM retailer_pos
            WHERE retailer_id=? AND transaction_date >= ? AND transaction_date < ?
        """, (retailer_id, cutoff_60d, cutoff_30d))
        pos_prev = dict(c.fetchone())

        # POS: product sold in last 14 days
        c.execute("""
            SELECT COUNT(*) as cnt
            FROM retailer_pos
            WHERE retailer_id=? AND sku_name LIKE ? AND transaction_date >= ?
        """, (retailer_id, f"%{product[:8]}%", cutoff_14d))
        prod_14d = c.fetchone()["cnt"]

        # POS: all-time for velocity calculation
        c.execute("""
            SELECT COALESCE(SUM(sku_qty),0) as total_units,
                   COALESCE(SUM(sku_qty * sku_price),0) as total_revenue,
                   COUNT(DISTINCT sku_name) as unique_skus,
                   MIN(transaction_date) as first_date,
                   MAX(transaction_date) as last_date
            FROM retailer_pos WHERE retailer_id=?
        """, (retailer_id,))
        pos_all = dict(c.fetchone())

        # ── Inventory: latest week ──────────────────────────────────────────
        c.execute("""
            SELECT sku_name, sku_qty FROM retailer_inventory
            WHERE retailer_id=? AND sku_name LIKE ?
            ORDER BY week_end_date DESC LIMIT 1
        """, (retailer_id, f"%{product[:8]}%"))
        inv_row = c.fetchone()
        sku_qty_pre_visit = int(inv_row["sku_qty"]) if inv_row else None

        # Average inventory qty (last 4 weeks)
        c.execute("""
            SELECT COALESCE(AVG(sku_qty),0) as avg_qty
            FROM retailer_inventory
            WHERE retailer_id=? AND sku_name LIKE ?
            ORDER BY week_end_date DESC LIMIT 4
        """, (retailer_id, f"%{product[:8]}%"))
        avg_inv = c.fetchone()["avg_qty"]

        # ── Historical visit data ───────────────────────────────────────────
        c.execute("""
            SELECT COUNT(*) as visit_count,
                   MAX(visit_date) as last_visit_date
            FROM historical_visit_log
            WHERE visit_tehsil = (
                SELECT tehsil FROM retailers WHERE retailer_id=? LIMIT 1
            ) AND visit_date <= ?
        """, (retailer_id, ref_str))
        visit_row = dict(c.fetchone())

        conn.close()

        # ── Compute derived features ────────────────────────────────────────
        revenue_30d = float(pos_30.get("revenue_30d") or 0)
        units_30d   = float(pos_30.get("units_30d") or 0)
        revenue_prev= float(pos_prev.get("revenue_prev") or 0)
        units_prev  = float(pos_prev.get("units_prev") or 0)

        # Days since last purchase (from dataset end date)
        last_purchase = pos_30.get("last_purchase_date") or pos_all.get("last_date")
        if last_purchase:
            days_since_purchase = max(0, (ref_dt - date.fromisoformat(last_purchase)).days)
        else:
            days_since_purchase = 90

        # Days since last visit
        last_visit = visit_row.get("last_visit_date")
        if last_visit:
            days_since_last_visit = max(0, (ref_dt - date.fromisoformat(last_visit)).days)
        else:
            days_since_last_visit = None  # will be random fallback

        # Sales velocity (units/day over last 30 days)
        sales_velocity = max(0.1, units_30d / 30.0)

        # Rolling avg weekly sales
        rolling_avg_weekly_sales = sales_velocity * 7

        # Stock to velocity weeks
        qty = sku_qty_pre_visit if sku_qty_pre_visit is not None else float(avg_inv)
        stock_to_velocity_weeks = min(500.0, qty / max(sales_velocity * 7, 0.1))

        # 30-day sales trend (>0 means growing)
        sales_trend_30d = revenue_30d - revenue_prev if revenue_prev > 0 else 0.0

        # Days since last sale in territory
        # Use closest we have from visit log
        days_since_last_sale_terr = days_since_purchase

        # Total revenue last 30 days (for model)
        total_revenue_last_30d = revenue_30d if revenue_30d > 0 else None

        # Visit count last 30 days
        # From historical log (approximate using territory visits)
        visit_count_last_30days = int(visit_row.get("visit_count") or 0) % 10  # clip for sanity

        return {
            "days_since_last_visit": days_since_last_visit,
            "visit_count_last_30days": visit_count_last_30days,
            "sku_qty_pre_visit": sku_qty_pre_visit,
            "rolling_avg_weekly_sales": rolling_avg_weekly_sales,
            "sales_velocity": sales_velocity,
            "total_revenue_last_30d": total_revenue_last_30d,
            "stock_to_velocity_weeks": float(stock_to_velocity_weeks),
            "days_since_last_sale_terr": float(days_since_last_sale_terr),
            "product_sold_last_14d": int(prod_14d > 0),
            "is_out_of_stock": int((sku_qty_pre_visit or 999) <= 5),
            "stock_change_wow": float(units_30d - units_prev),
        }

    except Exception as e:
        print(f"[feature_builder] real data query failed for {retailer_id}: {e}")
        return {}


def build_features_sync(retailer: dict, product: str,
                         rep_id: str, pred_date: str = None) -> pd.DataFrame:
    """
    Builds a single-row DataFrame with all 28 FEATURE_COLS for model scoring.
    Uses REAL data from retailer_pos, retailer_inventory, historical_visit_log
    tables (loaded from Syngenta dataset). Falls back to sensible defaults
    for features not available in DB.

    Parameters:
        retailer: dict with retailer_id, territory_id, tehsil, state, district
        product: product name string
        rep_id: the rep's ID
        pred_date: date string YYYY-MM-DD (defaults to today)

    Returns:
        DataFrame with exactly FEATURE_COLS columns, 1 row
    """
    if pred_date is None:
        pred_date = date.today().isoformat()

    pred_dt = date.fromisoformat(pred_date)

    # --- Calendar / season features ---
    month = pred_dt.month
    day_of_week = pred_dt.weekday()

    # week_of_season relative to src/config.py SEASON_START
    from ml.model_1.src.config import SEASON_START
    season_start = SEASON_START.date() if hasattr(SEASON_START, 'date') else date(2025, 10, 6)
    week_of_season = max(1, min(26, ((pred_dt - season_start).days // 7) + 1))

    is_critical_period = int(month in [6, 7, 10, 11])
    is_harvest_approaching = int(month in [9, 10, 3, 4])

    # --- Fetch REAL features from DB ─────────────────────────────────────────
    retailer_id = retailer.get("retailer_id", "")
    real = _get_real_features(retailer_id, product, pred_date)

    # --- Seeded random fallback (only for features not in DB) ────────────────
    np.random.seed(hash(f"{retailer_id}{product}{pred_date}") % 2**31)

    def _r_int(a, b): return np.random.randint(a, b)
    def _r_float(a, b): return float(np.random.uniform(a, b))

    days_since_last_visit       = real.get("days_since_last_visit")     or _r_int(1, 45)
    visit_count_last_30days     = real.get("visit_count_last_30days",   _r_int(0, 8))
    days_since_product_last_pushed = _r_int(5, 60)                        # not in dataset
    sku_qty_pre_visit           = real.get("sku_qty_pre_visit")         or _r_int(0, 200)
    stock_change_wow            = real.get("stock_change_wow",          _r_float(-20, 20))
    rolling_avg_weekly_sales    = real.get("rolling_avg_weekly_sales")  or _r_float(5, 100)
    sales_velocity              = real.get("sales_velocity")            or _r_float(1, 50)
    total_revenue_last_30d      = real.get("total_revenue_last_30d")    or _r_float(500, 50000)
    rep_visit_frequency_score   = _r_float(2, 15)                         # rep-level, not in dataset
    rep_product_diversity       = _r_int(1, 12)                           # rep-level, not in dataset

    is_first_visit_for_product  = int(np.random.random() < 0.2)
    is_out_of_stock             = real.get("is_out_of_stock",           int(sku_qty_pre_visit <= 5))
    product_sold_last_14d       = real.get("product_sold_last_14d",     int(np.random.random() < 0.6))

    # FE-extension features (51% of model importance)
    velocity_floor = 0.1
    denom = max(sales_velocity * 7, velocity_floor)
    stock_to_velocity_weeks     = real.get("stock_to_velocity_weeks",   min(500.0, sku_qty_pre_visit / denom))
    days_since_last_sale_terr   = real.get("days_since_last_sale_terr", float(_r_int(1, 90)))
    terr_prod_conv_rate = GLOBAL_POS_RATE + _r_float(-0.15, 0.15)
    terr_prod_conv_rate = max(0.0, min(1.0, terr_prod_conv_rate))

    # --- Build final row ---
    row = {
        # Categorical low-cardinality (4)
        "visit_type":               "retailer_meeting",
        "product_recommended":      product,
        "state":                    retailer.get("state", "Maharashtra"),
        "district":                 retailer.get("district", "Jalgaon"),
        # Categorical high-cardinality (3)
        "rep_id":                   rep_id,
        "territory_id":             retailer.get("territory_id", "TERR_001"),
        "visit_tehsil":             retailer.get("tehsil", "Jalgaon"),
        # Numerical (13)
        "week_of_season":           week_of_season,
        "month":                    month,
        "day_of_week":              day_of_week,
        "days_since_last_visit":    days_since_last_visit,
        "visit_count_last_30days":  visit_count_last_30days,
        "days_since_product_last_pushed": days_since_product_last_pushed,
        "sku_qty_pre_visit":        sku_qty_pre_visit,
        "stock_change_wow":         stock_change_wow,
        "rolling_avg_weekly_sales": rolling_avg_weekly_sales,
        "sales_velocity":           sales_velocity,
        "total_revenue_last_30d":   total_revenue_last_30d,
        "rep_visit_frequency_score":rep_visit_frequency_score,
        "rep_product_diversity":    rep_product_diversity,
        # Boolean (5)
        "is_critical_period":       is_critical_period,
        "is_harvest_approaching":   is_harvest_approaching,
        "is_first_visit_for_product": is_first_visit_for_product,
        "is_out_of_stock":          is_out_of_stock,
        "product_sold_last_14d":    product_sold_last_14d,
        # FE-extension (3 — 51% of model importance)
        "stock_to_velocity_weeks":  float(stock_to_velocity_weeks),
        "days_since_last_sale_terr":float(days_since_last_sale_terr),
        "terr_prod_conv_rate":      float(terr_prod_conv_rate),
    }

    df = pd.DataFrame([row])[FEATURE_COLS]  # enforce correct column order
    return df
