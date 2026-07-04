# What it does: POST /visit_log endpoint — logs visit outcomes
# Input: POST body with rep_id, retailer_id, visit_type, product_discussed, outcome, notes
# Output: {success: true, outcome_score: int}
# Called by: Frontend OutcomeForm, mobile PostVisitLog

import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from datetime import datetime

router = APIRouter(tags=["visit_log"])


# Frontend label → system-standard outcome value
_OUTCOME_MAP = {
    "Order placed": "sale",
    "Interested":   "order",
    "Rejected":     "none",
}


def _normalize_outcome(raw: str) -> str:
    """Map a frontend outcome label to the system standard (sale/order/none).
    Already-normalized values pass through unchanged."""
    if raw in ("sale", "order", "none"):
        return raw
    return _OUTCOME_MAP.get(raw, "none")


class VisitLogRequest(BaseModel):
    rep_id: str
    retailer_id: str
    visit_type: str = "retailer_meeting"  # retailer_meeting | campaign_conducted | grower_meeting
    product_discussed: Optional[str] = None
    retailer_name: Optional[str] = ""
    competitor_observation: Optional[str] = ""
    order_value: Optional[float] = 0
    outcome: str  # "Order placed" | "Interested" | "Rejected" (or normalized sale/order/none)
    notes: Optional[str] = ""


@router.post("/visit_log")
async def log_visit(req: VisitLogRequest, db=Depends(get_db)):
    """Log a visit outcome and calculate outcome_score."""

    # Calculate outcome_score from the ORIGINAL outcome label (before normalization)
    outcome_score = 0
    if req.outcome in ("Order placed", "sale"):
        outcome_score += 80
    elif req.outcome in ("Interested", "order"):
        outcome_score += 30
    elif req.outcome in ("Rejected", "none"):
        outcome_score -= 10

    # FIXED BUG 7: clamp to [-20, 100] (was max(0, ...)) so active rejections keep
    # a negative score — recalibration treats these as downvotes, not neutral zeros.
    outcome_score = max(-20, min(100, outcome_score))

    # Normalize the outcome for storage; keep the original label in a notes prefix
    normalized_outcome = _normalize_outcome(req.outcome)
    notes = req.notes or ""
    if req.outcome not in ("sale", "order", "none"):
        notes = f"[{req.outcome}] {notes}".strip()

    today = datetime.now().strftime("%Y-%m-%d")

    try:
        outlet_id_val = None
        try:
            outlet_id_val = int(req.retailer_id)
        except (ValueError, TypeError):
            pass
        await db.execute(
            """INSERT INTO visit_logs
               (outlet_id, retailer_id, retailer_name, rep_id, date, outcome,
                notes, synced, outcome_score, visit_type, product_discussed,
                order_value)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)""",
            (outlet_id_val, req.retailer_id, req.retailer_name or "",
             req.rep_id, today, normalized_outcome,
             notes, outcome_score, req.visit_type,
             req.product_discussed or "", req.order_value or 0)
        )
        await db.commit()

        # Fire-and-forget competitor analysis if the rep noted anything.
        # Not awaited so the visit-log response is never delayed.
        if (req.competitor_observation or "").strip():
            try:
                from services.competitor_intel import analyze_competitor_observation
                asyncio.create_task(
                    analyze_competitor_observation(
                        retailer_id=req.retailer_id,
                        rep_id=req.rep_id,
                        rep_text=req.competitor_observation,
                        db=db,
                    )
                )
            except Exception as e:
                print(f"[visit_log] competitor task not scheduled: {e}")

        return {"success": True, "outcome_score": outcome_score}
    except Exception as e:
        print(f"[visit_log] Error: {e}")
        return {"success": False, "error": str(e), "outcome_score": 0}
