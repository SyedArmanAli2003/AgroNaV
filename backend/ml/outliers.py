# ─────────────────────────────────────────────────────
# AI/ML TEAM — OUTLIER / ANOMALY DETECTION
# See ml/README.md for full instructions
#
# WHAT THIS FILE MUST DO:
# Accept territory sales data dict.
# Return list of alert dicts.
#
# HOW THE APP USES THIS:
# from ml.outliers import detect_anomalies
# alerts = detect_anomalies(territory_data)
#
# IF THIS RETURNS None → app uses rule-based fallback in services/anomaly.py
# ─────────────────────────────────────────────────────


def detect_anomalies(territory_data: dict) -> list | None:
    """Detect anomalies in territory sales data.

    # What it does: Finds outliers and anomalies in sales patterns
    # Input: dict with territory-level sales data
    # Output: list of alert dicts [{type, message, severity}], or None for fallback
    # Called by: services/anomaly.py
    """
    # TODO: implement outlier detection here
    # Return None to use fallback
    return None
