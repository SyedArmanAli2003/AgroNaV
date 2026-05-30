# What it does: Scores and ranks outlets by visit priority
# Input: List of outlet dicts from database
# Output: List of ScoredOutlet dicts sorted by score descending
# Called by: routers/outlets.py, routers/sync.py

import math
from datetime import datetime


# Approximate district center coordinates (lat, lng) for common agri districts
DISTRICT_CENTERS = {
    "Jalgaon":    (21.0077, 75.5626),
    "Nalgonda":   (17.0575, 79.2672),
    "Pune":       (18.5204, 73.8567),
    "Nashik":     (19.9975, 73.7898),
    "Aurangabad": (19.8762, 75.3433),
    "Solapur":    (17.6805, 75.9064),
    "Kolhapur":   (16.7050, 74.2433),
    "Nagpur":     (21.1458, 79.0882),
    "Amravati":   (20.9374, 77.7796),
    "Latur":      (18.4088, 76.5604),
    "Osmanabad":  (18.1863, 76.0429),
    "Sangli":     (16.8524, 74.5815),
    "Satara":     (17.6805, 74.0183),
    "Ratnagiri":  (16.9902, 73.3120),
    "Wardha":     (20.7453, 78.6022),
    "Yavatmal":   (20.3888, 78.1204),
    "Hingoli":    (19.7175, 77.1498),
    "Parbhani":   (19.2709, 76.7745),
    "Beed":       (18.9891, 75.7557),
    "Dharashiv":  (18.1863, 76.0429),
    "Warangal":   (17.9784, 79.5941),
    "Nizamabad":  (18.6725, 78.0942),
    "Karimnagar": (18.4386, 79.1288),
    "Medak":      (18.0453, 78.2641),
    "Mahbubnagar":(16.7373, 77.9866),
}


def _haversine(lat1, lng1, lat2, lng2):
    """Return great-circle distance in km between two (lat, lng) points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _base_score(outlet):
    """Compute the non-geography base score (pest + stock + recency + spike)."""
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
    return pest + stock + recency + spike


def _add_cluster_neighbors(outlets):
    """Pre-compute cluster_neighbors for each outlet (modifies dicts in-place).

    Two-pass algorithm:
      Pass 1 — identify HIGH outlets (base score >= 65) that have valid lat/lng.
      Pass 2 — for each outlet, count how many of those HIGH outlets lie within 10 km.

    The count is stored in outlet["cluster_neighbors"]. _fallback_score() reads it
    to decide whether to apply the +15 cluster bonus.
    """
    # Pass 1: collect (lat, lng) of outlets that would be HIGH without cluster bonus
    high_coords = []
    for o in outlets:
        if _base_score(o) < 65:
            continue
        try:
            lat = float(o.get("lat") or 0)
            lng = float(o.get("lng") or 0)
        except (ValueError, TypeError):
            lat = lng = 0.0
        if lat and lng:
            high_coords.append((lat, lng))

    # Pass 2: count nearby HIGH outlets for every outlet
    for o in outlets:
        try:
            lat = float(o.get("lat") or 0)
            lng = float(o.get("lng") or 0)
        except (ValueError, TypeError):
            lat = lng = 0.0

        if not lat or not lng:
            o["cluster_neighbors"] = 0
            continue

        count = sum(
            1 for hlat, hlng in high_coords
            if not (hlat == lat and hlng == lng)   # exclude self
            and _haversine(lat, lng, hlat, hlng) <= 10.0
        )
        o["cluster_neighbors"] = count


def _fallback_score(outlet):
    """Calculate fallback priority score using rule-based formula.

    Components (max 100 after cap):
      pest_alert   — up to 35 pts  (has_pest_alert)
      stock_urgency — up to 30 pts  (stock_days_remaining)
      recency      — up to 20 pts  (days since last_visit_date)
      sales_spike  — up to 15 pts  (sales_spike flag)
      cluster      — up to 15 pts  (geography: 2+ HIGH outlets within 10 km)

    Input:  outlet dict; cluster_neighbors must already be set by _add_cluster_neighbors().
    Output: int score 0-100
    Called by: rank_outlets()
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

    # Geography: cluster bonus — +15 if 2+ other HIGH outlets are within 10 km
    neighbors = outlet.get("cluster_neighbors", 0)
    cluster = 15 if neighbors >= 2 else 0

    score = pest + stock + recency + spike + cluster
    return min(100, score)


def _get_reasons(outlet):
    """Generate plain English reasons for the outlet's priority.

    Input:  outlet dict (cluster_neighbors must be set by _add_cluster_neighbors)
    Output: list of strings (max 3)
    Called by: rank_outlets()
    """
    reasons = []

    if outlet.get("has_pest_alert"):
        reasons.append("Pest alert active in district")

    # Geography cluster reason placed early — more actionable than generic recency
    neighbors = outlet.get("cluster_neighbors", 0)
    if neighbors >= 2:
        reasons.append(f"Clusters with {neighbors} other priority outlets nearby")

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

    # What it does: Rule-based scoring formula with geography cluster bonus
    # Input: list of outlet dicts from database
    # Output: list of ScoredOutlet dicts sorted by score descending
    # Called by: routers/outlets.py, routers/sync.py
    """
    outlets = [dict(o) if not isinstance(o, dict) else o.copy() for o in outlets]

    # Pre-compute cluster_neighbors so _fallback_score() can read it
    _add_cluster_neighbors(outlets)

    scored = []
    for outlet in outlets:
        outlet["score"] = _fallback_score(outlet)
        outlet["label"] = _get_label(outlet["score"])
        outlet["reasons"] = _get_reasons(outlet)
        scored.append(outlet)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
