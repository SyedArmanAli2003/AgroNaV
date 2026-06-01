# What it does: Demo reset endpoint — restores a clean, judge-ready demo state
# Input: GET or POST /api/demo/reset
# Output: {"reset":"ok","demo_ready":true,"visits_seeded":4,"message":...}
# Called by: Judge demo flow, frontend demo reset button

from fastapi import APIRouter, Depends
from datetime import datetime
from db.database import get_db

router = APIRouter()


async def _do_reset(db) -> dict:
    """
    IMPROVED: rewritten to produce a deterministic, judge-ready demo state instead of
    calling the old (missing) db.seed module which crashed the endpoint.

    Steps:
      1. Clear visit noise (test rows + all prior visit logs)
      2. Clear cached NBA responses so the next call hits the live LLM tier
      3. Clear weekly plans
      4. Seed 4 clean demo visit logs (2 sales, 1 rejection, 1 order)
    Alerts, outlets and retailers are intentionally preserved.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        # 1. remove QA test noise + reset visit history to a known state
        await db.execute("DELETE FROM visit_logs WHERE rep_id LIKE 'QA%'")
        await db.execute("DELETE FROM visit_logs")

        # 2. force fresh LLM calls on next recommendations
        try:
            await db.execute("DELETE FROM nba_responses")
        except Exception:
            pass
        try:
            await db.execute("DELETE FROM nba_cache")
        except Exception:
            pass

        # 3. clear weekly plans
        try:
            await db.execute("DELETE FROM weekly_plans")
        except Exception:
            pass

        # 4. seed 4 clean demo visit logs against outlets 1-4
        demo_logs = [
            (1, "sale",  3500, "Tilt 250 EC",     80, ""),
            (2, "sale",  2800, "Amistar 250 SC",  80, ""),
            (3, "none",  0,    "",                 -10, "price concern"),
            (4, "order", 1200, "Kavach 75 WP",    30, ""),
        ]
        for outlet_id, outcome, order_value, product, score, rejection in demo_logs:
            await db.execute(
                """INSERT INTO visit_logs
                   (outlet_id, retailer_id, retailer_name, rep_id, date, outcome,
                    notes, synced, outcome_score, visit_type, product_discussed,
                    order_value, rejection_reason)
                   VALUES (?, ?, ?, 'REP_0203', ?, ?, 'demo seed', 1, ?, 'retailer_meeting', ?, ?, ?)""",
                (outlet_id, str(outlet_id), "", today, outcome, score, product, order_value,
                 rejection or None)
            )
        await db.commit()

        return {
            "reset": "ok",
            "demo_ready": True,
            "visits_seeded": 4,
            "message": "Demo state ready. Run recalibrate to see learning.",
        }
    except Exception as e:
        print(f"[demo] Reset error: {e}")
        return {"reset": "error", "demo_ready": False, "message": str(e)}


@router.get("/reset")
async def demo_reset_get(db=Depends(get_db)):
    """Reset demo state (GET — used by the frontend demo button)."""
    return await _do_reset(db)


@router.post("/reset")
async def demo_reset_post(db=Depends(get_db)):
    """Reset demo state (POST — used by QA harness)."""
    return await _do_reset(db)
