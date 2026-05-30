# What it does: Route optimization + morning briefing API endpoints
#
# POST /api/route/optimize        → Google Routes API waypoint optimization only
# POST /api/route/morning-brief   → optimize + generate 3-sentence LLM briefing
#
# Both endpoints:
#   - Accept rep_id to look up the rep's district and pull today's ranked outlets
#   - Call the route optimizer (Google Routes API → priority-score fallback)
#   - Return ordered_outlet_list, total_km, total_minutes, source
#
# /morning-brief additionally:
#   - Fetches live weather via Open-Meteo
#   - Gets top alert for the district
#   - Generates 3-sentence briefing via NVIDIA GLM → OpenRouter → Gemini → rule-based
#
# Called by: Frontend Dashboard "Get Today's Route" button

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date as dt_date
from db.database import get_db
from services.route_optimizer import optimize_route
from services.morning_briefing import generate_morning_briefing
from services.weather_service import get_weather_context, DISTRICT_COORDS

router = APIRouter(tags=["route"])


class RouteRequest(BaseModel):
    rep_id:   str   = "REP_0001"
    rep_lat:  Optional[float] = None   # if None, use district centroid
    rep_lng:  Optional[float] = None
    top_n:    int   = 6
    district: Optional[str] = None    # override district if known


# ─────────────────────────────────────────────────────────────────────────────
# Helper: load ranked outlets for a rep from recommendations
# ─────────────────────────────────────────────────────────────────────────────

async def _get_outlets_for_rep(rep_id: str, db) -> tuple[list, str, str]:
    """
    Returns (outlets_list, district, rep_name).
    outlets_list: list of dicts with lat, lng, priority_score, retailer_name, etc.
    """
    # Get rep info
    rep_name = rep_id
    district = "Jalgaon"
    try:
        async with db.execute(
            "SELECT name, district FROM users WHERE rep_id=?", (rep_id,)
        ) as cur:
            row = await cur.fetchone()
            if row:
                rep_name = row["name"] or rep_id
                district = row["district"] or "Jalgaon"
    except Exception as e:
        print(f"[route] Rep lookup failed: {e}")

    # Pull retailers for this rep's district (top 10 by priority features)
    outlets = []
    try:
        async with db.execute(
            """SELECT r.retailer_id, r.retailer_name, r.district, r.tehsil,
                      r.lat, r.lng, r.stock_days_remaining, r.has_pest_alert,
                      r.crop_growth_stage, r.days_since_last_visit,
                      COALESCE(r.sales_velocity_30d, 0) as sales_vel
               FROM retailers r
               WHERE r.district=?
               AND r.lat IS NOT NULL AND r.lng IS NOT NULL
               ORDER BY r.has_pest_alert DESC, r.stock_days_remaining ASC
               LIMIT 10""",
            (district,)
        ) as cur:
            rows = await cur.fetchall()

        for r in rows:
            # Simple priority score: pest alert + low stock + overdue visit
            stock = r["stock_days_remaining"] or 14
            days  = r["days_since_last_visit"] or 7
            pest  = r["has_pest_alert"] or 0
            score = min(1.0, (pest * 0.4) + (max(0, 14 - stock) / 14) * 0.35 + (min(days, 30) / 30) * 0.25)

            reasons = []
            if pest:            reasons.append("pest alert active")
            if stock < 7:       reasons.append(f"stock critical ({stock} days)")
            if days > 14:       reasons.append(f"overdue visit ({days} days)")

            outlets.append({
                "retailer_id":          r["retailer_id"],
                "retailer_name":        r["retailer_name"],
                "district":             r["district"],
                "tehsil":               r["tehsil"],
                "lat":                  float(r["lat"]),
                "lng":                  float(r["lng"]),
                "stock_days_remaining": stock,
                "has_pest_alert":       pest,
                "crop_growth_stage":    r["crop_growth_stage"] or "vegetative",
                "days_since_last_visit":days,
                "priority_score":       round(score, 3),
                "reasons":              reasons or ["high priority score"],
            })
    except Exception as e:
        print(f"[route] Outlet query failed: {e}")

    # Sort by computed priority score
    outlets.sort(key=lambda x: x["priority_score"], reverse=True)
    return outlets, district, rep_name


# ─────────────────────────────────────────────────────────────────────────────
# Helper: get top alert message for district
# ─────────────────────────────────────────────────────────────────────────────

async def _get_top_alert(district: str, db) -> str:
    try:
        async with db.execute(
            """SELECT message FROM alerts
               WHERE district=? AND dismissed=0
               ORDER BY severity DESC, id DESC
               LIMIT 1""",
            (district,)
        ) as cur:
            row = await cur.fetchone()
            if row:
                return row["message"] or "No alerts"
    except Exception as e:
        print(f"[route] Alert query failed: {e}")
    return "No alerts today"


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/route/optimize
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/route/optimize")
async def route_optimize(req: RouteRequest, db=Depends(get_db)):
    """
    Run Google Routes API waypoint optimization for the rep's top outlets.

    Returns the ordered outlet list string, per-stop drive times,
    total_km, total_minutes, and the data source (google-routes | priority-score-fallback).

    Use this when you need the route data only (no briefing text).
    """
    outlets, district, rep_name = await _get_outlets_for_rep(req.rep_id, db)

    override_district = req.district or district
    rep_lat = req.rep_lat
    rep_lng = req.rep_lng

    # Default rep position to district centroid if not provided
    if rep_lat is None or rep_lng is None:
        d_key = override_district.strip().lower()
        rep_lat, rep_lng = DISTRICT_COORDS.get(d_key, DISTRICT_COORDS["default"])

    result = await optimize_route(rep_lat, rep_lng, outlets, top_n=req.top_n)

    return {
        "rep_id":               req.rep_id,
        "rep_name":             rep_name,
        "district":             override_district,
        "date":                 dt_date.today().isoformat(),
        "ordered_outlet_list":  result["ordered_outlet_list"],
        "ordered_outlets":      result["ordered_outlets"],
        "total_km":             result["total_km"],
        "total_minutes":        result["total_minutes"],
        "route_source":         result["source"],
        "outlet_count":         len(result["ordered_outlets"]),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/route/morning-brief
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/route/morning-brief")
async def morning_brief(req: RouteRequest, db=Depends(get_db)):
    """
    Full morning pipeline:

    1. Pull rep's ranked outlets for their district
    2. Run Google Routes API waypoint optimization (→ priority-score fallback)
    3. Fetch live weather via Open-Meteo
    4. Get top district alert
    5. Generate 3-sentence briefing via NVIDIA GLM-5.1 → OpenRouter → Gemini → rule-based

    Response includes:
        briefing:  {line1, line2, line3, full_text, source}
        route:     {ordered_outlet_list, total_km, total_minutes, route_source}
        weather:   {rainfall_mm, temp_c, weather_risk, ...}
        top_alert: str
    """
    outlets, district, rep_name = await _get_outlets_for_rep(req.rep_id, db)

    override_district = req.district or district
    rep_lat = req.rep_lat
    rep_lng = req.rep_lng

    if rep_lat is None or rep_lng is None:
        d_key = override_district.strip().lower()
        rep_lat, rep_lng = DISTRICT_COORDS.get(d_key, DISTRICT_COORDS["default"])

    # 1. Optimize route
    route_result = await optimize_route(rep_lat, rep_lng, outlets, top_n=req.top_n)

    # 2. Live weather
    try:
        wx = await get_weather_context(override_district)
        weather_risk = wx["weather_risk"]
    except Exception:
        wx = {}
        weather_risk = "normal"

    # 3. Top alert
    top_alert = await _get_top_alert(override_district, db)

    # 4. Generate 3-sentence briefing
    today = dt_date.today().strftime("%d %b %Y")
    briefing = await generate_morning_briefing(
        rep_name=rep_name,
        date=today,
        district=override_district,
        ordered_outlet_list=route_result["ordered_outlet_list"],
        total_km=route_result["total_km"],
        total_minutes=route_result["total_minutes"],
        top_alert_message=top_alert,
        weather_risk=weather_risk,
    )

    print(
        f"[route] Morning brief for {rep_name} ({override_district}): "
        f"{len(route_result['ordered_outlets'])} stops | "
        f"{route_result['total_km']}km | "
        f"brief_source={briefing['source']}"
    )

    return {
        "rep_id":      req.rep_id,
        "rep_name":    rep_name,
        "district":    override_district,
        "date":        today,
        "briefing":    briefing,
        "route": {
            "ordered_outlet_list": route_result["ordered_outlet_list"],
            "ordered_outlets":     route_result["ordered_outlets"],
            "total_km":            route_result["total_km"],
            "total_minutes":       route_result["total_minutes"],
            "outlet_count":        len(route_result["ordered_outlets"]),
            "route_source":        route_result["source"],
        },
        "weather":     dict(wx),
        "top_alert":   top_alert,
    }
