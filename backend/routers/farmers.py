# What it does: Farmer Visit Planner API endpoints (Gap 6)
#
# POST /api/farmers/visit-plan       → single farmer full pipeline
# POST /api/farmers/visit-plan/batch → batch up to 10 farmers
# GET  /api/farmers/geocode          → geocode a village (one-time, cached)
# GET  /api/farmers/list             → list growers for a district
# POST /api/farmers/seed-demo        → seed 5 demo growers for judge demo
#
# Called by: Frontend Visit.js "Farmer Intel" button

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date
from db.database import get_db
from services.farmer_visit import plan_farmer_visit, geocode_village

router = APIRouter(tags=["farmers"])


class GrowerRequest(BaseModel):
    grower_id:          str  = "G_001"
    farmer_name:        str  = "Ramesh Patil"
    village:            str  = "Savkheda"
    tehsil:             str  = "Jalgaon"
    district:           str  = "Jalgaon"
    state:              str  = "Maharashtra"
    farm_acres:         float = 3.5
    crop_type:          str  = "cotton"
    growth_stage:       str  = "flowering"
    last_product:       Optional[str] = "Tilt 250 EC"
    last_purchase_date: Optional[str] = None  # ISO date
    prev_outcome:       Optional[str] = "interested"
    lat:                Optional[float] = None
    lng:                Optional[float] = None


class BatchRequest(BaseModel):
    growers: list[GrowerRequest]


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/farmers/visit-plan
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/farmers/visit-plan")
async def farmer_visit_plan(req: GrowerRequest, db=Depends(get_db)):
    """
    Full Gap 6 pipeline for a single farmer:
    1. Geocode village (Google Geocoding API → DB cache)
    2. Compute detour cost (Haversine / 30 km/h)
    3. DB queries: days_since_purchase, campaign_status, ndvi_value, nearest alert
    4. Eligibility check (4 rules)
    5. LLM: NVIDIA GLM → OpenRouter → Gemini → rule-based

    Returns: visit_type, recommended_product, agronomic_advice,
             conversation_starter, visit_reason, estimated_value, source
    """
    grower = req.model_dump()
    result = await plan_farmer_visit(grower, db)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/farmers/visit-plan/batch
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/farmers/visit-plan/batch")
async def farmer_visit_batch(req: BatchRequest, db=Depends(get_db)):
    """
    Plan visits for up to 10 farmers in one call.
    Results are ordered: priority_visit → warm_lead_visit → free_visit → skip_today.
    """
    import asyncio
    growers = [g.model_dump() for g in req.growers[:10]]
    tasks   = [plan_farmer_visit(g, db) for g in growers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    ORDER = {"priority_visit": 0, "warm_lead_visit": 1, "free_visit": 2, "skip_today": 3}
    plans = []
    for r in results:
        if isinstance(r, Exception):
            plans.append({"visit_type": "error", "error": str(r)})
        else:
            plans.append(r)

    plans.sort(key=lambda x: ORDER.get(x.get("visit_type", "skip_today"), 3))

    eligible   = [p for p in plans if p.get("visit_type") != "skip_today"]
    skipped    = [p for p in plans if p.get("visit_type") == "skip_today"]

    return {
        "total":   len(plans),
        "eligible": len(eligible),
        "skipped": len(skipped),
        "plans":   plans,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/farmers/geocode
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/farmers/geocode")
async def geocode_endpoint(
    village:  str = Query(...),
    tehsil:   str = Query(""),
    district: str = Query("Jalgaon"),
):
    """
    One-time geocode call for a village.
    GET https://maps.googleapis.com/maps/api/geocode/json
        ?address={village}+{tehsil}+{district}+India&key=KEY
    Returns lat, lng.
    """
    lat, lng = await geocode_village(village, tehsil, district)
    return {"village": village, "district": district, "lat": lat, "lng": lng,
            "source": "google-geocoding" if lat else "unavailable"}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/farmers/list
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/farmers/list")
async def list_farmers(
    district: str = Query("Jalgaon"),
    limit:    int = Query(20),
    db=Depends(get_db)
):
    """Return growers list for a district (for rep's farmer map view)."""
    try:
        async with db.execute(
            "SELECT * FROM growers WHERE district=? ORDER BY id DESC LIMIT ?",
            (district, limit)
        ) as cur:
            rows = await cur.fetchall()
        return {"district": district, "growers": [dict(r) for r in rows]}
    except Exception as e:
        return {"district": district, "growers": [], "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/farmers/seed-demo  (judge demo only)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/farmers/seed-demo")
async def seed_demo_growers(db=Depends(get_db)):
    """
    Seed 5 representative demo growers + WhatsApp campaign entries
    so judges can immediately run /visit-plan without manual setup.
    Idempotent — safe to call multiple times.
    """
    demo_growers = [
        ("G_D001", "Ramesh Patil",   "Savkheda",    "Jalgaon",    "Jalgaon",  "Maharashtra", 3.5, "cotton",   "flowering",    "Tilt 250 EC",    "2026-03-10"),
        ("G_D002", "Sunita Devi",    "Bhusawal",    "Bhusawal",   "Jalgaon",  "Maharashtra", 2.0, "soybean",  "pod_fill",     "Actara 25 WG",   "2026-02-28"),
        ("G_D003", "Vijay Kumar",    "Dharangaon",  "Dharangaon", "Jalgaon",  "Maharashtra", 5.0, "onion",    "vegetative",   "Kavach 75 WP",   "2026-03-20"),
        ("G_D004", "Priya Sharma",   "Niphad",      "Niphad",     "Nashik",   "Maharashtra", 1.5, "grapes",   "fruiting",     "Amistar 250 SC", "2026-02-15"),
        ("G_D005", "Arjun Reddy",    "Miryalaguda", "Miryalaguda","Nalgonda", "Telangana",   4.0, "paddy",    "heading",      "Ampligo 150 ZC", "2026-03-01"),
    ]

    inserted = 0
    for row in demo_growers:
        try:
            await db.execute(
                """INSERT OR IGNORE INTO growers
                   (grower_id, farmer_name, village, tehsil, district, state,
                    farm_acres, crop_type, growth_stage, last_product, last_purchase_date)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                row
            )
            inserted += 1
        except Exception as e:
            print(f"[farmer-seed] {row[0]}: {e}")

    # Seed WhatsApp campaign entries
    wa_entries = [
        ("G_D001", "Kharif Protection 2026", "opened"),
        ("G_D002", "Soybean Spray Advisory", "clicked"),
        ("G_D003", "Pre-Kharif Awareness",   "sent"),
        ("G_D004", "Grape Berry Protection",  "opened"),
        ("G_D005", "Paddy Blast Alert",       "clicked"),
    ]
    for gid, camp, status in wa_entries:
        try:
            await db.execute(
                """INSERT OR IGNORE INTO whatsapp_campaigns
                   (grower_id, campaign_name, message_status, sent_at)
                   VALUES (?,?,?,?)""",
                (gid, camp, status, "2026-03-25")
            )
        except Exception as e:
            print(f"[wa-seed] {gid}: {e}")

    await db.commit()
    return {"seeded_growers": inserted, "message": "Demo growers and WhatsApp campaigns ready"}
