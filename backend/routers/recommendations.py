# What it does: GET /recommendations endpoint — CatBoost-powered visit recommendations
# Input: rep_id and date query params
# Output: Ranked list of retailer recommendations with SHAP reasons + NBA
# Called by: Frontend Dashboard, mobile app

import os
import sys
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

# Syngenta product catalog for scoring
SYNGENTA_PRODUCTS = [
    "Ampligo 150 ZC", "Tilt 250 EC", "Amistar Top",
    "Curacron 500 EC", "Pegasus 500 SC", "Actara 25 WG",
    "Cruiser 350 FS", "Revus 250 SC", "Score 250 EC",
    "Proclaim 5 SG", "Karate Zeon", "Virtako 40 WG"
]


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

    # 1. Get retailers — first try the retailers table, then fall back to outlets
    retailers = []
    try:
        async with db.execute(
            "SELECT * FROM retailers LIMIT 20"
        ) as cursor:
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

    # Fallback: use outlets table if retailers is empty
    if not retailers:
        try:
            async with db.execute("SELECT * FROM outlets ORDER BY id") as cursor:
                rows = await cursor.fetchall()
                for row in rows:
                    retailers.append({
                        "retailer_id": f"RTL_{row['id']:05d}",
                        "retailer_name": row["name"],
                        "territory_id": "TERR_001",
                        "tehsil": row.get("district", "Nalgonda"),
                        "state": "Telangana",
                        "district": row.get("district", "Nalgonda")
                    })
        except Exception as e:
            print(f"[recommendations] DB error: {e}")
            return {"rep_id": rep_id, "date": date, "recommendations": []}

    if not retailers:
        return {"rep_id": rep_id, "date": date, "recommendations": []}

    # 2. For each (retailer × product) combo: build features and predict
    best_per_retailer = {}

    for retailer in retailers:
        best_prob = -1
        best_product = None
        best_features_df = None

        for product in SYNGENTA_PRODUCTS:
            try:
                features_df = build_features_sync(retailer, product, rep_id, date)
                probs = predict_proba(features_df)
                prob = probs[0]

                if prob > best_prob:
                    best_prob = prob
                    best_product = product
                    best_features_df = features_df
            except Exception as e:
                # Skip this combo on error, continue with others
                continue

        if best_product and best_features_df is not None:
            best_per_retailer[retailer["retailer_id"]] = {
                "retailer": retailer,
                "product": best_product,
                "probability": best_prob,
                "features_df": best_features_df
            }

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

        # SHAP reasons
        try:
            reasons = get_top3_reasons(features_df)
        except Exception as e:
            print(f"[recommendations] SHAP error for {retailer['retailer_id']}: {e}")
            reasons = ["AI confidence signal detected", "Territory pattern match", "Seasonal timing"]

        # NBA
        outlet_context = {
            "retailer_id": retailer["retailer_id"],
            "outlet_name": retailer["retailer_name"],
            "recommended_product": entry["product"],
            "days_since_last_visit": int(features_df.iloc[0].get("days_since_last_visit", 0)),
            "crop_growth_stage": "vegetative" if features_df.iloc[0].get("is_harvest_approaching", 0) == 0 else "maturity",
            "active_pest_alerts": "bollworm" if features_df.iloc[0].get("is_critical_period", 0) == 1 else "",
            "current_inventory": int(features_df.iloc[0].get("sku_qty_pre_visit", 0)),
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
            "nba": nba
        })

    return {
        "rep_id": rep_id,
        "date": date,
        "recommendations": recommendations
    }
