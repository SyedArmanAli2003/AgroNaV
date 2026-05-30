# What it does: Generates anomaly alerts using statistical detection + rule-based engine
# Input: District name and database connection
# Output: List of alert dicts sorted by severity, compatible with /api/alerts response schema
# Called by: routers/alerts.py, routers/sync.py
#
# Pipeline:
#   1. Run live district_anomaly.detect_district_anomaly() for rep's district
#   2. Return any existing undismissed alerts from DB (deduped with live results)
#   3. Sort: high → medium → info

from datetime import datetime
from services.district_anomaly import detect_district_anomaly


async def get_alerts(district: str, db) -> list[dict]:
    """
    Get anomaly alerts for a district.

    # What it does:
    #   a) Runs live statistical detection (6-week rolling sales, inventory, pest bulletin)
    #   b) Merges with any persisted undismissed alerts from the alerts table
    #   c) Returns de-duped list sorted by severity (high → medium → info)
    # Input: district string, async database connection
    # Output: list of alert dicts [{id, type, outlet_name, message, severity, timestamp, ...}]
    # Called by: routers/alerts.py
    """
    alerts = []
    seen_ids: set[int] = set()

    # ── 1. Run live statistical anomaly detection ────────────────────────────
    try:
        live = await detect_district_anomaly(
            district=district,
            db=db,
            enrich_with_llm=True,   # try Gemini/LLaMA enrichment
        )
        if live.get("is_anomaly"):
            alert_id = live.get("alert_id")
            if alert_id:
                seen_ids.add(alert_id)
            alerts.append({
                "id":          alert_id or f"live_{district}",
                "outlet_id":   0,
                "outlet_name": (live.get("affected_outlets") or [district])[0],
                "type":        live.get("alert_type", "anomaly"),
                "message":     live.get("message", ""),
                "severity":    live.get("severity", "medium"),
                "created_at":  datetime.now().isoformat(timespec="seconds"),
                "timestamp":   datetime.now().isoformat(timespec="seconds"),
                "dismissed":   0,
                # Extra fields for the frontend and judges
                "trigger_signal":     live.get("trigger_signal"),
                "recommended_action": live.get("recommended_action"),
                "context":            live.get("_context"),
            })
    except Exception as exc:
        print(f"[anomaly] Live detection failed for '{district}': {exc}")

    # ── 2. Fetch any other persisted undismissed alerts from DB ──────────────
    try:
        async with db.execute(
            """SELECT id, outlet_id, type, message, severity, outlet_name,
                      created_at, timestamp, dismissed
               FROM alerts
               WHERE dismissed = 0
               ORDER BY id DESC
               LIMIT 50"""
        ) as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                rid = row["id"]
                if rid in seen_ids:
                    continue  # already included from live detection
                seen_ids.add(rid)
                alerts.append({
                    "id":          rid,
                    "outlet_id":   row["outlet_id"],
                    "outlet_name": row["outlet_name"] or "Unknown",
                    "type":        row["type"],
                    "message":     row["message"],
                    "severity":    row["severity"],
                    "created_at":  row["created_at"],
                    "timestamp":   row["timestamp"] or row["created_at"],
                    "dismissed":   row["dismissed"],
                })
    except Exception as exc:
        print(f"[anomaly] DB alert fetch failed: {exc}")

    # ── 3. Sort: high → medium → info ────────────────────────────────────────
    severity_order = {"high": 0, "critical": 0, "medium": 1, "info": 2}
    alerts.sort(key=lambda a: severity_order.get(a.get("severity", "info"), 3))

    return alerts
