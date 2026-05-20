# What it does: Scores and ranks outlets by visit priority
# Input: List of outlet dicts from database
# Output: List of ScoredOutlet dicts sorted by score descending
# Called by: routers/outlets.py, routers/sync.py

from datetime import datetime


def _fallback_score(outlet):
    """Calculate fallback priority score using rule-based formula.

    # What it does: Computes a 0-100 priority score from outlet attributes
    # Input: outlet dict with has_pest_alert, stock_days_remaining, last_visit_date, sales_spike
    # Output: int score 0-100
    # Called by: rank_outlets() when ML model is unavailable
    """
    pest = 35 if outlet.get("has_pest_alert") else 0
    stock_days = outlet.get("stock_days_remaining", 10)
    stock = max(0, int(30 * (1 - stock_days / 10)))

    try:
        last_visit = datetime.strptime(outlet.get("last_visit_date", ""), "%Y-%m-%d")
        days = (datetime.now() - last_visit).days
    except (ValueError, TypeError):
        days = 0

    recency = min(20, int(20 * days / 14))
    spike = 15 if outlet.get("sales_spike") else 0

    score = pest + stock + recency + spike
    return min(100, score)


def _get_reasons(outlet):
    """Generate plain English reasons for the outlet's priority.

    # What it does: Builds a list of up to 3 human-readable reason strings
    # Input: outlet dict
    # Output: list of strings (max 3)
    # Called by: rank_outlets()
    """
    reasons = []

    if outlet.get("has_pest_alert"):
        reasons.append("Pest alert active in district")

    stock_days = outlet.get("stock_days_remaining", 10)
    if stock_days < 4:
        reasons.append(f"Stock runs out in {stock_days} days")

    try:
        last_visit = datetime.strptime(outlet.get("last_visit_date", ""), "%Y-%m-%d")
        days = (datetime.now() - last_visit).days
    except (ValueError, TypeError):
        days = 0

    if days > 7:
        reasons.append(f"Not visited in {days} days")

    if outlet.get("sales_spike"):
        reasons.append("Demand spike this week")

    if outlet.get("crop_stage"):
        reasons.append("Critical crop protection window open")

    return reasons[:3]


def _get_label(score):
    """Convert numeric score to priority label.

    # What it does: Maps score to HIGH/MEDIUM/LOW label
    # Input: int score
    # Output: string label
    # Called by: rank_outlets()
    """
    if score >= 65:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    else:
        return "LOW"


def rank_outlets(outlets):
    """Score, label, and sort outlets by visit priority.

    # What it does: Rule-based scoring formula
    # Input: list of outlet dicts from database
    # Output: list of ScoredOutlet dicts sorted by score descending
    # Called by: routers/outlets.py, routers/sync.py
    """
    scored = []
    for o in outlets:
        outlet = dict(o) if not isinstance(o, dict) else o.copy()
        outlet["score"] = _fallback_score(outlet)
        outlet["label"] = _get_label(outlet["score"])
        outlet["reasons"] = _get_reasons(outlet)
        scored.append(outlet)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored

