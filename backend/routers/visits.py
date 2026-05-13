# What it does: Visit logging and weekly stats endpoints
# Input: POST body with outcome data, GET requests for logs/stats
# Output: JSON success response, visit log list, weekly stats list
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter, Depends
from db.database import get_db
from models.schemas import OutcomeLog
from services.outcome_scorer import calculate_outcome_score
from datetime import datetime

router = APIRouter()


@router.post("/log")
async def log_outcome(outcome: OutcomeLog, db=Depends(get_db)):
    """Log a visit outcome for an outlet.

    # What it does: Inserts a visit_log record with outcome and notes
    # Input: OutcomeLog body (outlet_id, result, notes)
    # Output: {"success": True}
    # Called by: Frontend Visit.vue, mobile VisitScreen
    """
    try:
        # Validate result
        if outcome.result not in ("sale", "order", "none"):
            return {"success": False, "error": "Result must be 'sale', 'order', or 'none'"}

        today = datetime.now().strftime("%Y-%m-%d")
        order_value = getattr(outcome, 'order_value', 0) or 0
        rejection_reason = getattr(outcome, 'rejection_reason', None)
        outcome_score = calculate_outcome_score(
            outcome.result, order_value, rejection_reason
        )

        await db.execute(
            """INSERT INTO visit_logs
               (outlet_id, rep_id, date, outcome, notes, synced, outcome_score, order_value, rejection_reason)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (outcome.outlet_id, getattr(outcome, 'rep_id', 1), today,
             outcome.result, outcome.notes or "", 1,
             outcome_score, order_value, rejection_reason)
        )
        await db.commit()
        return {"success": True, "outcome_score": outcome_score}

    except Exception as e:
        print(f"[visits] Error logging outcome: {e}")
        return {"success": False, "error": str(e)}


@router.get("/log")
async def get_visit_log(db=Depends(get_db)):
    """Return last 30 visit logs joined with outlet names.

    # What it does: Fetches recent visit logs with outlet info
    # Input: None
    # Output: List of visit log dicts with outlet_name, newest first
    # Called by: Frontend Outcomes.vue
    """
    try:
        async with db.execute(
            """SELECT v.id, v.outlet_id, v.date, v.outcome, v.notes, v.synced,
                      v.outcome_score, v.order_value,
                      o.name as outlet_name
               FROM visit_logs v
               LEFT JOIN outlets o ON v.outlet_id = o.id
               ORDER BY v.id DESC
               LIMIT 30"""
        ) as cursor:
            rows = await cursor.fetchall()

        logs = []
        for row in rows:
            logs.append({
                "id": row["id"],
                "outlet_id": row["outlet_id"],
                "outlet_name": row["outlet_name"] or "Unknown",
                "date": row["date"],
                "result": row["outcome"],
                "outcome": row["outcome"],
                "notes": row["notes"],
                "synced": row["synced"],
                "outcome_score": row["outcome_score"] or 0,
            })

        return {"logs": logs}

    except Exception as e:
        print(f"[visits] Error fetching visit log: {e}")
        return []


@router.get("/weekly-stats")
async def get_weekly_stats(db=Depends(get_db)):
    """Return all weekly stats ordered by id.

    # What it does: Fetches weekly performance statistics
    # Input: None
    # Output: List of WeeklyStat dicts
    # Called by: Frontend Outcomes.vue, sync/morning
    """
    try:
        async with db.execute(
            "SELECT week_label, visits, accepted, acceptance_rate FROM weekly_stats ORDER BY id"
        ) as cursor:
            rows = await cursor.fetchall()

        stats = []
        for row in rows:
            stats.append({
                "week_label": row["week_label"],
                "visits": row["visits"],
                "accepted": row["accepted"],
                "acceptance_rate": row["acceptance_rate"],
            })

        return {"stats": stats}

    except Exception as e:
        print(f"[visits] Error fetching weekly stats: {e}")
        return {"stats": []}
