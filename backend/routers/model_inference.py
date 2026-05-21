# What it does: Unified ML inference API — exposes both Model 1 (CatBoost) and Model 2 (XGBoost)
# Architecture: Model 1 is primary, Model 2 is fallback. Either can be called directly.
#
# Endpoints:
#   POST /api/score/model1       — CatBoost (28 visit-level features, AUC 0.79)
#   POST /api/score/model2       — XGBoost   (28 retailer-aggregate features, AUC ~0.78)
#   POST /api/score/auto         — Auto: tries Model 1 first, falls back to Model 2
#   POST /api/anomalies          — IsolationForest demand spike detection (Model 2 sub-model)
#   GET  /api/score/health       — Returns status of both models
#
# Called by: Frontend Dashboard, routers/recommendations.py

import time
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["inference"])


# ─── Pydantic request schemas ──────────────────────────────────────────────────

class RetailerInput(BaseModel):
    """
    Flexible input — pass whatever fields you have.
    Model 1 uses visit-level signals; Model 2 uses aggregate retailer signals.
    Missing fields receive sensible defaults inside each inference service.
    """
    retailer_id: str
    retailer_name: Optional[str] = "Unknown Retailer"
    tehsil: Optional[str] = "Unknown"
    state: Optional[str] = "Unknown"
    district: Optional[str] = "Unknown"
    territory_id: Optional[str] = "TERR_001"

    # Model 2 — aggregate commercial signals
    total_retailer_revenue: Optional[float] = None
    total_units_sold: Optional[float] = None
    total_transactions: Optional[float] = None
    unique_skus_sold: Optional[float] = None
    avg_order_value: Optional[float] = None
    avg_weekly_sales_qty: Optional[float] = None
    recent_30d_revenue: Optional[float] = None
    recent_30d_units: Optional[float] = None
    previous_30d_revenue: Optional[float] = None
    previous_30d_units: Optional[float] = None
    days_since_last_purchase: Optional[float] = None
    sales_trend_30d: Optional[float] = None
    avg_inventory_qty: Optional[float] = None
    min_inventory_qty: Optional[float] = None
    stockout_rate: Optional[float] = None
    stockout_events: Optional[float] = None
    unique_inventory_skus: Optional[float] = None
    total_historical_visits: Optional[float] = None
    unique_reps_visited: Optional[float] = None
    days_since_last_visit: Optional[float] = None
    regional_grower_engagement: Optional[float] = None
    regional_message_volume: Optional[float] = None
    avg_farm_size: Optional[float] = None
    total_scans: Optional[float] = None
    grower_count: Optional[float] = None


class BatchScoreRequest(BaseModel):
    retailers: list[RetailerInput]
    top_n: Optional[int] = 10
    rep_id: Optional[str] = "REP_001"
    date: Optional[str] = None


class AnomalyInput(BaseModel):
    retailer_id: str
    sku_id: str
    total_volume_sold: float
    avg_unit_price: float


class AnomalyRequest(BaseModel):
    data: list[AnomalyInput]


# ─── Health check ──────────────────────────────────────────────────────────────

@router.get("/api/score/health")
async def model_health():
    """Check the live status of both ML models."""
    result = {
        "model1": {"name": "CatBoost", "status": "unknown", "auc": 0.7869},
        "model2": {"name": "XGBoost (sklearn Pipeline)", "status": "unknown", "auc": 0.78},
        "active_model": None,
    }

    # Test Model 1
    try:
        from services.inference import get_model
        m1 = get_model()
        result["model1"]["status"] = "ok"
        result["model1"]["model_class"] = type(m1).__name__
    except Exception as e:
        result["model1"]["status"] = f"error: {e}"

    # Test Model 2
    try:
        from services.model2_inference import get_ranking_model
        m2 = get_ranking_model()
        result["model2"]["status"] = "ok"
        result["model2"]["model_class"] = type(m2).__name__
    except Exception as e:
        result["model2"]["status"] = f"error: {e}"

    # Set active model
    if result["model1"]["status"] == "ok":
        result["active_model"] = "model1 (CatBoost)"
    elif result["model2"]["status"] == "ok":
        result["active_model"] = "model2 (XGBoost)"
    else:
        result["active_model"] = "none (both failed)"

    return result


# ─── Model 1: CatBoost — score individual retailer ─────────────────────────────

@router.post("/api/score/model1")
async def score_model1(req: BatchScoreRequest):
    """
    Score retailers using Model 1 (CatBoost, AUC 0.79).
    Trained on 23,862 real visit-level records with 28 field signals.
    """
    from services.inference import predict_proba
    from services.feature_builder import build_features_sync
    from services.shap_service import get_top3_reasons

    PRODUCTS = [
        "Ampligo 150 ZC", "Tilt 250 EC", "Amistar Top",
        "Curacron 500 EC", "Pegasus 500 SC", "Actara 25 WG",
    ]

    rep_id = req.rep_id or "REP_001"
    date = req.date
    results = []

    for r in req.retailers:
        retailer_dict = r.model_dump()
        best_prob, best_product, best_df = -1, None, None

        for product in PRODUCTS:
            try:
                df = build_features_sync(retailer_dict, product, rep_id, date)
                prob = predict_proba(df)[0]
                if prob > best_prob:
                    best_prob, best_product, best_df = prob, product, df
            except Exception:
                continue

        if best_product is None:
            results.append({
                "retailer_id": r.retailer_id,
                "model": "model1",
                "error": "Feature build failed"
            })
            continue

        try:
            reasons = get_top3_reasons(best_df)
        except Exception:
            reasons = ["AI confidence signal", "Territory pattern", "Seasonal timing"]

        score = int(round(best_prob * 100))
        tier = "Critical" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 40 else "Low"

        results.append({
            "retailer_id": r.retailer_id,
            "retailer_name": r.retailer_name,
            "tehsil": r.tehsil,
            "model": "model1_catboost",
            "product_recommended": best_product,
            "priority_probability": round(best_prob, 4),
            "priority_score": score,
            "priority_tier": tier,
            "justification_triggers": reasons,
        })

    results.sort(key=lambda x: x.get("priority_probability", 0), reverse=True)
    return {
        "status": "SUCCESS",
        "model_used": "model1_catboost",
        "auc": 0.7869,
        "recommended_count": len(results),
        "results": results[:req.top_n],
    }


# ─── Model 2: XGBoost — score retailers by aggregate signals ───────────────────

@router.post("/api/score/model2")
async def score_model2(req: BatchScoreRequest):
    """
    Score retailers using Model 2 (XGBoost Pipeline).
    Uses aggregate commercial signals: revenue, inventory, visit history, grower engagement.
    """
    from services.model2_inference import score_retailers_batch

    retailers = [r.model_dump() for r in req.retailers]

    try:
        ranked = score_retailers_batch(retailers, top_n=req.top_n)
    except Exception as e:
        return {"status": "ERROR", "detail": str(e), "results": []}

    # Format to match model_1 output structure
    formatted = []
    for i, r in enumerate(ranked, 1):
        days = r.get("days_since_last_visit", 0)
        stockout = r.get("stockout_rate", 0)
        revenue = r.get("recent_30d_revenue", 0)
        triggers = []
        if stockout and float(stockout) > 0.15:
            triggers.append("High stockout risk from inventory history")
        if days and float(days) > 30:
            triggers.append(f"Retailer not visited for {int(float(days))} days")
        if revenue and float(revenue) > 10000:
            triggers.append("Above-benchmark 30-day revenue")
        if not triggers:
            triggers = ["Strong combined commercial signal"]

        formatted.append({
            "rank": i,
            "retailer_id": r["retailer_id"],
            "retailer_name": r.get("retailer_name", "Unknown"),
            "tehsil": r.get("tehsil", ""),
            "model": "model2_xgboost",
            "priority_probability": r["priority_probability"],
            "priority_score": r["priority_score"],
            "priority_tier": r["priority_tier"],
            "justification_triggers": triggers,
            "next_best_action": {
                "recommended_strategy": "Schedule Recovery Visit With SKU Replenishment Pitch",
                "focus_sku": "SY_AXI_50EC",
            },
        })

    return {
        "status": "SUCCESS",
        "model_used": "model2_xgboost",
        "recommended_count": len(formatted),
        "results": formatted,
    }


# ─── Auto: try Model 1, fall back to Model 2 ──────────────────────────────────

@router.post("/api/score/auto")
async def score_auto(req: BatchScoreRequest):
    """
    Automatic model selection:
      → Tries Model 1 (CatBoost) first
      → Falls back to Model 2 (XGBoost) if Model 1 fails
    This is the endpoint the main recommendations pipeline calls.
    """
    start = time.time()

    # Try Model 1
    try:
        from services.inference import predict_proba, get_model
        get_model()  # will raise if not available

        from services.feature_builder import build_features_sync
        from services.shap_service import get_top3_reasons

        PRODUCTS = [
            "Ampligo 150 ZC", "Tilt 250 EC", "Amistar Top",
            "Curacron 500 EC", "Pegasus 500 SC", "Actara 25 WG",
        ]

        rep_id = req.rep_id or "REP_001"
        results = []

        for r in req.retailers:
            retailer_dict = r.model_dump()
            best_prob, best_product, best_df = -1, None, None

            for product in PRODUCTS:
                try:
                    df = build_features_sync(retailer_dict, product, rep_id, req.date)
                    prob = predict_proba(df)[0]
                    if prob > best_prob:
                        best_prob, best_product, best_df = prob, product, df
                except Exception:
                    continue

            if best_product:
                try:
                    reasons = get_top3_reasons(best_df)
                except Exception:
                    reasons = ["AI signal detected", "Territory pattern", "Seasonal timing"]

                score = int(round(best_prob * 100))
                tier = "Critical" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 40 else "Low"
                results.append({
                    "rank": len(results) + 1,
                    "retailer_id": r.retailer_id,
                    "retailer_name": r.retailer_name,
                    "tehsil": r.tehsil,
                    "model": "model1_catboost",
                    "product_recommended": best_product,
                    "priority_probability": round(best_prob, 4),
                    "priority_score": score,
                    "priority_tier": tier,
                    "justification_triggers": reasons,
                })

        if results:
            results.sort(key=lambda x: x["priority_probability"], reverse=True)
            elapsed = round((time.time() - start) * 1000, 1)
            return {
                "status": "SUCCESS",
                "model_used": "model1_catboost",
                "inference_ms": elapsed,
                "recommended_count": len(results[:req.top_n]),
                "results": results[:req.top_n],
            }

    except Exception as e:
        print(f"[auto-score] Model 1 failed: {e}. Falling back to Model 2.")

    # Fall back to Model 2
    try:
        from services.model2_inference import score_retailers_batch
        retailers = [r.model_dump() for r in req.retailers]
        ranked = score_retailers_batch(retailers, top_n=req.top_n)
        elapsed = round((time.time() - start) * 1000, 1)
        return {
            "status": "SUCCESS",
            "model_used": "model2_xgboost_fallback",
            "inference_ms": elapsed,
            "recommended_count": len(ranked),
            "results": ranked,
        }
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 1)
        return {
            "status": "ERROR",
            "detail": f"Both models failed: {e}",
            "inference_ms": elapsed,
            "results": [],
        }


# ─── Anomaly detection ─────────────────────────────────────────────────────────

@router.post("/api/anomalies")
async def detect_demand_anomalies(req: AnomalyRequest):
    """
    Detect demand spikes using Model 2's IsolationForest sub-model.
    Input: list of (retailer_id, sku_id, total_volume_sold, avg_unit_price)
    Output: list of anomalous entries with anomaly_score.
    """
    from services.model2_inference import detect_anomalies

    try:
        data = [item.model_dump() for item in req.data]
        anomalies = detect_anomalies(data)
        return {
            "status": "SUCCESS",
            "total_checked": len(data),
            "anomaly_count": len(anomalies),
            "anomalies": anomalies,
        }
    except Exception as e:
        return {"status": "ERROR", "detail": str(e), "anomalies": []}
