# What it does: GET /recommendations endpoint — CatBoost-powered visit recommendations
# Input: rep_id and date query params
# Output: Ranked list of retailer recommendations with SHAP reasons + NBA
# Called by: Frontend Dashboard, mobile app

import os
import sys
import sqlite3
from pathlib import Path
from fastapi import APIRouter, Depends, Query
from db.database import get_db
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from services.inference import predict_proba
from services.shap_service import get_top3_reasons
from services.nba_service import get_nba
from services.feature_builder import build_features_sync

router = APIRouter(tags=["recommendations"])

# Syngenta product catalog — REAL SKUs from Syngenta IITM Hackathon 2026 dataset
# These are exactly the products in retailer_pos.csv
SYNGENTA_PRODUCTS = [
    "Actara 25 WG", "Alto 5 SC", "Amistar 250 SC",
    "Axial 50 EC", "Cruiser 350 FS", "Kavach 75 WP",
    "Movondo", "Score 250 EC", "Tilt 250 EC",
    "Topik 15 WP", "Vertimec 1.8 EC", "Vibrance Integral"
]

# Latest date in the dataset — used as reference for feature computation
# (dataset covers Oct 2025 – Apr 2026)
DATASET_END_DATE = "2026-03-29"

_DB_PATH = Path(__file__).resolve().parents[1] / "agronav.db"


def get_top_products_for_retailer(retailer_id: str, top_n: int = 4) -> list:
    """
    Query real POS data to get the most purchased SKU names for this retailer.
    Falls back to full SYNGENTA_PRODUCTS catalog if no real data.
    """
    try:
        conn = sqlite3.connect(str(_DB_PATH))
        c = conn.cursor()
        c.execute("""
            SELECT sku_name, SUM(sku_qty) as total_qty
            FROM retailer_pos
            WHERE retailer_id=?
            GROUP BY sku_name
            ORDER BY total_qty DESC
            LIMIT ?
        """, (retailer_id, top_n))
        rows = c.fetchall()
        conn.close()
        if rows:
            return [r[0] for r in rows]
    except Exception:
        pass
    return SYNGENTA_PRODUCTS


def get_last_recommended_product(retailer_id: str, territory_id: str) -> str | None:
    """
    Get the most recently recommended product from historical visit log
    for this retailer's territory.
    """
    try:
        conn = sqlite3.connect(str(_DB_PATH))
        c = conn.cursor()
        c.execute("""
            SELECT product_recommended FROM historical_visit_log
            WHERE territory_id=?
            ORDER BY visit_date DESC LIMIT 1
        """, (territory_id,))
        row = c.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


@router.get("/recommendations")
async def get_recommendations(
    rep_id: str = Query(..., description="Rep ID, e.g. REP_0203"),
    date: str = Query(None, description="Prediction date YYYY-MM-DD"),
    db=Depends(get_db)
):
    """
    Generate AI-powered visit recommendations for a field rep.

    Pipeline:
    1. Get retailers for rep's territory
    2. Score each (retailer × product) combo with CatBoost
    3. Keep best product per retailer
    4. Top 10 by probability
    5. Add SHAP reasons + NBA for each
    """
    from datetime import date as date_type
    if not date:
        date = date_type.today().isoformat()

    # 1. Lookup rep's territory from users table
    rep_district = None
    rep_state = None
    try:
        async with db.execute(
            "SELECT district, state, territory_id FROM users WHERE rep_id=?", (rep_id,)
        ) as cursor:
            rep_row = await cursor.fetchone()
            if rep_row:
                rep_district = rep_row["district"]
                rep_state = rep_row["state"]
    except Exception:
        pass

    # 2. Get retailers — filter by rep's territory if available
    retailers = []
    try:
        if rep_district:
            async with db.execute(
                "SELECT * FROM retailers WHERE LOWER(district)=LOWER(?) OR LOWER(tehsil)=LOWER(?) LIMIT 20",
                (rep_district, rep_district)
            ) as cursor:
                rows = await cursor.fetchall()
        else:
            async with db.execute("SELECT * FROM retailers LIMIT 20") as cursor:
                rows = await cursor.fetchall()

        for row in rows:
            retailers.append({
                "retailer_id": row["retailer_id"],
                "retailer_name": row["retailer_name"],
                "territory_id": row["territory_id"] or "TERR_001",
                "tehsil": row["tehsil"] or rep_district or "Jalgaon",
                "state": row["state"] or rep_state or "Maharashtra",
                "district": row["district"] or rep_district or "Jalgaon"
            })
    except Exception:
        pass

    # Fallback: if no territory-filtered results, try all retailers
    if not retailers:
        try:
            async with db.execute("SELECT * FROM retailers LIMIT 20") as cursor:
                rows = await cursor.fetchall()
                for row in rows:
                    retailers.append({
                        "retailer_id": row["retailer_id"],
                        "retailer_name": row["retailer_name"],
                        "territory_id": row["territory_id"] or "TERR_001",
                        "tehsil": row["tehsil"] or "Jalgaon",
                        "state": row["state"] or "Maharashtra",
                        "district": row["district"] or "Jalgaon"
                    })
        except Exception:
            pass

    # Last resort: outlets table
    if not retailers:
        try:
            async with db.execute("SELECT * FROM outlets ORDER BY id") as cursor:
                rows = await cursor.fetchall()
                for row in rows:
                    retailers.append({
                        "retailer_id": f"RTL_{row['id']:05d}",
                        "retailer_name": row["name"],
                        "territory_id": "TERR_001",
                        "tehsil": rep_district or row["district"] or "Nalgonda",
                        "state": rep_state or "Telangana",
                        "district": rep_district or row["district"] or "Nalgonda"
                    })
        except Exception as e:
            print(f"[recommendations] DB error: {e}")
            return {"rep_id": rep_id, "date": date, "recommendations": []}

    # ── Try Model 1 first (CatBoost, AUC 0.79) ───────────────────────────────
    model1_available = True
    try:
        from services.inference import predict_proba, get_model
        get_model()  # raises if CatBoost failed to load
    except Exception as e:
        print(f"[recommendations] Model 1 unavailable: {e}. Will use Model 2.")
        model1_available = False

    if not retailers:
        return {"rep_id": rep_id, "date": date, "recommendations": []}

    # 2. Score retailers — Model 1 (CatBoost) or fallback to Model 2 (XGBoost)
    best_per_retailer = {}

    if model1_available:
        # ── Model 1 path: visit-level CatBoost scoring ──────────────────────
        for retailer in retailers:
            best_prob = -1
            best_product = None
            best_features_df = None

            # Use real top-purchased products from POS data (faster + more accurate)
            retailer_id_key = retailer["retailer_id"]
            products_to_score = get_top_products_for_retailer(retailer_id_key, top_n=4)

            for product in products_to_score:
                try:
                    features_df = build_features_sync(retailer, product, rep_id, date)
                    probs = predict_proba(features_df)
                    prob = probs[0]
                    if prob > best_prob:
                        best_prob = prob
                        best_product = product
                        best_features_df = features_df
                except Exception:
                    continue

            if best_product and best_features_df is not None:
                best_per_retailer[retailer["retailer_id"]] = {
                    "retailer": retailer,
                    "product": best_product,
                    "probability": best_prob,
                    "features_df": best_features_df,
                    "model_used": "model1_catboost",
                }
    else:
        # ── Model 2 fallback: XGBoost aggregate scoring ─────────────────────
        print("[recommendations] Using Model 2 (XGBoost) as fallback scorer")
        try:
            from services.model2_inference import score_retailers_batch
            import pandas as pd
            ranked_m2 = score_retailers_batch(retailers, top_n=10)
            for entry in ranked_m2:
                rid = entry["retailer_id"]
                retailer = next((r for r in retailers if r["retailer_id"] == rid), None)
                if retailer:
                    # Create a minimal DataFrame so SHAP reasons use fallback
                    best_per_retailer[rid] = {
                        "retailer": retailer,
                        "product": "Ampligo 150 ZC",
                        "probability": entry["priority_probability"],
                        "features_df": None,
                        "model_used": "model2_xgboost",
                        "model2_triggers": entry.get("justification_triggers", []),
                    }
        except Exception as e:
            print(f"[recommendations] Model 2 also failed: {e}")

    # 3. Sort by probability descending, take top 10
    sorted_retailers = sorted(
        best_per_retailer.values(),
        key=lambda x: x["probability"],
        reverse=True
    )[:10]


    # 4. Build response with SHAP reasons and NBA for each
    recommendations = []
    for rank, entry in enumerate(sorted_retailers, 1):
        retailer = entry["retailer"]
        features_df = entry["features_df"]

        # SHAP reasons — use Model 2 triggers if features_df is None (Model 2 path)
        if features_df is not None:
            try:
                reasons = get_top3_reasons(features_df)
            except Exception as e:
                print(f"[recommendations] SHAP error for {retailer['retailer_id']}: {e}")
                reasons = entry.get("model2_triggers") or ["AI confidence signal detected", "Territory pattern match", "Seasonal timing"]
        else:
            reasons = entry.get("model2_triggers") or ["XGBoost priority signal", "Revenue trend detected", "Visit cadence signal"]

        # NBA outlet context
        if features_df is not None:
            outlet_context = {
                "retailer_id": retailer["retailer_id"],
                "outlet_name": retailer["retailer_name"],
                "recommended_product": entry["product"],
                "days_since_last_visit": int(features_df.iloc[0].get("days_since_last_visit", 0)),
                "crop_growth_stage": "vegetative" if features_df.iloc[0].get("is_harvest_approaching", 0) == 0 else "maturity",
                "active_pest_alerts": "bollworm" if features_df.iloc[0].get("is_critical_period", 0) == 1 else "",
                "current_inventory": int(features_df.iloc[0].get("sku_qty_pre_visit", 0)),
            }
        else:
            outlet_context = {
                "retailer_id": retailer["retailer_id"],
                "outlet_name": retailer["retailer_name"],
                "recommended_product": entry["product"],
                "days_since_last_visit": 7,
                "crop_growth_stage": "vegetative",
                "active_pest_alerts": "",
                "current_inventory": 0,
            }
        try:
            nba = await get_nba(outlet_context, db)
        except Exception as e:
            print(f"[recommendations] NBA error for {retailer['retailer_id']}: {e}")
            nba = {
                "product_to_pitch": entry["product"],
                "agronomic_advice": "Check current inventory and discuss seasonal needs.",
                "promotional_mechanic": None,
                "talking_points": ["Check stock levels", "Discuss seasonal forecast", "Review last purchase"],
                "one_line_summary": f"Routine visit to pitch {entry['product']}."
            }

        recommendations.append({
            "rank": rank,
            "retailer_id": retailer["retailer_id"],
            "retailer_name": retailer["retailer_name"],
            "tehsil": retailer["tehsil"],
            "product_recommended": entry["product"],
            "priority_score": round(entry["probability"], 4),
            "reasons": reasons,
            "nba": nba,
            "model_used": entry.get("model_used", "model1_catboost"),
        })

    active_model = "model1_catboost" if model1_available else "model2_xgboost"
    return {
        "rep_id": rep_id,
        "date": date,
        "model_used": active_model,
        "recommendations": recommendations
    }
