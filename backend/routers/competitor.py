# What it does: Competitive intelligence API endpoints
#
# POST /api/competitor/analyze  → full pipeline (Places + LLM + persist)
# GET  /api/competitor/history  → past intel for a retailer
#
# Input: CompetitorAnalysisRequest body
# Output: CompetitorIntelResult JSON (8-field schema + metadata)
# Called by: Frontend PostVisitLog "Analyze Threat" button, VisitDetail page

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from services.competitor_intel import analyze_competitor_threat

router = APIRouter(tags=["competitor"])


class CompetitorAnalysisRequest(BaseModel):
    retailer_id:          str
    outlet_name:          str
    district:             str
    tehsil:               str = ""
    lat:                  float = 17.3850    # Hyderabad centroid default
    lng:                  float = 78.4867
    rep_text_input:       str   = ""
    stock_days_remaining: int   = 14
    days_since_purchase:  int   = 7
    crop_stage:           str   = "vegetative"


@router.post("/api/competitor/analyze")
async def analyze(req: CompetitorAnalysisRequest, db=Depends(get_db)):
    """
    Run the competitive intelligence pipeline:

    1. Google Places API (New) — 2km radius search for agro-input stores
    2. Fill judge-facing prompt with all real signals
    3. Classify via Gemini 1.5 Flash → OpenRouter LLaMA-3 → rule-based fallback
    4. Persist result to competitor_intel table (idempotent by retailer_id + date)

    Returns the 8-field JSON schema (threat_type, threat_level, competitor_name,
    at_risk_syngenta_products, defensive_talking_point, immediate_action,
    escalate_to_manager, opportunity_flag) plus metadata fields.
    """
    result = await analyze_competitor_threat(
        retailer_id=req.retailer_id,
        outlet_name=req.outlet_name,
        district=req.district,
        tehsil=req.tehsil,
        lat=req.lat,
        lng=req.lng,
        rep_text_input=req.rep_text_input,
        stock_days_remaining=req.stock_days_remaining,
        days_since_purchase=req.days_since_purchase,
        crop_stage=req.crop_stage,
        db=db,
    )
    return result


@router.get("/api/competitor/history")
async def get_history(
    retailer_id: str = Query(..., description="Retailer ID"),
    limit: int = Query(10, description="Max records"),
    db=Depends(get_db)
):
    """
    Return the last N competitor intelligence records for a given retailer.
    Used by the VisitDetail page to show historical threat context.
    """
    try:
        async with db.execute(
            """SELECT id, date, rep_raw_observation, nearby_stores_detected,
                      threat_type, threat_level, competitor_name,
                      at_risk_products, defensive_talking_point, immediate_action,
                      escalate_to_manager, opportunity_flag, created_at
               FROM competitor_intel
               WHERE retailer_id=?
               ORDER BY id DESC
               LIMIT ?""",
            (retailer_id, limit)
        ) as cur:
            rows = await cur.fetchall()

        records = []
        for r in rows:
            import json
            records.append({
                "id":                      r["id"],
                "date":                    r["date"],
                "rep_observation":         r["rep_raw_observation"],
                "nearby_stores":           r["nearby_stores_detected"],
                "threat_type":             r["threat_type"],
                "threat_level":            r["threat_level"],
                "competitor_name":         r["competitor_name"],
                "at_risk_skus":            json.loads(r["at_risk_products"] or "[]"),
                "defensive_talking_point": r["defensive_talking_point"],
                "immediate_action":        r["immediate_action"],
                "escalate_to_manager":     bool(r["escalate_to_manager"]),
                "opportunity_flag":        bool(r["opportunity_flag"]),
                "created_at":              r["created_at"],
            })

        return {"retailer_id": retailer_id, "records": records}
    except Exception as exc:
        print(f"[competitor] History query failed: {exc}")
        return {"retailer_id": retailer_id, "records": []}
