# ─────────────────────────────────────────────────────
# AI/ML TEAM — THIS IS YOUR FILE
# See ml/README.md for full instructions
# ─────────────────────────────────────────────────────
#
# WHAT THIS FILE MUST DO:
# Accept a list of outlet dicts.
# Return the same list with "score" (int 0-100) added to each dict.
#
# HOW THE APP USES THIS:
# from ml.ranking import score_outlets
# scored = score_outlets(outlets)   ← your function
#
# IF THIS RETURNS None → app uses fallback formula in services/scoring.py
#
# SUGGESTED APPROACH:
# 1. Load trained model from ml/model.pkl (joblib)
# 2. Build feature matrix from outlet list
# 3. Predict probability of productive visit
# 4. Scale to 0-100
# 5. Add SHAP values as "reasons" list (plain English strings)
# ─────────────────────────────────────────────────────


def score_outlets(outlets: list) -> list | None:
    """Score outlets using ML model.

    # What it does: Scores outlets by visit priority using a trained ML model
    # Input: list of outlet dicts with features
    # Output: same list with "score" (int 0-100) added, or None for fallback
    # Called by: services/scoring.py
    """
    # TODO: implement ML scoring here
    # Return None to use fallback
    return None
