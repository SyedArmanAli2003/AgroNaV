# What it does: Competitive intelligence agent for Syngenta India
#
# Pipeline:
#   Step 1: Google Places API (New) — nearby agro stores within 2km of outlet coords
#           POST https://places.googleapis.com/v1/places:searchNearby
#           Filter: keep only names with "agro","seeds","krishi","fertilizer","pesticide","farm"
#           Returns: "Rajan Agro Centre (450m), Krishna Seeds (1.2km)"  → nearby_stores_list
#
#   Step 2: Build judge-facing prompt with all real signals
#           (rep_text_input, nearby_stores_list, outlet context, crop_stage)
#
#   Step 3: LLM classification — Gemini 1.5 Flash → OpenRouter LLaMA-3 → rule-based fallback
#           Returns the 8-field JSON: threat_type, threat_level, competitor_name,
#           at_risk_syngenta_products, defensive_talking_point, immediate_action,
#           escalate_to_manager, opportunity_flag
#
#   Step 4: Persist to competitor_intel table (deduped by retailer_id + date)
#
# Input:  retailer_id, outlet_name, district, tehsil, lat, lng,
#         rep_text_input, stock_days_remaining, days_since_purchase, crop_stage
# Output: CompetitorIntelResult dict
#
# Called by: routers/competitor.py, routers/visit_log.py (on competitor_observation submit)

import os
import json
import re
import httpx
from datetime import date, datetime
from typing import Optional

GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GOOGLE_MAPS_API_KEY= os.getenv("GOOGLE_MAPS_API_KEY", "")

SYNGENTA_SKUS = [
    "Actara 25 WG", "Ampligo 150 ZC", "Tilt 250 EC",
    "Amistar 250 SC", "Kavach 75 WP",
]

# Keywords that identify an agro-input store in Google Places results
AGRO_KEYWORDS = {"agro", "seeds", "krishi", "fertilizer", "pesticide", "farm",
                 "kisan", "khad", "beej", "biotech", "nursery", "agrochemical"}

# ── Classification prompt (mirrors judge-facing spec exactly) ─────────────────
_SYSTEM = (
    "You are a competitive intelligence agent for Syngenta India. "
    "Classify the rep observation strictly using the given rules. "
    "Return ONLY valid JSON, no markdown, no commentary."
)

_PROMPT_TEMPLATE = """\
You are a competitive intelligence agent for Syngenta India.

REP OBSERVATION: "{rep_text}"
DATE: {today} | LOCATION: {district}, {tehsil}
NEARBY AGRO STORES (Google Places, 2km radius): {nearby_stores}

OUTLET AT RISK: {outlet_name}
STOCK: {stock_days} days | LAST PURCHASE: {days_since_purchase} days ago
CROP STAGE: {crop_stage}

SYNGENTA SKUs TO EVALUATE:
[Actara 25 WG, Ampligo 150 ZC, Tilt 250 EC, Amistar 250 SC, Kavach 75 WP]

CLASSIFICATION (pick one):
- Price mentioned lower → price_undercut
- New scheme or product mentioned → new_promotion
- Unknown store near high-priority outlet → proximity_threat
- Competitor product unavailable → competitor_stockout (opportunity)
- Nothing clear → none

STRICT RULES:
- defensive_talking_point must NOT name any competitor
- threat_type = none → all fields null except opportunity_flag = false
- threat_type = competitor_stockout → opportunity_flag = true, aggressive push in immediate_action
- escalate_to_manager = true only if threat_level is HIGH

Return ONLY valid JSON, no markdown:
{{"threat_type":"","threat_level":"","competitor_name":"","at_risk_syngenta_products":[],"defensive_talking_point":"","immediate_action":"","escalate_to_manager":false,"opportunity_flag":false}}"""


# ─────────────────────────────────────────────────────────────────────────────
# 1. GOOGLE PLACES NEARBY SEARCH
# ─────────────────────────────────────────────────────────────────────────────

async def _get_nearby_stores(lat: float, lng: float, radius_m: int = 2000) -> str:
    """
    POST https://places.googleapis.com/v1/places:searchNearby
    Filter by agro keyword in display name.
    Returns formatted string: "Rajan Agro Centre (450m), Krishna Seeds (1.2km)"
    Falls back to "None detected" if no key or network error.
    """
    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY.startswith("YOUR"):
        print("[competitor] No Google Maps key — skipping nearby search")
        return "None detected (no Maps API key)"

    url = "https://places.googleapis.com/v1/places:searchNearby"
    headers = {
        "Content-Type":  "application/json",
        "X-Goog-Api-Key":    GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":  "places.displayName,places.formattedAddress,places.location",
    }
    body = {
        "includedTypes": ["store"],
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(radius_m),
            }
        },
        "maxResultCount": 20,
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        print(f"[competitor] Google Places call failed: {exc}")
        return "None detected (Places API error)"

    places = data.get("places", [])
    agro_stores = []

    for place in places:
        name = (place.get("displayName") or {}).get("text", "") or ""
        loc  = place.get("location", {})
        p_lat, p_lng = loc.get("latitude", lat), loc.get("longitude", lng)

        # Distance in metres (Haversine approximation)
        dlat = (p_lat - lat) * 111_320
        dlng = (p_lng - lng) * 111_320 * 0.85  # rough cos(lat) for India
        dist = int((dlat**2 + dlng**2) ** 0.5)

        # Keep only agro-input stores
        if any(kw in name.lower() for kw in AGRO_KEYWORDS):
            dist_label = f"{dist}m" if dist < 1000 else f"{dist/1000:.1f}km"
            agro_stores.append((dist, f"{name} ({dist_label})"))

    agro_stores.sort(key=lambda x: x[0])   # nearest first
    result = ", ".join(s[1] for s in agro_stores[:5])
    return result if result else "None detected"


# ─────────────────────────────────────────────────────────────────────────────
# 2. RULE-BASED FALLBACK CLASSIFIER
# ─────────────────────────────────────────────────────────────────────────────

# Keyword maps for offline classification
_PRICE_WORDS   = {"cheaper","price","rate","discount","less","low price","undercut","offer"}
_SCHEME_WORDS  = {"scheme","promotion","launch","new product","cashback","bonus","deal","incentive"}
_STOCKOUT_WORDS= {"out of stock","not available","no stock","finished","exhausted","sold out"}
_COMP_BRANDS   = {"bayer","syngenta rival","basf","fmc","pi industries","dhanuka","upl","coromandel","rallis","excel","gharda","atul"}


def _rule_based_classify(
    rep_text: str,
    nearby_stores: str,
    outlet_name: str,
    stock_days: int,
    crop_stage: str,
) -> dict:
    """
    Deterministic classification — no API needed.
    Cites specific signals from the rep text and context.
    """
    text_lower = rep_text.lower() if rep_text else ""

    # Detect competitor brand name
    detected_brand = next((b.title() for b in _COMP_BRANDS if b in text_lower), None)

    # Rule priority order matches the prompt spec
    if any(w in text_lower for w in _STOCKOUT_WORDS):
        # Competitor stockout = opportunity
        skus = SYNGENTA_SKUS[:3] if stock_days < 7 else SYNGENTA_SKUS[:2]
        return {
            "threat_type":             "competitor_stockout",
            "threat_level":            "HIGH",
            "competitor_name":         detected_brand or "Unknown competitor",
            "at_risk_syngenta_products": skus,
            "defensive_talking_point": (
                f"Syngenta has {stock_days} days of stock at {outlet_name} right now — "
                f"farmers can switch immediately without waiting. "
                f"Our {skus[0]} is proven for {crop_stage} stage protection."
            ),
            "immediate_action": (
                f"Competitor product unavailable in {crop_stage} season — "
                f"aggressive push on {skus[0]} and {skus[1]} NOW. "
                f"Offer immediate delivery commitment to capture switched demand."
            ),
            "escalate_to_manager": True,
            "opportunity_flag":    True,
        }

    if any(w in text_lower for w in _PRICE_WORDS):
        skus = [s for s in SYNGENTA_SKUS if any(k in s.lower() for k in ["tilt","kavach","amistar"])][:2]
        if not skus:
            skus = SYNGENTA_SKUS[:2]
        return {
            "threat_type":             "price_undercut",
            "threat_level":            "MEDIUM",
            "competitor_name":         detected_brand or "Unknown competitor",
            "at_risk_syngenta_products": skus,
            "defensive_talking_point": (
                f"Our products come with Syngenta's agronomic support, field trial data, "
                f"and counterfeit-proof packaging — total value per acre is higher, "
                f"not just the sticker price. Ask about our per-acre yield comparison."
            ),
            "immediate_action": (
                f"Counter price objection at {outlet_name}: "
                f"share per-acre ROI data for {skus[0]}. "
                f"Offer Syngenta loyalty scheme if applicable."
            ),
            "escalate_to_manager": False,
            "opportunity_flag":    False,
        }

    if any(w in text_lower for w in _SCHEME_WORDS):
        return {
            "threat_type":             "new_promotion",
            "threat_level":            "MEDIUM",
            "competitor_name":         detected_brand or "Unknown competitor",
            "at_risk_syngenta_products": SYNGENTA_SKUS[:2],
            "defensive_talking_point": (
                f"Syngenta runs verified, season-long programs — "
                f"not one-time offers. Ask your Syngenta rep about current "
                f"Kharif 2026 loyalty benefits and demo trial kits."
            ),
            "immediate_action": (
                f"Report new competitor promotion at {outlet_name} to manager. "
                f"Offer equivalent Syngenta scheme if available this season."
            ),
            "escalate_to_manager": False,
            "opportunity_flag":    False,
        }

    if nearby_stores and nearby_stores not in ("None detected", "None detected (no Maps API key)"):
        n_stores = len(nearby_stores.split(","))
        return {
            "threat_type":             "proximity_threat",
            "threat_level":            "LOW",
            "competitor_name":         None,
            "at_risk_syngenta_products": SYNGENTA_SKUS[:2],
            "defensive_talking_point": (
                f"{n_stores} agro store(s) detected within 2km of {outlet_name}. "
                f"Ensure Syngenta shelf space is prominent and stock is full. "
                f"Visibility at the counter is the best defence."
            ),
            "immediate_action": (
                f"Check Syngenta shelf presence at {outlet_name}. "
                f"Arrange demo display if possible before next rep visit."
            ),
            "escalate_to_manager": False,
            "opportunity_flag":    False,
        }

    # No threat detected
    return {
        "threat_type":             "none",
        "threat_level":            None,
        "competitor_name":         None,
        "at_risk_syngenta_products": [],
        "defensive_talking_point": None,
        "immediate_action":        None,
        "escalate_to_manager":     False,
        "opportunity_flag":        False,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. LLM CLASSIFICATION  (Gemini → OpenRouter → rule-based)
# ─────────────────────────────────────────────────────────────────────────────

async def _classify_with_llm(
    rep_text: str,
    nearby_stores: str,
    outlet_name: str,
    district: str,
    tehsil: str,
    stock_days: int,
    days_since_purchase: int,
    crop_stage: str,
) -> tuple[dict, str]:
    """Returns (result_dict, source_label)."""
    today = date.today().isoformat()
    prompt = _PROMPT_TEMPLATE.format(
        rep_text=rep_text or "(no observation entered)",
        today=today,
        district=district,
        tehsil=tehsil,
        nearby_stores=nearby_stores,
        outlet_name=outlet_name,
        stock_days=stock_days,
        days_since_purchase=days_since_purchase,
        crop_stage=crop_stage,
    )

    # ── Gemini ────────────────────────────────────────────────────────────────
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                system_instruction=_SYSTEM,
            )
            resp = model.generate_content(prompt)
            text = resp.text.strip().replace("```json", "").replace("```", "").strip()
            result = json.loads(text)
            _validate_result(result)
            return result, "gemini-2.0-flash"
        except Exception as exc:
            print(f"[competitor] Gemini failed: {exc}")

    # ── OpenRouter LLaMA ──────────────────────────────────────────────────────
    if OPENROUTER_API_KEY and not OPENROUTER_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
            resp = client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct",
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.2,
                max_tokens=400,
            )
            text = resp.choices[0].message.content.strip().replace("```json","").replace("```","").strip()
            result = json.loads(text)
            _validate_result(result)
            return result, "openrouter-llama3"
        except Exception as exc:
            print(f"[competitor] OpenRouter failed: {exc}")

    # ── Rule-based fallback ───────────────────────────────────────────────────
    result = _rule_based_classify(rep_text, nearby_stores, outlet_name, stock_days, crop_stage)
    return result, "rule-based"


def _validate_result(r: dict) -> None:
    """Enforce strict rules from the prompt spec. Raises ValueError if broken."""
    required = {"threat_type","threat_level","competitor_name",
                "at_risk_syngenta_products","defensive_talking_point",
                "immediate_action","escalate_to_manager","opportunity_flag"}
    missing = required - set(r.keys())
    if missing:
        raise ValueError(f"Missing keys: {missing}")

    tt = r.get("threat_type","")
    # threat_type = none → fields must be null/false
    if tt == "none":
        r["defensive_talking_point"] = None
        r["immediate_action"]        = None
        r["opportunity_flag"]        = False
        r["escalate_to_manager"]     = False

    # competitor_stockout → opportunity_flag must be true
    if tt == "competitor_stockout":
        r["opportunity_flag"] = True

    # escalate only if HIGH
    if r.get("threat_level","") != "HIGH":
        r["escalate_to_manager"] = False


# ─────────────────────────────────────────────────────────────────────────────
# 4. PERSIST TO competitor_intel TABLE
# ─────────────────────────────────────────────────────────────────────────────

async def _persist(retailer_id: str, result: dict, nearby_stores: str, rep_text: str, db) -> Optional[int]:
    """Save the intelligence result — idempotent by retailer_id + date."""
    today = date.today().isoformat()
    try:
        async with db.execute(
            "SELECT id FROM competitor_intel WHERE retailer_id=? AND date=?",
            (retailer_id, today)
        ) as cur:
            existing = await cur.fetchone()
            if existing:
                return existing["id"]

        now = datetime.now().isoformat(timespec="seconds")
        await db.execute(
            """INSERT INTO competitor_intel
               (retailer_id, date, rep_observation, nearby_stores,
                threat_type, threat_level, competitor_name,
                at_risk_skus, defensive_tp, immediate_action,
                escalate_to_manager, opportunity_flag, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                retailer_id, today,
                rep_text or "",
                nearby_stores,
                result.get("threat_type","none"),
                result.get("threat_level") or "",
                result.get("competitor_name") or "",
                json.dumps(result.get("at_risk_syngenta_products") or []),
                result.get("defensive_talking_point") or "",
                result.get("immediate_action") or "",
                int(bool(result.get("escalate_to_manager"))),
                int(bool(result.get("opportunity_flag"))),
                now,
            )
        )
        await db.commit()
        async with db.execute("SELECT last_insert_rowid() as lid") as cur:
            row = await cur.fetchone()
            return row["lid"] if row else None
    except Exception as exc:
        print(f"[competitor] Persist failed: {exc}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 5. PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

async def analyze_competitor_threat(
    retailer_id: str,
    outlet_name: str,
    district: str,
    tehsil: str,
    lat: float,
    lng: float,
    rep_text_input: str,
    stock_days_remaining: int,
    days_since_purchase: int,
    crop_stage: str,
    db,
) -> dict:
    """
    Full pipeline: Places API → prompt fill → LLM → rule-based → persist.
    Never raises — returns is_error=True on unexpected failure.
    """
    try:
        # Step 1: nearby agro stores
        nearby_stores = await _get_nearby_stores(lat, lng, radius_m=2000)

        # Step 2 + 3: LLM classification
        result, source = await _classify_with_llm(
            rep_text=rep_text_input,
            nearby_stores=nearby_stores,
            outlet_name=outlet_name,
            district=district,
            tehsil=tehsil,
            stock_days=stock_days_remaining,
            days_since_purchase=days_since_purchase,
            crop_stage=crop_stage,
        )

        # Step 4: persist
        intel_id = await _persist(retailer_id, result, nearby_stores, rep_text_input, db)

        print(
            f"[competitor] {outlet_name} ({district}): "
            f"threat={result.get('threat_type')} level={result.get('threat_level')} "
            f"source={source}"
        )

        return {
            **result,
            "intel_id":      intel_id,
            "nearby_stores": nearby_stores,
            "source":        source,
            "is_error":      False,
        }

    except Exception as exc:
        print(f"[competitor] analyze_competitor_threat FAILED: {exc}")
        return {
            "threat_type": "none", "threat_level": None,
            "competitor_name": None, "at_risk_syngenta_products": [],
            "defensive_talking_point": None, "immediate_action": None,
            "escalate_to_manager": False, "opportunity_flag": False,
            "intel_id": None, "nearby_stores": "error", "source": "error",
            "is_error": True, "error": str(exc),
        }


# ─────────────────────────────────────────────────────────────────────────────
# 6. FIRE-AND-FORGET ENTRY POINT (called from visit_log on competitor_observation)
# ─────────────────────────────────────────────────────────────────────────────

async def analyze_competitor_observation(
    retailer_id: str,
    rep_id: str,
    rep_text: str,
    db=None,
) -> dict:
    """
    Lightweight wrapper used by POST /visit_log when a rep types a competitor
    observation. Scheduled via asyncio.create_task() and NOT awaited, so the
    visit-log response is never delayed.

    Because the caller's request-scoped `db` connection is closed as soon as the
    request returns, this opens its OWN short-lived connection for all DB work.
    The `db` parameter is accepted for signature compatibility but not used for
    writes. Never raises — logs and returns on any error.
    """
    import aiosqlite
    from db.database import DB_PATH

    try:
        # Look up retailer context for a richer classification (best-effort).
        outlet_name, district, tehsil = retailer_id, "", ""
        lat, lng = 17.3850, 78.4867  # Hyderabad centroid default
        try:
            async with aiosqlite.connect(DB_PATH) as conn:
                conn.row_factory = aiosqlite.Row
                async with conn.execute(
                    """SELECT retailer_name, district, tehsil, lat, lng
                       FROM retailers WHERE retailer_id = ?""",
                    (retailer_id,)
                ) as cur:
                    row = await cur.fetchone()
                if row:
                    outlet_name = row["retailer_name"] or retailer_id
                    district = row["district"] or ""
                    tehsil = row["tehsil"] or ""
                    if row["lat"] is not None and row["lng"] is not None:
                        lat, lng = float(row["lat"]), float(row["lng"])
        except Exception as exc:
            print(f"[competitor] observation lookup failed: {exc}")

        # Step 1: nearby stores (best-effort, truly async httpx)
        nearby_stores = await _get_nearby_stores(lat, lng, radius_m=2000)

        # Step 2 + 3: classify. _classify_with_llm calls SYNCHRONOUS LLM clients
        # (Gemini / OpenRouter) with no timeout, which would block the event loop.
        # Since this runs as a fire-and-forget task, offload it to a worker thread
        # so the server stays responsive to other requests while it works.
        import asyncio

        def _classify_blocking():
            return asyncio.run(_classify_with_llm(
                rep_text=rep_text,
                nearby_stores=nearby_stores,
                outlet_name=outlet_name,
                district=district,
                tehsil=tehsil,
                stock_days=14,
                days_since_purchase=7,
                crop_stage="vegetative",
            ))

        result, source = await asyncio.to_thread(_classify_blocking)

        # Step 4: persist using the newer column set (own connection)
        today = date.today().isoformat()
        now = datetime.now().isoformat(timespec="seconds")
        try:
            async with aiosqlite.connect(DB_PATH) as conn:
                await conn.execute(
                    """INSERT INTO competitor_intel
                       (retailer_id, rep_id, date, threat_type, threat_level,
                        competitor_name, at_risk_products, defensive_talking_point,
                        immediate_action, escalate_to_manager, opportunity_flag,
                        rep_raw_observation, nearby_stores_detected, source, created_at,
                        rep_observation, nearby_stores, at_risk_skus, defensive_tp)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        retailer_id, rep_id, today,
                        result.get("threat_type", "none"),
                        result.get("threat_level") or "",
                        result.get("competitor_name") or "",
                        json.dumps(result.get("at_risk_syngenta_products") or []),
                        result.get("defensive_talking_point") or "",
                        result.get("immediate_action") or "",
                        int(bool(result.get("escalate_to_manager"))),
                        int(bool(result.get("opportunity_flag"))),
                        rep_text or "",
                        nearby_stores,
                        source,
                        now,
                        # legacy columns (mirror values so get_history keeps working)
                        rep_text or "",
                        nearby_stores,
                        json.dumps(result.get("at_risk_syngenta_products") or []),
                        result.get("defensive_talking_point") or "",
                    )
                )
                await conn.commit()
        except Exception as exc:
            print(f"[competitor] observation persist failed: {exc}")

        print(
            f"[competitor] observation ({retailer_id} by {rep_id}): "
            f"threat={result.get('threat_type')} source={source}"
        )
        return {**result, "source": source}

    except Exception as exc:
        print(f"[competitor] analyze_competitor_observation FAILED: {exc}")
        return {"threat_type": "none", "source": "error", "is_error": True, "error": str(exc)}
