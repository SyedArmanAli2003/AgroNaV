# What it does: Next Best Action endpoint — returns NBA card for an outlet
# Input: outlet_id path parameter
# Output: NBACard JSON with product, pitch, tip, promotion, why
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter, Depends
from db.database import get_db
from services.gemini import get_nba

router = APIRouter()


@router.get("/{outlet_id}")
async def get_nba_card(outlet_id: int, db=Depends(get_db)):
    """Return Next Best Action recommendation for an outlet.

    # What it does: Fetches outlet from DB, generates NBA via Gemini or fallback
    # Input: outlet_id path parameter
    # Output: NBACard dict
    # Called by: Frontend Visit.vue
    """
    try:
        async with db.execute("SELECT * FROM outlets WHERE id = ?", (outlet_id,)) as cursor:
            row = await cursor.fetchone()

        if not row:
            return {"error": "Outlet not found"}

        outlet = {
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

        nba = await get_nba(outlet, db)
        return nba

    except Exception as e:
        print(f"[nba] Error generating NBA for outlet {outlet_id}: {e}")
        # Return fallback on any error
        from services.gemini import FALLBACK
        return FALLBACK.copy()
