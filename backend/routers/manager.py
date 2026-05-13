# What it does: returns KPIs for manager dashboard
# Called by: frontend Manager page

from fastapi import APIRouter, Depends
from db.database import get_db
from datetime import date

router = APIRouter()

@router.get("/manager/kpis")
async def get_manager_kpis(
    territory: str = "Nalgonda",
    db=Depends(get_db)
):
    today = date.today().isoformat()

    # Total outlets in territory
    async with db.execute(
        "SELECT * FROM outlets WHERE district=?", (territory,)
    ) as cursor:
        outlets = await cursor.fetchall()

    total_outlets = len(outlets)
    high_priority = sum(1 for o in outlets
                        if o["has_pest_alert"] or
                        o["stock_days_remaining"] < 4)

    # Visits completed today
    async with db.execute(
        "SELECT COUNT(*) as c FROM visit_logs WHERE date=?",
        (today,)
    ) as cursor:
        completed = await cursor.fetchall()
    visits_completed = completed[0]["c"] if completed else 0

    # Revenue this week from logged outcomes
    async with db.execute(
        """SELECT COALESCE(SUM(order_value),0) as total
           FROM visit_logs WHERE date >= date('now','-7 days')"""
    ) as cursor:
        revenue = await cursor.fetchall()
    revenue_week = revenue[0]["total"] if revenue else 0

    # Active alerts
    async with db.execute(
        "SELECT COUNT(*) as c FROM alerts WHERE dismissed=0"
    ) as cursor:
        alert_count = await cursor.fetchall()
    active_alerts = alert_count[0]["c"] if alert_count else 0

    # Acceptance rate from weekly_stats last row
    async with db.execute(
        "SELECT * FROM weekly_stats ORDER BY id DESC LIMIT 1"
    ) as cursor:
        stats = await cursor.fetchall()
    acceptance = stats[0]["acceptance_rate"] if stats else 0.0

    coverage = (
        round(visits_completed / total_outlets * 100, 1)
        if total_outlets > 0 else 0
    )

    return {
        "kpis": {
            "visits_today": total_outlets,
            "visits_completed": visits_completed,
            "high_priority_pending": high_priority,
            "acceptance_rate_this_week": acceptance,
            "revenue_this_week": revenue_week,
            "active_alerts": active_alerts,
            "coverage_efficiency": coverage
        },
        "outlets": [dict(o) for o in outlets]
    }
