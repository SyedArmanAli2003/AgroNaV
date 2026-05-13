# What it does: Alert feed and dismiss endpoints
# Input: GET for alert list, POST to dismiss an alert
# Output: JSON list of alerts, or success response
# Called by: FastAPI router mount in main.py

from fastapi import APIRouter, Depends
from db.database import get_db
from services.anomaly import get_alerts

router = APIRouter()


@router.get("")
async def list_alerts(db=Depends(get_db)):
    """Return active alerts for Nalgonda territory.

    # What it does: Fetches alerts using ML detection + rule-based fallback
    # Input: None (uses Nalgonda as default district)
    # Output: List of Alert dicts sorted by severity
    # Called by: Frontend Alerts.vue
    """
    try:
        alerts = await get_alerts("Nalgonda", db)
        return alerts
    except Exception as e:
        print(f"[alerts] Error fetching alerts: {e}")
        return []


@router.post("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: int, db=Depends(get_db)):
    """Dismiss an alert by setting dismissed=1.

    # What it does: Marks an alert as dismissed in the database
    # Input: alert_id path parameter
    # Output: {"success": True}
    # Called by: Frontend AlertCard.vue
    """
    try:
        await db.execute("UPDATE alerts SET dismissed = 1 WHERE id = ?", (alert_id,))
        await db.commit()
        return {"success": True}
    except Exception as e:
        print(f"[alerts] Error dismissing alert {alert_id}: {e}")
        return {"success": False, "error": str(e)}
