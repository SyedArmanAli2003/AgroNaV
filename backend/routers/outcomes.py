# What it does: outcomes history list and territory setting endpoints
# Input: GET for outcome list, PATCH to update rep territory or individual outcome
# Output: JSON lists or success responses
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from auth import get_current_user

router = APIRouter(tags=["outcomes"])


class TerritoryUpdateRequest(BaseModel):
    rep_id: str
    state: str
    district: str
    territory_id: str = ""


class OutcomeUpdateRequest(BaseModel):
    outcome: str  # "sale" | "order" | "none"


_VALID_OUTCOMES = {"sale", "order", "none"}

# Allow frontend labels too
_LABEL_MAP = {
    "Order placed": "sale",
    "order placed": "sale",
    "Interested":   "order",
    "interested":   "order",
    "Rejected":     "none",
    "rejected":     "none",
}


@router.get("/api/outcomes")
async def get_outcomes(
    rep_id: str = Query(..., description="Rep ID, e.g. REP_0203"),
    db=Depends(get_db)
):
    """Return visit outcomes for the given rep, newer first."""
    try:
        async with db.execute(
            """SELECT v.id, v.outlet_id, v.retailer_id, v.retailer_name, v.date,
                      v.outcome, v.notes, v.synced, v.outcome_score, v.order_value,
                      v.product_discussed, v.visit_type
               FROM visit_logs v
               WHERE v.rep_id = ?
               ORDER BY v.id DESC
               LIMIT 50""",
            (rep_id,)
        ) as cursor:
            rows = await cursor.fetchall()

        logs = []
        for row in rows:
            name = (row["retailer_name"] or "").strip()
            if not name:
                name = row["retailer_id"] or "Unknown Retailer"
            logs.append({
                "id": row["id"],
                "outlet_id": row["outlet_id"],
                "retailer_id": row["retailer_id"],
                "retailer_name": name,
                "outlet_name": name,
                "product_discussed": row["product_discussed"] or "",
                "visit_type": row["visit_type"] or "",
                "date": row["date"],
                "outcome": row["outcome"],
                "notes": row["notes"],
                "synced": row["synced"],
                "outcome_score": row["outcome_score"] or 0,
            })

        return {"logs": logs}
    except Exception as e:
        print(f"[outcomes] Error: {e}")
        return {"logs": []}


@router.patch("/api/outcomes/{log_id}")
async def update_outcome(
    log_id: int,
    req: OutcomeUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update the outcome label of a single visit log entry.
    Accessible by the rep who owns the log AND by managers/admins."""
    # Normalize the incoming value
    normalized = _LABEL_MAP.get(req.outcome, req.outcome)
    if normalized not in _VALID_OUTCOMES:
        raise HTTPException(status_code=400, detail=f"Invalid outcome. Must be one of: {', '.join(_VALID_OUTCOMES)}")

    user_rep_id = current_user.get("sub")
    role = current_user.get("role", "rep")

    # Check ownership unless manager/admin
    if role not in ("manager", "admin"):
        async with db.execute("SELECT rep_id FROM visit_logs WHERE id=?", (log_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Log not found")
        if row["rep_id"] != user_rep_id:
            raise HTTPException(status_code=403, detail="You can only edit your own logs")

    # Recalculate outcome_score
    score_map = {"sale": 80, "order": 30, "none": -10}
    outcome_score = score_map.get(normalized, 0)

    try:
        await db.execute(
            "UPDATE visit_logs SET outcome=?, outcome_score=? WHERE id=?",
            (normalized, outcome_score, log_id)
        )
        await db.commit()
        return {"success": True, "outcome": normalized, "outcome_score": outcome_score}
    except Exception as e:
        print(f"[outcomes] Update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/rep/territory")
async def update_territory(req: TerritoryUpdateRequest, db=Depends(get_db)):
    """Update rep territory in users table."""
    try:
        await db.execute(
            "UPDATE users SET state=?, district=?, territory_id=? WHERE rep_id=?",
            (req.state, req.district, req.territory_id, req.rep_id)
        )
        await db.commit()
        return {"success": True}
    except Exception as e:
        print(f"[outcomes] Territory update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
