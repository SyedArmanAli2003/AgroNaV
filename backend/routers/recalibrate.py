# What it does: Recomputes outlet priority scores using logged visit outcomes
# Called by: frontend Recalibrate button (existing + new system)

from fastapi import APIRouter, Depends
from db.database import get_db
from services.scoring import rank_outlets
from datetime import date, timedelta

router = APIRouter(tags=["recalibrate"])


@router.post("/api/recalibrate")
async def recalibrate_legacy(rep_id: int = 1, db=Depends(get_db)):
    """Legacy recalibrate endpoint for existing frontend.
    Kept for backward compatibility with /api prefix.
    """
    return await _do_recalibrate(rep_id, db)


@router.post("/recalibrate")
async def recalibrate_new(rep_id: str = "REP_0001", db=Depends(get_db)):
    """New recalibrate endpoint for updated frontend.
    Accepts string rep_id format.
    """
    # Extract numeric part if present for legacy query
    try:
        numeric_id = int("".join(filter(str.isdigit, rep_id))) if rep_id else 1
    except ValueError:
        numeric_id = 1
    return await _do_recalibrate(numeric_id, db)


async def _do_recalibrate(rep_id, db):
    """Shared recalibration logic."""
    # Step 1: get all visit_logs for this rep last 30 days
    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()

    async with db.execute(
        """SELECT outlet_id,
                  SUM(CASE WHEN outcome IN ('sale','order','Order placed')
                      THEN 1 ELSE 0 END) as wins,
                  COUNT(*) as total
           FROM visit_logs
           WHERE rep_id=? AND date >= ?
           GROUP BY outlet_id""",
        (rep_id, thirty_days_ago)
    ) as cursor:
        logs = await cursor.fetchall()

    # Build conversion rate lookup dict
    conversion = {}
    for row in logs:
        if row["total"] > 0:
            conversion[row["outlet_id"]] = row["wins"] / row["total"]

    # Step 2: get all outlets
    async with db.execute("SELECT * FROM outlets") as cursor:
        outlets_raw = await cursor.fetchall()
    outlet_list = [dict(o) for o in outlets_raw]

    # Step 3: rank with fallback formula first
    ranked = rank_outlets(outlet_list)

    # Step 4: apply learning boost
    # final = 0.80 * base_score + 0.20 * conversion_rate * 100
    for outlet in ranked:
        rate = conversion.get(outlet["id"], 0.0)
        learning_boost = int(rate * 20)
        outlet["score"] = min(100,
            int(outlet["score"] * 0.80) + learning_boost
        )
        if outlet["score"] >= 65:
            outlet["label"] = "HIGH"
        elif outlet["score"] >= 40:
            outlet["label"] = "MEDIUM"
        else:
            outlet["label"] = "LOW"

    # Re-sort after boost
    ranked.sort(key=lambda x: x["score"], reverse=True)

    return {
        "success": True,
        "updated_outlets": ranked,
        "message": f"Rankings updated using {len(logs)} outcome records"
    }
