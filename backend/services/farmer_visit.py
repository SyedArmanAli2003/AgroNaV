# What it does: Farmer Visit Planner — Gap 6
#
# Three-step pipeline (exactly as specified):
#
#   Step 1 — Google Maps Geocoding API (one-time per village, cached in DB)
#     GET https://maps.googleapis.com/maps/api/geocode/json
#         ?address={village}+{tehsil}+{district}+India&key=KEY
#     Extracts: results[0].geometry.location.lat/lng
#     Stored in growers.lat, growers.lng, growers.geocoded_at
#
#   Step 2 — Compute detour cost (no API, pure math)
#     detour_minutes = haversine(nearest_retailer, farmer_village) / 30 * 60
#     avg_speed = 30 km/h (rural India standard)
#
#   Step 3 — DB queries for remaining fields
#     days_since_purchase → SELECT date FROM visit_logs WHERE outlet_id=? ORDER BY date DESC LIMIT 1
#     campaign_status     → SELECT status,campaign_name FROM whatsapp_campaigns WHERE grower_id=?
#     ndvi_value          → reuse weather_service.get_weather_context() (same Open-Meteo call as Gap 1)
#     nearest_alert_km    → nearest alert from alerts table by district
#
#   Step 4 — Eligibility check (4 rules from prompt spec)
#     - Crop at critical stage AND no purchase 14+ days → eligible
#     - WhatsApp opened/clicked but no purchase → eligible (warm lead)
#     - Farm within 5km of route retailer → eligible (free visit)
#     - None → visit_type = skip_today
#
#   Step 5 — LLM analysis: NVIDIA GLM-5.1 → OpenRouter → Gemini → rule-based
#
# Output:
#   { visit_type, recommended_product, agronomic_advice,
#     conversation_starter, visit_reason, estimated_value,
#     source, detour_minutes, nearest_retailer_name, distance_km }
#
# Called by: routers/farmers.py

import os
import math
import httpx
from datetime import date, timedelta

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
NVIDIA_API_KEY      = os.getenv("NVIDIA_API_KEY", "")
OPENROUTER_API_KEY  = os.getenv("OPENROUTER_API_KEY", "")
GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY", "")

# Critical crop stages — presence triggers eligibility rule 1
CRITICAL_STAGES = {"flowering", "fruiting", "booting", "heading", "pod_fill",
                   "grain_fill", "late_vegetative", "reproductive"}

SYNGENTA_PRODUCTS = [
    "Actara 25 WG", "Alto 5 SC", "Amistar 250 SC", "Ampligo 150 ZC",
    "Kavach 75 WP", "Tilt 250 EC", "Score 250 EC", "Vertimec 1.8 EC"
]

DATASET_END_DATE = date(2026, 3, 29)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Geocoding (one-time, cached)
# ─────────────────────────────────────────────────────────────────────────────

async def geocode_village(village: str, tehsil: str, district: str) -> tuple[float, float] | tuple[None, None]:
    """
    GET https://maps.googleapis.com/maps/api/geocode/json
        ?address={village}+{tehsil}+{district}+India&key=KEY

    Returns (lat, lng) or (None, None) on failure.
    """
    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY.startswith("YOUR"):
        return None, None

    address = f"{village}+{tehsil}+{district}+India".replace(" ", "+")
    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_MAPS_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            data = resp.json()
        if data.get("status") == "OK" and data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return float(loc["lat"]), float(loc["lng"])
    except Exception as e:
        print(f"[farmer] Geocoding failed for {village}: {e}")
    return None, None


async def get_or_geocode(grower: dict, db) -> tuple[float, float]:
    """
    Return cached (lat, lng) from DB; geocode and cache if missing.
    """
    lat = grower.get("lat")
    lng = grower.get("lng")
    if lat and lng:
        return float(lat), float(lng)

    village  = grower.get("village", "")
    tehsil   = grower.get("tehsil", "")
    district = grower.get("district", "")

    lat, lng = await geocode_village(village, tehsil, district)

    # Fallback: use district centroid from weather service
    if lat is None:
        from services.weather_service import DISTRICT_COORDS
        lat, lng = DISTRICT_COORDS.get(district.lower(), DISTRICT_COORDS["default"])
        # Add small random offset so farmers cluster near but not exactly on centroid
        import hashlib
        h = int(hashlib.md5(village.encode()).hexdigest(), 16)
        lat += ((h % 200) - 100) / 10000   # ±0.01° ≈ ±1.1 km
        lng += ((h % 300) - 150) / 10000

    # Cache to DB
    if grower.get("grower_id"):
        try:
            await db.execute(
                "UPDATE growers SET lat=?, lng=?, geocoded_at=? WHERE grower_id=?",
                (lat, lng, date.today().isoformat(), grower["grower_id"])
            )
            await db.commit()
        except Exception as e:
            print(f"[farmer] Cache write failed: {e}")

    return lat, lng


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Detour cost
# ─────────────────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return round(R * 2 * math.asin(math.sqrt(max(0, a))), 2)


def compute_detour_minutes(retailer_lat: float, retailer_lng: float,
                           farmer_lat: float, farmer_lng: float,
                           avg_speed_kmh: float = 30.0) -> tuple[float, float]:
    """
    Returns (distance_km, detour_minutes).
    detour_minutes = distance_km / avg_speed_kmh * 60
    Uses 30 km/h as specified for rural India roads.
    """
    dist_km = haversine_km(retailer_lat, retailer_lng, farmer_lat, farmer_lng)
    minutes = round(dist_km / avg_speed_kmh * 60, 1)
    return dist_km, minutes


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: DB queries
# ─────────────────────────────────────────────────────────────────────────────

async def _days_since_purchase(grower_id: str, db) -> int:
    """SELECT date FROM visit_logs WHERE outlet_id=? ORDER BY date DESC LIMIT 1"""
    try:
        async with db.execute(
            "SELECT date FROM visit_logs WHERE outlet_id=? ORDER BY date DESC LIMIT 1",
            (grower_id,)
        ) as cur:
            row = await cur.fetchone()
        if row and row["date"]:
            d = date.fromisoformat(str(row["date"]))
            return (DATASET_END_DATE - d).days
    except Exception as e:
        print(f"[farmer] days_since_purchase query failed: {e}")
    return 30   # conservative default → triggers eligibility


async def _campaign_status(grower_id: str, db) -> tuple[str, str]:
    """SELECT message_status, campaign_name FROM whatsapp_campaigns WHERE grower_id=?"""
    try:
        async with db.execute(
            "SELECT message_status, campaign_name FROM whatsapp_campaigns WHERE grower_id=? ORDER BY id DESC LIMIT 1",
            (grower_id,)
        ) as cur:
            row = await cur.fetchone()
        if row:
            return row["message_status"] or "sent", row["campaign_name"] or "Kharif 2026 Campaign"
    except Exception as e:
        print(f"[farmer] campaign_status query failed: {e}")
    return "not_enrolled", "No campaign"


async def _nearest_alert(district: str, db) -> tuple[str, str]:
    """Get the nearest active alert for the district."""
    try:
        async with db.execute(
            "SELECT message, severity FROM alerts WHERE district=? AND dismissed=0 ORDER BY severity DESC LIMIT 1",
            (district,)
        ) as cur:
            row = await cur.fetchone()
        if row:
            return row["message"] or "district pest alert", "pest"
    except Exception as e:
        print(f"[farmer] alert query failed: {e}")
    return "No active alerts", "none"


async def _nearest_retailer(grower_lat: float, grower_lng: float, district: str, db) -> tuple[str, str, float, float]:
    """
    Find the nearest retailer with known lat/lng to the farmer.
    Falls back to outlets table which has lat/lng.
    Returns (retailer_id, retailer_name, retailer_lat, retailer_lng).
    """
    from services.weather_service import DISTRICT_COORDS
    # Use outlets table (has lat/lng) as primary source
    try:
        async with db.execute(
            "SELECT id, name, lat, lng FROM outlets WHERE district=? AND lat IS NOT NULL LIMIT 20",
            (district,)
        ) as cur:
            rows = await cur.fetchall()
        if rows:
            best = min(rows, key=lambda r: haversine_km(grower_lat, grower_lng, float(r["lat"]), float(r["lng"])))
            return str(best["id"]), best["name"], float(best["lat"]), float(best["lng"])
    except Exception as e:
        print(f"[farmer] retailer lookup failed: {e}")

    # Last resort: district centroid
    lat, lng = DISTRICT_COORDS.get(district.lower(), DISTRICT_COORDS["default"])
    return "unknown", f"{district} Agro Kendra", lat, lng


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Eligibility rules
# ─────────────────────────────────────────────────────────────────────────────

def check_eligibility(
    growth_stage: str,
    days_since_purchase: int,
    message_status: str,
    distance_km: float,
) -> tuple[str, str]:
    """
    Returns (visit_type, visit_reason) based on the 4 eligibility rules.

    visit_type values:
      "priority_visit"  — critical stage + no recent purchase
      "warm_lead_visit" — WhatsApp opened/clicked
      "free_visit"      — within 5km of route
      "skip_today"      — none of the above
    """
    stage_lower = growth_stage.lower().replace(" ", "_")

    # Rule 1: Critical stage AND no purchase in 14+ days
    if stage_lower in CRITICAL_STAGES and days_since_purchase >= 14:
        return "priority_visit", (
            f"Crop at {growth_stage} stage — critical input window. "
            f"No purchase in {days_since_purchase} days."
        )

    # Rule 2: WhatsApp opened or clicked but no purchase (warm lead)
    if message_status in ("opened", "clicked", "read") and days_since_purchase >= 7:
        return "warm_lead_visit", (
            f"WhatsApp message {message_status} — warm lead with no follow-up purchase."
        )

    # Rule 3: Farm within 5km of route retailer (free visit)
    if distance_km <= 5.0:
        return "free_visit", (
            f"Farm is {distance_km}km from nearest route retailer — zero extra detour cost."
        )

    return "skip_today", "Does not meet any visit eligibility criteria today."


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: LLM Prompt + Analysis
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM = (
    "You are a Syngenta India agronomist advising on smallholder farmer visits. "
    "Return ONLY valid JSON matching the exact schema. No markdown, no extra keys."
)

_EMPTY = {
    "visit_type": "skip_today",
    "recommended_product": None,
    "agronomic_advice": "",
    "conversation_starter": "",
    "visit_reason": "",
    "estimated_value": "",
}


def _build_prompt(ctx: dict) -> str:
    return f"""\
You are a Syngenta India agronomist advising on smallholder farmer visits.

FARMER: {ctx['farmer_name']} | Village: {ctx['village']} | {ctx['district']}
FARM: {ctx['farm_acres']} acres | Crop: {ctx['crop_type']} | Stage: {ctx['growth_stage']}
LAST PURCHASE: {ctx['days_since_purchase']} days ago | Product: {ctx['last_product']}

ENGAGEMENT:
- WhatsApp: {ctx['campaign_name']} | Status: {ctx['message_status']}
- Last visit outcome: {ctx['prev_outcome']}

ENVIRONMENT:
- Nearest pest alert: {ctx['nearest_alert_km']}km | Type: {ctx['alert_type']}
- Rainfall last 7 days: {ctx['rainfall_mm']}mm | NDVI: {ctx['ndvi_value']} ({ctx['ndvi_label']})

ROUTE CONTEXT:
- Nearest retailer in today's plan: {ctx['nearest_retailer_name']} ({ctx['distance_km']}km away)
- Detour cost: {ctx['detour_minutes']} minutes

VISIT ELIGIBILITY (must meet at least one):
- Crop at critical stage AND no purchase in 14+ days → eligible
- WhatsApp opened or clicked but no purchase → eligible (warm lead)
- Farm within 5km of retailer already on route → eligible (free visit)
- None of above → visit_type = skip_today, recommended_product = null

RULES:
- agronomic_advice must name the specific crop and growth stage
- conversation_starter must use farmer's name and their crop situation
- Never recommend a product if visit_type is skip_today

Return ONLY valid JSON, no markdown:
{{"visit_type":"","recommended_product":null,"agronomic_advice":"","conversation_starter":"","visit_reason":"","estimated_value":""}}"""


def _rule_based(ctx: dict, visit_type: str, visit_reason: str) -> dict:
    """Zero-API deterministic fallback — every field cites a real data point."""
    farmer  = ctx["farmer_name"]
    crop    = ctx["crop_type"]
    stage   = ctx["growth_stage"]
    dist    = ctx["district"]
    days    = ctx["days_since_purchase"]
    rain    = ctx["rainfall_mm"]
    ndvi    = ctx["ndvi_value"]
    ndvi_l  = ctx["ndvi_label"]
    ret     = ctx["nearest_retailer_name"]
    det     = ctx["detour_minutes"]
    acres   = ctx["farm_acres"]

    if visit_type == "skip_today":
        return {**_EMPTY, "visit_type": "skip_today", "visit_reason": visit_reason}

    # Pick best product based on crop + stage
    crop_lower = crop.lower()
    stage_lower = stage.lower()
    if "fungal" in ctx.get("alert_type", "").lower() or rain > 20:
        product = "Amistar 250 SC"
        adv = (f"With {rain}mm rainfall and {ndvi_l} NDVI ({ndvi}) on your {acres}-acre {crop} "
               f"at {stage}, fungal pressure is elevated. Apply {product} as a preventive spray.")
    elif "insect" in ctx.get("alert_type", "").lower() or "pest" in ctx.get("alert_type", "").lower():
        product = "Actara 25 WG"
        adv = (f"District pest alert active near {dist}. Your {crop} at {stage} is at risk. "
               f"{product} provides rapid knockdown — {acres} acres can be covered in one spray.")
    elif "flowering" in stage_lower or "fruiting" in stage_lower:
        product = "Ampligo 150 ZC"
        adv = (f"Your {crop} is at {stage} — the critical yield-determination window. "
               f"NDVI at {ndvi} ({ndvi_l}) confirms crop needs protection now. "
               f"{product} recommended for pest and disease dual action.")
    else:
        product = "Tilt 250 EC"
        adv = (f"Your {crop} at {stage} stage with NDVI {ndvi} ({ndvi_l}) is a routine check. "
               f"{product} maintains protection through the coming growth phase.")

    starter = (
        f"Namaste {farmer}ji, your {crop} looks like it's at the {stage} stage — "
        f"I wanted to check in personally since it's been {days} days since your last purchase."
    )

    # Estimated value: acres × 2 bags/acre × ₹800/bag
    est_val = f"Rs.{int(acres * 2 * 800):,}"

    return {
        "visit_type":          visit_type,
        "recommended_product": product,
        "agronomic_advice":    adv,
        "conversation_starter": starter,
        "visit_reason":        visit_reason,
        "estimated_value":     est_val,
    }


async def _run_llm(ctx: dict) -> tuple[dict | None, str]:
    """Run NVIDIA → OpenRouter → Gemini. Returns (result, source) or (None, '')."""
    import json

    prompt = _build_prompt(ctx)

    # Tier 1: NVIDIA GLM-5.1
    if NVIDIA_API_KEY and not NVIDIA_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=NVIDIA_API_KEY)
            resp = client.chat.completions.create(
                model="z-ai/glm-5.1",
                messages=[{"role": "system", "content": _SYSTEM}, {"role": "user", "content": prompt}],
                temperature=0.3, max_tokens=500, stream=False,
            )
            text = resp.choices[0].message.content.strip().replace("```json","").replace("```","").strip()
            result = json.loads(text)
            if "visit_type" in result:
                return result, "nvidia-glm-5.1"
        except Exception as e:
            print(f"[farmer] NVIDIA GLM failed: {e}")

    # Tier 2: OpenRouter LLaMA
    if OPENROUTER_API_KEY and not OPENROUTER_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
            resp = client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct",
                messages=[{"role": "system", "content": _SYSTEM}, {"role": "user", "content": prompt}],
                temperature=0.3, max_tokens=500,
            )
            text = resp.choices[0].message.content.strip().replace("```json","").replace("```","").strip()
            result = json.loads(text)
            if "visit_type" in result:
                return result, "openrouter-llama3"
        except Exception as e:
            print(f"[farmer] OpenRouter failed: {e}")

    # Tier 3: Gemini
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(model_name="gemini-2.0-flash", system_instruction=_SYSTEM)
            resp  = model.generate_content(prompt)
            text  = resp.text.strip().replace("```json","").replace("```","").strip()
            result = json.loads(text)
            if "visit_type" in result:
                return result, "gemini-2.0-flash"
        except Exception as e:
            print(f"[farmer] Gemini failed: {e}")

    return None, ""


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

async def plan_farmer_visit(grower: dict, db) -> dict:
    """
    Full Gap 6 pipeline for one farmer.

    Parameters:
        grower: dict with grower_id, farmer_name, village, tehsil, district,
                farm_acres, crop_type, growth_stage, last_product, last_purchase_date
        db:     aiosqlite connection

    Returns:
        Full visit plan dict including LLM output + all context signals.
    """
    grower_id = grower.get("grower_id", "G_UNKNOWN")
    district  = grower.get("district", "Jalgaon")

    # Step 1: Geocode (cached)
    farmer_lat, farmer_lng = await get_or_geocode(grower, db)

    # Step 3a: Days since purchase from DB (or grower.last_purchase_date)
    days_since = await _days_since_purchase(grower_id, db)
    if grower.get("last_purchase_date"):
        try:
            d = date.fromisoformat(str(grower["last_purchase_date"]))
            days_since = (DATASET_END_DATE - d).days
        except Exception:
            pass

    # Step 3b: WhatsApp campaign status
    message_status, campaign_name = await _campaign_status(grower_id, db)

    # Step 3c: Weather + NDVI (reuses Gap 1 service)
    try:
        from services.weather_service import get_weather_context
        wx = await get_weather_context(district)
        rainfall_mm = wx["rainfall_mm"]
        ndvi_value  = wx["ndvi_value"]
        ndvi_label  = wx["ndvi_label"]
    except Exception:
        rainfall_mm, ndvi_value, ndvi_label = 0.0, 0.41, "moderate crop stress"

    # Step 3d: Nearest active alert
    alert_msg, alert_type = await _nearest_alert(district, db)

    # Step 3e: Nearest retailer on route
    ret_id, ret_name, ret_lat, ret_lng = await _nearest_retailer(farmer_lat, farmer_lng, district, db)

    # Step 2: Detour cost
    distance_km, detour_minutes = compute_detour_minutes(ret_lat, ret_lng, farmer_lat, farmer_lng)

    # Step 4: Eligibility
    growth_stage = grower.get("growth_stage", "vegetative")
    visit_type, visit_reason = check_eligibility(
        growth_stage, days_since, message_status, distance_km
    )

    # Build full context for prompt
    ctx = {
        "farmer_name":           grower.get("farmer_name", "Farmer"),
        "village":               grower.get("village", ""),
        "district":              district,
        "farm_acres":            grower.get("farm_acres", 2.0),
        "crop_type":             grower.get("crop_type", "cotton"),
        "growth_stage":          growth_stage,
        "days_since_purchase":   days_since,
        "last_product":          grower.get("last_product") or "N/A",
        "campaign_name":         campaign_name,
        "message_status":        message_status,
        "prev_outcome":          grower.get("prev_outcome", "no prior visit"),
        "nearest_alert_km":      0 if alert_type != "none" else 999,
        "alert_type":            alert_type,
        "rainfall_mm":           rainfall_mm,
        "ndvi_value":            ndvi_value,
        "ndvi_label":            ndvi_label,
        "nearest_retailer_name": ret_name,
        "distance_km":           round(distance_km, 1),
        "detour_minutes":        detour_minutes,
    }

    # Step 5: LLM or rule-based
    result, source = await _run_llm(ctx)

    if result is None:
        result = _rule_based(ctx, visit_type, visit_reason)
        source = "rule-based"
    else:
        # Enforce skip_today rule — LLM must not override eligibility
        if visit_type == "skip_today":
            result["visit_type"]          = "skip_today"
            result["recommended_product"] = None
        # Validate product is from Syngenta catalog
        if result.get("recommended_product") and result["recommended_product"] not in SYNGENTA_PRODUCTS:
            result["recommended_product"] = SYNGENTA_PRODUCTS[0]

    print(
        f"[farmer] {grower.get('farmer_name')} ({district}): "
        f"visit={result['visit_type']} dist={distance_km}km detour={detour_minutes}min source={source}"
    )

    return {
        **result,
        "source":                source,
        "grower_id":             grower_id,
        "farmer_lat":            farmer_lat,
        "farmer_lng":            farmer_lng,
        "distance_km":           round(distance_km, 1),
        "detour_minutes":        detour_minutes,
        "nearest_retailer_id":   ret_id,
        "nearest_retailer_name": ret_name,
        "days_since_purchase":   days_since,
        "message_status":        message_status,
        "ndvi_value":            ndvi_value,
        "ndvi_label":            ndvi_label,
        "rainfall_mm":           rainfall_mm,
        "weather_source":        wx.get("source", "open-meteo") if "wx" in dir() else "fallback",
    }
