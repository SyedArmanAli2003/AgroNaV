# What it does: recomputes outlet priority scores using
#               logged visit outcomes, returns updated ranked list
# Called by: frontend Recalibrate button

from fastapi import APIRouter, Depends
from db.database import get_db
from services.scoring import rank_outlets
from datetime import date, timedelta

router = APIRouter()

@router.post("/recalibrate")
async def recalibrate(rep_id: int = 1, db=Depends(get_db)):

    # Step 1: get all visit_logs for this rep last 30 days
    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()

    async with db.execute(
        """SELECT outlet_id,
                  SUM(CASE WHEN outcome IN ('sale','order')
                      THEN 1 ELSE 0 END) as wins,
                  COUNT(*) as total
           FROM visit_logs
           WHERE rep_id=? AND date >= ?
           GROUP BY outlet_id""",
        (rep_id, thirty_days_ago)
    ) as cursor:
        logs = await cursor.fetchall()

    # Build conversion rate lookup dict
    # { outlet_id: conversion_rate 0.0-1.0 }
    conversion = {}
    for row in logs:
        if row["total"] > 0:
            conversion[row["outlet_id"]] = (
                row["wins"] / row["total"]
            )

    # Step 2: get all outlets
    async with db.execute("SELECT * FROM outlets") as cursor:
        outlets_raw = await cursor.fetchall()
    outlet_list = [dict(o) for o in outlets_raw]

    # Step 3: rank with fallback formula first
    ranked = rank_outlets(outlet_list)

    # Step 4: apply learning boost
    # final = 0.80 * base_score + 0.20 * conversion_rate * 100
    # This makes outlets where rep succeeded score higher
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
