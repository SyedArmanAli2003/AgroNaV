# What it does: Morning sync endpoint — returns everything the frontend needs for the day
# Input: GET request
# Output: JSON with outlets, alerts, and weekly_stats
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter, Depends
from db.database import get_db
from services.scoring import rank_outlets
from services.anomaly import get_alerts

router = APIRouter()


@router.get("/morning")
async def morning_sync(db=Depends(get_db)):
    """Return everything needed for the day in one call.

    # What it does: Fetches ranked outlets, alerts, and weekly stats in one response
    # Input: None (reads from database)
    # Output: {outlets: [...], alerts: [...], weekly_stats: [...]}
    # Called by: Frontend App.vue on startup, cached in localStorage
    """
    try:
        # Fetch and rank outlets
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

        scored_outlets = rank_outlets(outlets)

        # Fetch alerts
        alerts = await get_alerts("Nalgonda", db)

        # Fetch weekly stats
        async with db.execute(
            "SELECT week_label, visits, accepted, acceptance_rate FROM weekly_stats ORDER BY id"
        ) as cursor:
            stat_rows = await cursor.fetchall()

        weekly_stats = []
        for row in stat_rows:
            weekly_stats.append({
                "week_label": row["week_label"],
                "visits": row["visits"],
                "accepted": row["accepted"],
                "acceptance_rate": row["acceptance_rate"],
            })

        return {
            "outlets": scored_outlets,
            "alerts": alerts,
            "weekly_stats": weekly_stats,
        }

    except Exception as e:
        print(f"[sync] Morning sync error: {e}")
        return {"outlets": [], "alerts": [], "weekly_stats": []}
