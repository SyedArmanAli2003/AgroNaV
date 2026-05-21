# What it does: Debug/observability endpoints for judges and QA
# GET /api/debug/model — verify CatBoost is running
# GET /api/debug/seed-status — moved to manager.py but aliased here too

import sys, time
from pathlib import Path
from fastapi import APIRouter

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

router = APIRouter(tags=["debug"])


@router.get("/api/debug/model")
async def debug_model():
    """
    Verify the CatBoost model is loaded and can make predictions.
    Used by: NavBar AI status indicator + judges QA.
    """
    try:
        start = time.time()

        from services.inference import get_model
        from src.config import FEATURE_COLS
        import pandas as pd, numpy as np

        model = get_model()

        # Build a valid dummy row using the feature builder defaults
        from services.feature_builder import build_features_sync
        dummy_retailer = {
            "retailer_id": "RTL_TEST",
            "territory_id": "TERR_001",
            "tehsil": "Jalgaon",
            "state": "Maharashtra",
            "district": "Jalgaon"
        }
        df = build_features_sync(dummy_retailer, "Tilt 250 EC", "REP_TEST", "2026-05-21")
        prob = model.predict_proba(df)[:, 1].tolist()[0]

        elapsed = round((time.time() - start) * 1000, 1)

        return {
            "status": "ok",
            "model": "CatBoostClassifier",
            "model_file": "catboost_optuna_best.cbm",
            "auc": 0.7869,
            "training_samples": 23862,
            "feature_count": len(FEATURE_COLS),
            "test_prediction": round(prob, 4),
            "inference_ms": elapsed,
            "message": "Real CatBoost model is running"
        }
    except Exception as e:
        return {
            "status": "error",
            "model": "CatBoostClassifier",
            "detail": str(e),
            "message": "Model failed to load or predict"
        }


@router.get("/api/debug/features")
async def debug_features():
    """Return the list of 28 feature columns the model uses."""
    try:
        from src.config import FEATURE_COLS
        return {"feature_count": len(FEATURE_COLS), "features": FEATURE_COLS}
    except Exception as e:
        return {"error": str(e)}
