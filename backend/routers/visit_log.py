# What it does: POST /visit_log endpoint — logs visit outcomes
# Input: POST body with rep_id, retailer_id, visit_type, product_discussed, outcome, notes
# Output: {success: true, outcome_score: int}
# Called by: Frontend OutcomeForm, mobile PostVisitLog

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from datetime import datetime

router = APIRouter(tags=["visit_log"])


class VisitLogRequest(BaseModel):
    rep_id: str
    retailer_id: str
    visit_type: str = "retailer_meeting"  # retailer_meeting | campaign_conducted | grower_meeting
    product_discussed: Optional[str] = None
    outcome: str  # "Order placed" | "Interested" | "Rejected"
    notes: Optional[str] = ""


@router.post("/visit_log")
async def log_visit(req: VisitLogRequest, db=Depends(get_db)):
    """Log a visit outcome and calculate outcome_score."""

    # Calculate outcome_score
    outcome_score = 0
    if req.outcome == "Order placed":
        outcome_score += 80
    elif req.outcome == "Interested":
        outcome_score += 30
    elif req.outcome == "Rejected":
        outcome_score -= 10

    # Clamp to [0, 100]
    outcome_score = max(0, min(100, outcome_score))

    today = datetime.now().strftime("%Y-%m-%d")

    try:
        await db.execute(
            """INSERT INTO visit_logs
               (outlet_id, rep_id, date, outcome, notes, synced, outcome_score)
               VALUES (?, ?, ?, ?, ?, 1, ?)""",
            (req.retailer_id, req.rep_id, today,
             req.outcome, req.notes or "", outcome_score)
        )
        await db.commit()
        return {"success": True, "outcome_score": outcome_score}
    except Exception as e:
        print(f"[visit_log] Error: {e}")
        return {"success": False, "error": str(e), "outcome_score": 0}
