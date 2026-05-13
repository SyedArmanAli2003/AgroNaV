# What it does: Demo reset endpoint — restores seed data for judge demos
# Input: GET request
# Output: {"reset": True, "message": "Demo data restored"}
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter

router = APIRouter()


@router.get("/reset")
async def demo_reset():
    """Delete all dynamic data and re-seed the database.

    # What it does: Wipes visit_logs, alerts, nba_cache, weekly_stats and re-inserts seed data
    # Input: None
    # Output: {"reset": True, "message": "Demo data restored"}
    # Called by: Judge demo flow, frontend demo reset button
    """
    try:
        from db.seed import seed
        seed()
        return {"reset": True, "message": "Demo data restored"}
    except Exception as e:
        print(f"[demo] Reset error: {e}")
        return {"reset": False, "message": str(e)}
