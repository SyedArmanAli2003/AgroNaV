# What it does: Alert feed — list, dismiss, and on-demand detect endpoints
# Input: GET for alert list, POST to dismiss, POST /detect for live detection
# Output: JSON list of alerts, or success response
# Called by: FastAPI router mount in main.py
#
# Signal chain (for judge Q&A):
#   GET /api/alerts          → get_alerts(district, db)
#                              → detect_district_anomaly() [live 6-week rolling sales]
#                              → merge with persisted alerts table
#   POST /api/alerts/detect  → detect_district_anomaly() for any district on demand
#                              → returns is_anomaly, alert_type, severity, trigger_signal

from fastapi import APIRouter, Depends, Query
from db.database import get_db
from services.anomaly import get_alerts
from services.district_anomaly import detect_district_anomaly, detect_all_districts

router = APIRouter()


@router.get("")
async def list_alerts(
    district: str = Query("Jalgaon", description="District to detect anomalies for"),
    db=Depends(get_db)
):
    """
    Return active alerts for a district.

    # What it does:
    #   1. Runs live statistical anomaly detection (6-week rolling sales from retailer_pos)
    #   2. Merges with any undismissed alerts already in the DB
    #   3. Returns sorted by severity (high first)
    # Input: district query param (defaults to Jalgaon for demo)
    # Output: List of alert dicts
    """
    try:
        alerts = await get_alerts(district, db)
        return alerts
    except Exception as e:
        print(f"[alerts] Error fetching alerts for '{district}': {e}")
        return []


@router.post("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: int, db=Depends(get_db)):
    """
    Dismiss an alert by setting dismissed=1.

    # What it does: Marks an alert as dismissed in the database
    # Input: alert_id path parameter
    # Output: {"success": True}
    """
    try:
        await db.execute("UPDATE alerts SET dismissed = 1 WHERE id = ?", (alert_id,))
        await db.commit()
        return {"success": True}
    except Exception as e:
        print(f"[alerts] Error dismissing alert {alert_id}: {e}")
        return {"success": False, "error": str(e)}


@router.post("/detect")
async def detect_anomaly(
    district: str = Query(..., description="District to run detection for, e.g. Jalgaon"),
    category: str = Query(None, description="SKU category filter, e.g. fungicide"),
    weather_risk: str = Query("normal", description="Weather risk from Open-Meteo"),
    competitor_stockout: bool = Query(False, description="Competitor stockout reported"),
    db=Depends(get_db)
):
    """
    Run on-demand statistical anomaly detection for a district.

    Pipeline:
    1. Query 6-week rolling sales from retailer_pos (real Syngenta dataset)
    2. Compute projected weekly demand + 4-week average
    3. Query inventory for stock-coverage check (< 1.5 weeks → stock_risk)
    4. Check pest bulletin from alerts table
    5. Apply 5 detection rules (demand_spike, demand_drop, stock_out_risk,
       missed_opportunity, competitor_move)
    6. Enrich message with Gemini/LLaMA if key available
    7. Persist new alert to DB (deduped by outlet+type+date)

    Returns the judge-facing anomaly JSON schema.
    """
    result = await detect_district_anomaly(
        district=district,
        db=db,
        category=category,
        weather_risk=weather_risk,
        competitor_stockout=competitor_stockout,
        enrich_with_llm=True,
    )
    return result


@router.post("/detect-all")
async def detect_all(
    top_n: int = Query(5, description="Number of top districts to scan"),
    db=Depends(get_db)
):
    """
    Run anomaly detection across the top-N districts by sales volume.
    Returns only districts where an anomaly was detected.
    Used by manager dashboard to get territory-wide anomaly summary.
    """
    results = await detect_all_districts(db, top_n=top_n)
    return {
        "districts_scanned": top_n,
        "anomalies_found": len(results),
        "results": results,
    }
