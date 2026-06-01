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


# IMPROVED: generate REAL demand-spike / demand-drop alerts from retailer_pos data
# (anchored to the latest transaction date so it works on the historical dataset),
# replacing reliance on static seeded alerts. Best-effort — never breaks the feed.
async def generate_live_alerts(district: str, db) -> int:
    created = 0
    try:
        # Anchor the window to the most recent POS date for this district
        async with db.execute(
            """SELECT MAX(p.transaction_date) AS anchor
               FROM retailer_pos p JOIN retailers r ON p.retailer_id = r.retailer_id
               WHERE r.district = ?""",
            (district,)
        ) as cur:
            row = await cur.fetchone()
        anchor = row["anchor"] if row else None
        if not anchor:
            return 0

        async with db.execute(
            """SELECT p.sku_name AS sku,
                      SUM(CASE WHEN p.transaction_date > date(?, '-7 days')
                               THEN p.sku_qty ELSE 0 END) AS this_week,
                      SUM(CASE WHEN p.transaction_date BETWEEN date(?, '-28 days')
                                                          AND date(?, '-7 days')
                               THEN p.sku_qty ELSE 0 END) / 3.0 AS avg_3w
               FROM retailer_pos p JOIN retailers r ON p.retailer_id = r.retailer_id
               WHERE r.district = ? AND p.sku_name != ''
               GROUP BY p.sku_name
               HAVING avg_3w > 0
               ORDER BY this_week DESC
               LIMIT 50""",
            (anchor, anchor, anchor, district)
        ) as cur:
            rows = await cur.fetchall()

        for r in rows:
            sku = r["sku"]
            tw = r["this_week"] or 0
            avg = r["avg_3w"] or 0
            if avg <= 0:
                continue
            atype = sev = msg = None
            if tw > 1.8 * avg:
                atype, sev = "demand_spike", "high"
                msg = (f"Demand spike: {sku} selling {round(tw / avg, 1)}x normal in "
                       f"{district} — stock up and prioritise top retailers.")
            elif tw < 0.5 * avg:
                atype, sev = "demand_drop", "medium"
                drop = round((1 - tw / max(avg, 1)) * 100)
                msg = (f"Demand drop: {sku} down {drop}% vs 3-week average in "
                       f"{district} — check competitor activity.")
            if not atype:
                continue
            # Dedupe: skip if an identical active alert already exists
            async with db.execute(
                "SELECT id FROM alerts WHERE message=? AND dismissed=0", (msg,)
            ) as c2:
                if await c2.fetchone():
                    continue
            await db.execute(
                """INSERT INTO alerts
                   (type, message, severity, outlet_name, created_at, timestamp, dismissed)
                   VALUES (?,?,?,?,datetime('now'),datetime('now'),0)""",
                (atype, msg, sev, district)
            )
            created += 1
        await db.commit()
    except Exception as e:
        print(f"[alerts] live alert generation skipped: {e}")
    return created


@router.get("")
async def list_alerts(
    district: str = Query("Jalgaon", description="District to detect anomalies for"),
    db=Depends(get_db)
):
    """
    Return active alerts for a district.

    # What it does:
    #   1. IMPROVED: generates live demand-spike/drop alerts from real POS data
    #   2. Runs live statistical anomaly detection (6-week rolling sales from retailer_pos)
    #   3. Merges with any undismissed alerts already in the DB
    #   4. Returns sorted by severity (high first)
    # Input: district query param (defaults to Jalgaon for demo)
    # Output: List of alert dicts
    """
    try:
        # IMPROVED: refresh data-driven alerts before reading the table
        await generate_live_alerts(district, db)
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
