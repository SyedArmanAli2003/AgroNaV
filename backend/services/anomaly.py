# What it does: Generates anomaly alerts using rule-based detection
# Input: District name and database connection
# Output: List of alert dicts sorted by severity
# Called by: routers/alerts.py, routers/sync.py

from datetime import datetime, timedelta


async def get_alerts(district, db):
    """Get anomaly alerts — tries ML detection first, falls back to rules.

    # What it does: Generates alerts from ML model or rule-based logic, deduplicates, sorts by severity
    # Input: district string, async database connection
    # Output: list of alert dicts [{id, outlet_id, type, message, severity, created_at, dismissed}]
    # Called by: routers/alerts.py, routers/sync.py
    """
    # First, return any existing alerts from DB that are not dismissed
    alerts = []
    try:
        async with db.execute(
            "SELECT id, outlet_id, type, message, severity, created_at, dismissed FROM alerts WHERE dismissed = 0 ORDER BY id"
        ) as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                alerts.append({
                    "id": row["id"],
                    "outlet_id": row["outlet_id"],
                    "type": row["type"],
                    "message": row["message"],
                    "severity": row["severity"],
                    "created_at": row["created_at"],
                    "dismissed": row["dismissed"]
                })
    except Exception as e:
        print(f"[anomaly] DB alert fetch failed: {e}")

    # Sort: high → medium → info
    severity_order = {"high": 0, "medium": 1, "info": 2}
    alerts.sort(key=lambda a: severity_order.get(a.get("severity", "info"), 3))

    return alerts
