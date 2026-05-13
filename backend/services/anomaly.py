# What it does: Generates anomaly alerts using ML detection + rule-based fallback
# Input: District name and database connection
# Output: List of alert dicts sorted by severity
# Called by: routers/alerts.py, routers/sync.py

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

try:
    from ml.outliers import detect_anomalies as ml_detect
except ImportError:
    ml_detect = None


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

    # Try ML detection
    ml_alerts = None
    try:
        if ml_detect is not None:
            # Build territory data for ML
            territory_data = {"district": district}
            ml_alerts = ml_detect(territory_data)
    except Exception as e:
        print(f"[anomaly] ML detection failed, using rule-based fallback: {e}")
        ml_alerts = None

    # If ML returned alerts, merge with existing (deduplicate by outlet_id + type)
    if ml_alerts:
        existing_keys = {(a.get("outlet_id"), a.get("type")) for a in alerts}
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for ml_alert in ml_alerts:
            key = (ml_alert.get("outlet_id"), ml_alert.get("type"))
            if key not in existing_keys:
                alerts.append({
                    "id": 0,
                    "outlet_id": ml_alert.get("outlet_id"),
                    "type": ml_alert.get("type", "anomaly"),
                    "message": ml_alert.get("message", "Anomaly detected"),
                    "severity": ml_alert.get("severity", "medium"),
                    "created_at": now,
                    "dismissed": 0
                })

    # Sort: high → medium → info
    severity_order = {"high": 0, "medium": 1, "info": 2}
    alerts.sort(key=lambda a: severity_order.get(a.get("severity", "info"), 3))

    return alerts
