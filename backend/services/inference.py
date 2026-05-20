# What it does: Loads the trained CatBoost model and provides predict_proba()
# Input: 28-column DataFrame with FEATURE_COLS
# Output: List of conversion probabilities
# Called by: routers/recommendations.py

import os
import sys
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]  # AgroNaV/
sys.path.insert(0, str(REPO_ROOT))

from catboost import CatBoostClassifier
from src.config import FEATURE_COLS
import pandas as pd

_model = None


def get_model():
    """Singleton pattern: load CatBoost model once, reuse for all requests."""
    global _model
    if _model is None:
        # Verify deployed.json agrees on the model filename before loading
        deployed_path = REPO_ROOT / "models" / "deployed.json"
        if deployed_path.exists():
            with open(deployed_path) as f:
                deployed = json.load(f)
            model_file = deployed.get("model_file", "catboost_optuna_best.cbm")
        else:
            model_file = "catboost_optuna_best.cbm"

        model_path = REPO_ROOT / "models" / model_file
        _model = CatBoostClassifier()
        _model.load_model(str(model_path))
        print(f"[inference] CatBoost model loaded from {model_path}")
    return _model


def predict_proba(features_df: pd.DataFrame) -> list:
    """
    features_df must have exactly the 28 columns in FEATURE_COLS.
    Returns list of conversion probabilities (class 1), one per row.
    """
    model = get_model()
    df = features_df[FEATURE_COLS].copy()
    return model.predict_proba(df)[:, 1].tolist()
