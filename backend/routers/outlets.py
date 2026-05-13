# What it does: Outlet CRUD and scored outlet listing
# Input: HTTP GET requests
# Output: JSON list of scored outlets or single outlet
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter, Depends
from db.database import get_db
from services.scoring import rank_outlets

router = APIRouter()


@router.get("/ranked")
async def get_ranked_outlets(db=Depends(get_db)):
    """Return all outlets ranked by visit priority score.

    # What it does: Fetches all outlets from DB, scores and sorts them
    # Input: None (reads from database)
    # Output: List of ScoredOutlet dicts sorted by score descending
    # Called by: Frontend Dashboard.vue, sync/morning endpoint
    """
    try:
        async with db.execute("SELECT * FROM outlets") as cursor:
            rows = await cursor.fetchall()

        outlets = []
        for row in rows:
            outlets.append({
                "id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "owner_name": row["owner_name"],
                "district": row["district"],
                "lat": row["lat"],
                "lng": row["lng"],
                "last_visit_date": row["last_visit_date"],
                "stock_days_remaining": row["stock_days_remaining"],
                "has_pest_alert": row["has_pest_alert"],
                "sales_spike": row["sales_spike"],
                "crop_stage": row["crop_stage"],
            })

        scored = rank_outlets(outlets)
        return scored

    except Exception as e:
        print(f"[outlets] Error fetching ranked outlets: {e}")
        return []


@router.get("/{outlet_id}")
async def get_outlet(outlet_id: int, db=Depends(get_db)):
    """Return a single outlet by ID.

    # What it does: Fetches one outlet row from database
    # Input: outlet_id path parameter
    # Output: Outlet dict or error message
    # Called by: Frontend Visit.vue
    """
    try:
        async with db.execute("SELECT * FROM outlets WHERE id = ?", (outlet_id,)) as cursor:
            row = await cursor.fetchone()

        if not row:
            return {"error": "Outlet not found"}

        return {
            "id": row["id"],
            "name": row["name"],
            "type": row["type"],
            "owner_name": row["owner_name"],
            "district": row["district"],
            "lat": row["lat"],
            "lng": row["lng"],
            "last_visit_date": row["last_visit_date"],
            "stock_days_remaining": row["stock_days_remaining"],
            "has_pest_alert": row["has_pest_alert"],
            "sales_spike": row["sales_spike"],
            "crop_stage": row["crop_stage"],
        }

    except Exception as e:
        print(f"[outlets] Error fetching outlet {outlet_id}: {e}")
        return {"error": str(e)}
