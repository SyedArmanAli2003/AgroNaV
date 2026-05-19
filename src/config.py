from pathlib import Path
import pandas as pd

SEED = 42
SEASON_START = pd.Timestamp("2025-10-06")
SPLIT_CUTOFF = pd.Timestamp("2026-02-20")
GLOBAL_POS_RATE = 0.651

DATA_RAW = Path("data")
DATA_PROCESSED = Path("data/processed")
REPORTS = Path("reports")
MODELS = Path("models")

ID_COLS = ["rep_id", "territory_id", "visit_tehsil"]

CAT_LOWCARD = ["visit_type", "product_recommended", "state", "district"]
CAT_HIGHCARD = ID_COLS

NUM_COLS = [
    "week_of_season", "month", "day_of_week",
    "days_since_last_visit", "visit_count_last_30days",
    "days_since_product_last_pushed",
    "sku_qty_pre_visit", "stock_change_wow",
    "rolling_avg_weekly_sales", "sales_velocity", "total_revenue_last_30d",
    "rep_visit_frequency_score", "rep_product_diversity",
]

BOOL_COLS = [
    "is_critical_period", "is_harvest_approaching",
    "is_first_visit_for_product", "is_out_of_stock", "product_sold_last_14d",
]

FE_EXT_COLS = [
    "stock_to_velocity_weeks", "days_since_last_sale_terr", "terr_prod_conv_rate",
]

SKEWED_LOG1P = [
    "total_revenue_last_30d", "sales_velocity", "rolling_avg_weekly_sales",
    "sku_qty_pre_visit", "visit_count_last_30days", "days_since_last_visit",
]

SENTINEL_NEG1 = ["days_since_last_visit", "days_since_product_last_pushed"]

COLLINEAR_DROP_FOR_LR = "rolling_avg_weekly_sales"
