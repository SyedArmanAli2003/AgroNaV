# What it does: Loads Model 2 (XGBoost + IsolationForest) and provides inference
# Model 2 = XGBClassifier Pipeline for retailer priority scoring
#          + IsolationForest for demand anomaly detection
# Input: Retailer feature dict (from model_schema.json)
# Output: priority_probability (float), justification_triggers, focus_sku
# Called by: routers/model_inference.py and as fallback in routers/recommendations.py

import os
import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]  # AgroNaV/
MODEL2_DIR = REPO_ROOT / "ml" / "model_2" / "models"

sys.path.insert(0, str(REPO_ROOT))

_ranking_model = None
_anomaly_detector = None
_anomaly_scaler = None
_model_schema = None
_anomaly_schema = None


def _load_artifacts():
    global _ranking_model, _anomaly_detector, _anomaly_scaler, _model_schema, _anomaly_schema
    if _ranking_model is not None:
        return  # already loaded

    import joblib

    _ranking_model = joblib.load(MODEL2_DIR / "ranking_model.joblib")
    _anomaly_detector = joblib.load(MODEL2_DIR / "anomaly_detector.joblib")
    _anomaly_scaler = joblib.load(MODEL2_DIR / "anomaly_scaler.joblib")

    with open(MODEL2_DIR / "model_schema.json") as f:
        _model_schema = json.load(f)
    with open(MODEL2_DIR / "anomaly_schema.json") as f:
        _anomaly_schema = json.load(f)

    print("[model2] XGBoost ranking model + IsolationForest anomaly detector loaded")


def get_ranking_model():
    _load_artifacts()
    return _ranking_model


def _build_feature_row(retailer: dict) -> pd.DataFrame:
    """
    Map a retailer dict (from DB or API input) to the 28 columns Model 2 expects.
    Missing columns are filled with sensible defaults so demo always works.
    """
    _load_artifacts()
    schema = _model_schema
    row = {}

    # Direct mappings (column name → retailer dict key)
    mappings = {
        "total_retailer_revenue": "total_retailer_revenue",
        "total_units_sold": "total_units_sold",
        "total_transactions": "total_transactions",
        "unique_skus_sold": "unique_skus_sold",
        "avg_order_value": "avg_order_value",
        "avg_weekly_sales_qty": "avg_weekly_sales_qty",
        "recent_30d_revenue": "recent_30d_revenue",
        "recent_30d_units": "recent_30d_units",
        "previous_30d_revenue": "previous_30d_revenue",
        "previous_30d_units": "previous_30d_units",
        "days_since_last_purchase": "days_since_last_purchase",
        "sales_trend_30d": "sales_trend_30d",
        "avg_inventory_qty": "avg_inventory_qty",
        "min_inventory_qty": "min_inventory_qty",
        "stockout_rate": "stockout_rate",
        "stockout_events": "stockout_events",
        "unique_inventory_skus": "unique_inventory_skus",
        "total_historical_visits": "total_historical_visits",
        "unique_reps_visited": "unique_reps_visited",
        "days_since_last_visit": "days_since_last_visit",
        "regional_grower_engagement": "regional_grower_engagement",
        "regional_message_volume": "regional_message_volume",
        "avg_farm_size": "avg_farm_size",
        "total_scans": "total_scans",
        "grower_count": "grower_count",
        "state": "state",
        "district": "district",
        "tehsil": "tehsil",
    }

    # Numeric defaults (sensible mid-range values for demo)
    numeric_defaults = {
        "total_retailer_revenue": 50000.0,
        "total_units_sold": 200.0,
        "total_transactions": 30.0,
        "unique_skus_sold": 5.0,
        "avg_order_value": 1667.0,
        "avg_weekly_sales_qty": 15.0,
        "recent_30d_revenue": 12000.0,
        "recent_30d_units": 50.0,
        "previous_30d_revenue": 10000.0,
        "previous_30d_units": 45.0,
        "days_since_last_purchase": 14.0,
        "sales_trend_30d": 1.2,
        "avg_inventory_qty": 30.0,
        "min_inventory_qty": 5.0,
        "stockout_rate": 0.05,
        "stockout_events": 2.0,
        "unique_inventory_skus": 4.0,
        "total_historical_visits": 10.0,
        "unique_reps_visited": 2.0,
        "days_since_last_visit": 7.0,
        "regional_grower_engagement": 3.5,
        "regional_message_volume": 20.0,
        "avg_farm_size": 3.0,
        "total_scans": 5.0,
        "grower_count": 12.0,
    }

    for col, key in mappings.items():
        val = retailer.get(key)
        if val is None:
            val = numeric_defaults.get(col, 0.0) if col not in ("state", "district", "tehsil") else retailer.get(col, "Unknown")
        row[col] = val

    return pd.DataFrame([row])


def score_retailer(retailer: dict) -> dict:
    """
    Score a single retailer using Model 2 (XGBoost).
    Returns priority_probability and priority_score.
    """
    _load_artifacts()
    df = _build_feature_row(retailer)
    prob = float(_ranking_model.predict_proba(df)[:, 1][0])
    score = int(round(prob * 100))

    tier = "Critical" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 40 else "Low"

    return {
        "priority_probability": round(prob, 4),
        "priority_score": score,
        "priority_tier": tier,
    }


def score_retailers_batch(retailers: list[dict], top_n: int = 10) -> list[dict]:
    """
    Score a batch of retailers with Model 2 and return top_n ranked results.
    """
    _load_artifacts()
    results = []
    for r in retailers:
        try:
            scored = score_retailer(r)
            scored["retailer_id"] = r.get("retailer_id", "unknown")
            scored["retailer_name"] = r.get("retailer_name", "Unknown")
            scored["tehsil"] = r.get("tehsil", r.get("district", ""))
            results.append(scored)
        except Exception as e:
            print(f"[model2] Skipping retailer {r.get('retailer_id')}: {e}")

    results.sort(key=lambda x: x["priority_probability"], reverse=True)
    return results[:top_n]


def detect_anomalies(volume_data: list[dict]) -> list[dict]:
    """
    Detect demand spikes for (retailer_id, sku_id) pairs.
    Input: list of {"retailer_id": ..., "sku_id": ..., "total_volume_sold": ..., "avg_unit_price": ...}
    """
    _load_artifacts()
    if not volume_data:
        return []

    df = pd.DataFrame(volume_data)
    features = _anomaly_schema.get("anomaly_features", ["total_volume_sold", "avg_unit_price"])

    for col in features:
        if col not in df.columns:
            df[col] = 0.0

    scaled = _anomaly_scaler.transform(df[features])
    labels = _anomaly_detector.predict(scaled)
    scores = _anomaly_detector.decision_function(scaled)

    df["is_demand_spike"] = (labels == -1).astype(int)
    df["anomaly_score"] = scores

    return df[df["is_demand_spike"] == 1].to_dict("records")
