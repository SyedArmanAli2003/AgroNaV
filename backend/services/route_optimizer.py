# What it does: Optimizes the daily visit route using Google Routes API (Waypoint Optimizer)
#   then formats the response as an ordered outlet list string ready for the briefing prompt.
#
# Pipeline:
#   Step 1: POST https://routes.googleapis.com/directions/v2:computeRoutes
#           FieldMask: routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters
#           Extract: optimizedIntermediateWaypointIndex → reorder outlet list
#                    legs[i].duration.seconds / 60  → per-leg drive minutes
#                    sum(distanceMeters) / 1000      → total_km
#                    sum(duration.seconds) / 60      → total_minutes
#
#   Step 2: Reorder outlets by the optimized index array
#
#   Step 3: Format each stop as:
#           "Stop 1: Sharma Agro | Score: 88 | Reason: pest alert | Drive: 12min"
#
# Fallback: If no Maps key or API error → sort by priority_score desc (greedy)
#           all drive times = "–" and total_km/total_minutes derived from crow-fly estimate
#
# Input:
#   rep_lat, rep_lng:  float   — rep's current GPS position
#   outlets:           list    — each item has {retailer_id, retailer_name, priority_score,
#                                               lat, lng, reasons, has_pest_alert, stock_days_remaining}
#   top_n:             int     — how many outlets to route (default 6)
#
# Output:
#   {
#     ordered_outlet_list:  str   — formatted string for briefing prompt
#     ordered_outlets:      list  — structured list of ordered outlet dicts
#     total_km:             float
#     total_minutes:        int
#     source:               str   — "google-routes" | "priority-score-fallback"
#   }
#
# Called by: routers/route.py

import os
import math
import httpx
from typing import Optional

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Routes API endpoint
_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
_FIELD_MASK = (
    "routes.optimizedIntermediateWaypointIndex,"
    "routes.legs.duration,"
    "routes.legs.distanceMeters"
)


# ─────────────────────────────────────────────────────────────────────────────
# 1. GOOGLE ROUTES API CALL
# ─────────────────────────────────────────────────────────────────────────────

async def _call_routes_api(
    rep_lat: float, rep_lng: float,
    outlet_coords: list[tuple[float, float]],    # list of (lat, lng) for intermediates
    last_lat: float, last_lng: float,            # destination = last outlet
) -> Optional[dict]:
    """
    POST to Google Routes API with waypoint optimization.
    Returns raw API response dict or None on failure.
    """
    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY.startswith("YOUR"):
        return None

    intermediates = [
        {"location": {"latLng": {"latitude": lat, "longitude": lng}}}
        for lat, lng in outlet_coords
    ]

    body = {
        "origin":      {"location": {"latLng": {"latitude": rep_lat,  "longitude": rep_lng}}},
        "destination": {"location": {"latLng": {"latitude": last_lat, "longitude": last_lng}}},
        "intermediates": intermediates,
        "travelMode": "DRIVE",
        "optimizeWaypointOrder": True,
    }

    headers = {
        "Content-Type":   "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": _FIELD_MASK,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(_ROUTES_URL, json=body, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        print(f"[route] Google Routes API call failed: {exc}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 2. PARSE API RESPONSE → drive minutes per leg + total stats
# ─────────────────────────────────────────────────────────────────────────────

def _parse_routes_response(api_resp: dict, n_outlets: int) -> dict:
    """
    Extract optimizedIntermediateWaypointIndex, per-leg drive times, totals.
    Returns dict with keys: order_indices, leg_minutes, total_km, total_minutes
    """
    try:
        route  = api_resp["routes"][0]
        legs   = route["legs"]

        # Optimized order for intermediates (0-indexed into original outlet list)
        order_indices = route.get("optimizedIntermediateWaypointIndex", list(range(n_outlets)))

        leg_minutes = []
        total_secs  = 0
        total_m     = 0
        for leg in legs:
            secs = int((leg.get("duration") or "0s").replace("s", ""))
            dist = int(leg.get("distanceMeters") or 0)
            leg_minutes.append(round(secs / 60))
            total_secs += secs
            total_m    += dist

        return {
            "order_indices": order_indices,
            "leg_minutes":   leg_minutes,
            "total_km":      round(total_m / 1000, 1),
            "total_minutes": round(total_secs / 60),
        }
    except Exception as exc:
        print(f"[route] Parse failed: {exc}")
        return {
            "order_indices": list(range(n_outlets)),
            "leg_minutes":   [],
            "total_km":      0.0,
            "total_minutes": 0,
        }


# ─────────────────────────────────────────────────────────────────────────────
# 3. CROW-FLY DISTANCE ESTIMATE (fallback only)
# ─────────────────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance in km between two GPS points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 1)


# ─────────────────────────────────────────────────────────────────────────────
# 4. FORMAT OUTLET STOP STRING
# ─────────────────────────────────────────────────────────────────────────────

def _primary_reason(outlet: dict) -> str:
    """Pick the most urgent reason string for the briefing."""
    if outlet.get("has_pest_alert"):
        return "pest alert active"
    reasons = outlet.get("reasons") or []
    if reasons:
        return reasons[0]
    stock = outlet.get("stock_days_remaining")
    if stock is not None and int(stock) < 7:
        return f"stock critical ({stock} days)"
    return "high priority score"


def _format_stop(stop_num: int, outlet: dict, drive_min: Optional[int] = None) -> str:
    """
    Format: "Stop 1: Sharma Agro | Score: 88 | Reason: pest alert | Drive: 12min"
    """
    name   = outlet.get("retailer_name") or outlet.get("name") or "Unknown"
    score  = round((outlet.get("priority_score") or 0) * 100)
    reason = _primary_reason(outlet)
    drive  = f"{drive_min}min" if drive_min is not None else "–"
    return f"Stop {stop_num}: {name} | Score: {score} | Reason: {reason} | Drive: {drive}"


# FIXED BUG 8: helpers for outlets that have no usable lat/lng — they still appear
# in the output (at the end) but with drive_time "—" and a clear note.
def _has_coords(outlet: dict) -> bool:
    """True only if both lat and lng are real (non-None) numbers."""
    lat, lng = outlet.get("lat"), outlet.get("lng")
    return isinstance(lat, (int, float)) and isinstance(lng, (int, float))


def _format_missing_stop(stop_num: int, outlet: dict) -> str:
    name   = outlet.get("retailer_name") or outlet.get("name") or "Unknown"
    score  = round((outlet.get("priority_score") or 0) * 100)
    reason = _primary_reason(outlet)
    return f"Stop {stop_num}: {name} | Score: {score} | Reason: {reason} | Drive: — (coordinates not available)"


def _missing_outlet_entry(outlet: dict) -> dict:
    entry = dict(outlet)
    entry["drive_time"] = "—"
    entry["note"] = "coordinates not available"
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# 5. PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

async def optimize_route(
    rep_lat: float,
    rep_lng: float,
    outlets: list,
    top_n: int = 6,
) -> dict:
    """
    Full route optimization pipeline.

    Parameters:
        rep_lat, rep_lng: rep's current position
        outlets:          ranked outlet list (dicts with lat, lng, priority_score, etc.)
        top_n:            how many outlets to include (default 6)

    Returns:
        {
          ordered_outlet_list: str,    # formatted multi-line string → fills {ordered_outlet_list} in prompt
          ordered_outlets:     list,   # full outlet dicts in driving order
          total_km:            float,
          total_minutes:       int,
          source:              str,    # "google-routes" | "priority-score-fallback"
        }
    """
    # FIXED BUG 8: split into routable (real lat/lng) vs coordinate-less outlets.
    # Routing/crow-fly only uses outlets with valid coords; the rest are appended
    # at the end of the output with drive_time "—" so they are never dropped or crash.
    ranked_all = sorted(outlets, key=lambda x: x.get("priority_score", 0), reverse=True)
    candidates = [o for o in ranked_all if _has_coords(o)][:top_n]   # FIXED BUG 8
    no_coords  = [o for o in ranked_all if not _has_coords(o)]       # FIXED BUG 8

    if not candidates:
        # FIXED BUG 8: no routable outlets — still return any coordinate-less ones.
        if no_coords:
            lines = [_format_missing_stop(i + 1, o) for i, o in enumerate(no_coords)]
            return {
                "ordered_outlet_list": "\n".join(lines),
                "ordered_outlets": [_missing_outlet_entry(o) for o in no_coords],
                "total_km": 0.0,
                "total_minutes": 0,
                "source": "no-coordinates",
            }
        return {
            "ordered_outlet_list": "No outlets available",
            "ordered_outlets": [],
            "total_km": 0.0,
            "total_minutes": 0,
            "source": "empty",
        }

    # Single outlet — no routing needed
    if len(candidates) == 1:
        # FIXED BUG 8: append any coordinate-less outlets after the single routed stop.
        lines = [_format_stop(1, candidates[0])]
        for o in no_coords:
            lines.append(_format_missing_stop(len(lines) + 1, o))
        return {
            "ordered_outlet_list": "\n".join(lines),
            "ordered_outlets": candidates + [_missing_outlet_entry(o) for o in no_coords],
            "total_km": 0.0,
            "total_minutes": 15,
            "source": "single-outlet",
        }

    # Separate intermediates from destination
    intermediates = candidates[:-1]
    destination   = candidates[-1]

    inter_coords = [(o["lat"], o["lng"]) for o in intermediates]

    # ── Try Google Routes API ─────────────────────────────────────────────────
    api_resp = await _call_routes_api(
        rep_lat, rep_lng,
        inter_coords,
        destination["lat"], destination["lng"],
    )

    if api_resp:
        parsed = _parse_routes_response(api_resp, len(intermediates))
        order  = parsed["order_indices"]

        # Reorder intermediates by the optimized index; destination stays last
        try:
            ordered = [intermediates[i] for i in order] + [destination]
        except IndexError:
            ordered = intermediates + [destination]

        leg_mins    = parsed["leg_minutes"]
        total_km    = parsed["total_km"]
        total_min   = parsed["total_minutes"]
        source      = "google-routes"
    else:
        # ── Fallback: priority-score order + crow-fly estimates ───────────────
        ordered   = candidates      # already sorted by score
        total_km  = 0.0
        prev_lat, prev_lng = rep_lat, rep_lng
        for o in ordered:
            d = _haversine_km(prev_lat, prev_lng, o["lat"], o["lng"])
            total_km += d
            prev_lat, prev_lng = o["lat"], o["lng"]
        total_km  = round(total_km, 1)
        # Estimate 30 km/h avg in rural India
        total_min = round((total_km / 30) * 60)
        leg_mins  = []
        source    = "priority-score-fallback"

    # ── Build formatted stop strings ──────────────────────────────────────────
    lines = []
    for i, outlet in enumerate(ordered):
        drive_min = leg_mins[i] if i < len(leg_mins) else None
        lines.append(_format_stop(i + 1, outlet, drive_min))

    # FIXED BUG 8: append coordinate-less outlets at the END with a clear note.
    ordered_out = list(ordered)
    for outlet in no_coords:
        lines.append(_format_missing_stop(len(lines) + 1, outlet))
        ordered_out.append(_missing_outlet_entry(outlet))

    return {
        "ordered_outlet_list": "\n".join(lines),
        "ordered_outlets":     ordered_out,  # FIXED BUG 8: includes coordinate-less outlets at end
        "total_km":            total_km,
        "total_minutes":       total_min,
        "source":              source,
    }
