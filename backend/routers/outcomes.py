# What it does: outcomes history list and territory setting endpoints
# Input: GET for outcome list, PATCH to update rep territory
# Output: JSON lists or success responses
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from db.database import get_db

router = APIRouter(tags=["outcomes"])


class TerritoryUpdateRequest(BaseModel):
    rep_id: str
    state: str
    district: str
    territory_id: str = ""


@router.get("/api/outcomes")
async def get_outcomes(
    rep_id: str = Query(..., description="Rep ID, e.g. REP_0203"),
    db=Depends(get_db)
):
    """Return visit outcomes for the given rep, newer first."""
    try:
        async with db.execute(
            """SELECT v.id, v.outlet_id, v.date, v.outcome, v.notes, v.synced,
                      v.outcome_score, v.order_value,
                      o.name as outlet_name
               FROM visit_logs v
               LEFT JOIN outlets o ON v.outlet_id = o.id
               WHERE v.rep_id = ?
               ORDER BY v.id DESC
               LIMIT 50""",
            (rep_id,)
        ) as cursor:
            rows = await cursor.fetchall()

        logs = []
        for row in rows:
            logs.append({
                "id": row["id"],
                "outlet_id": row["outlet_id"],
                "outlet_name": row["outlet_name"] or "Unknown",
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
