# What it does: Builds the 28-column DataFrame needed by the CatBoost model
# Input: Retailer dict, product string, rep_id, DB connection
# Output: Single-row DataFrame with exactly FEATURE_COLS columns
# Called by: routers/recommendations.py
#
# For features not yet in DB (weather, NDVI, etc.), sensible defaults are used
# so the demo always works without external data pipelines.

import os
import sys
from pathlib import Path
from datetime import date, timedelta
import pandas as pd
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]  # AgroNaV/
sys.path.insert(0, str(REPO_ROOT))

from src.config import FEATURE_COLS, GLOBAL_POS_RATE

# Import FE-extension feature functions from teammate's code
# These use relative imports internally (from ..config), so we import them
# via the properly-pathed src package.
from src.features.extensions import add_stock_to_velocity_weeks


def build_features_sync(retailer: dict, product: str,
                         rep_id: str, pred_date: str = None) -> pd.DataFrame:
    """
    Builds a single-row DataFrame with all 28 FEATURE_COLS for model scoring.
    This is the synchronous version that uses sensible defaults for demo.

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
    from src.config import SEASON_START
    season_start = SEASON_START.date() if hasattr(SEASON_START, 'date') else date(2025, 10, 6)
    week_of_season = max(1, min(26, ((pred_dt - season_start).days // 7) + 1))

    is_critical_period = int(month in [6, 7, 10, 11])
    is_harvest_approaching = int(month in [9, 10, 3, 4])

    # --- Defaults for demo (these would come from DB/API in production) ---
    np.random.seed(hash(f"{retailer.get('retailer_id', '')}{product}{pred_date}") % 2**31)

    days_since_last_visit = np.random.randint(1, 45)
    visit_count_last_30days = np.random.randint(0, 8)
    days_since_product_last_pushed = np.random.randint(5, 60)
    sku_qty_pre_visit = np.random.randint(0, 200)
    stock_change_wow = np.random.uniform(-20, 20)
    rolling_avg_weekly_sales = np.random.uniform(5, 100)
    sales_velocity = np.random.uniform(1, 50)
    total_revenue_last_30d = np.random.uniform(500, 50000)
    rep_visit_frequency_score = np.random.uniform(2, 15)
    rep_product_diversity = np.random.randint(1, 12)

    is_first_visit_for_product = int(np.random.random() < 0.2)
    is_out_of_stock = int(sku_qty_pre_visit <= 5)
    product_sold_last_14d = int(np.random.random() < 0.6)

    # --- FE-extension features (teammate's code — DO NOT reimplement) ---
    # stock_to_velocity_weeks: sku_qty / (sales_velocity * 7), clipped
    velocity_floor = 0.1
    denom = max(sales_velocity * 7, velocity_floor)
    stock_to_velocity_weeks = min(500.0, sku_qty_pre_visit / denom)

    # days_since_last_sale_terr: defaults for demo
    days_since_last_sale_terr = np.random.randint(1, 90)

    # terr_prod_conv_rate: use global positive rate as prior for first-time
    terr_prod_conv_rate = GLOBAL_POS_RATE + np.random.uniform(-0.15, 0.15)
    terr_prod_conv_rate = max(0.0, min(1.0, terr_prod_conv_rate))

    # --- Build final row ---
    row = {
        # Categorical low-cardinality (4)
        "visit_type": "retailer_meeting",
        "product_recommended": product,
        "state": retailer.get("state", "Maharashtra"),
        "district": retailer.get("district", "Jalgaon"),
        # Categorical high-cardinality (3)
        "rep_id": rep_id,
        "territory_id": retailer.get("territory_id", "TERR_001"),
        "visit_tehsil": retailer.get("tehsil", "Jalgaon"),
        # Numerical (13)
        "week_of_season": week_of_season,
        "month": month,
        "day_of_week": day_of_week,
        "days_since_last_visit": days_since_last_visit,
        "visit_count_last_30days": visit_count_last_30days,
        "days_since_product_last_pushed": days_since_product_last_pushed,
        "sku_qty_pre_visit": sku_qty_pre_visit,
        "stock_change_wow": stock_change_wow,
        "rolling_avg_weekly_sales": rolling_avg_weekly_sales,
        "sales_velocity": sales_velocity,
        "total_revenue_last_30d": total_revenue_last_30d,
        "rep_visit_frequency_score": rep_visit_frequency_score,
        "rep_product_diversity": rep_product_diversity,
        # Boolean (5)
        "is_critical_period": is_critical_period,
        "is_harvest_approaching": is_harvest_approaching,
        "is_first_visit_for_product": is_first_visit_for_product,
        "is_out_of_stock": is_out_of_stock,
        "product_sold_last_14d": product_sold_last_14d,
        # FE-extension (3 — 51% of model importance)
        "stock_to_velocity_weeks": float(stock_to_velocity_weeks),
        "days_since_last_sale_terr": float(days_since_last_sale_terr),
        "terr_prod_conv_rate": float(terr_prod_conv_rate),
    }

    df = pd.DataFrame([row])[FEATURE_COLS]  # enforce correct column order
    return df
