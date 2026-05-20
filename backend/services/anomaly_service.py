# What it does: Z-score + rule-based anomaly detection for the new recommendations API
# Input: Sales and inventory DataFrames
# Output: List of alert dicts
# Called by: routers/recommendations.py, routers/alerts.py (new system)

import numpy as np
from datetime import datetime


def detect_anomalies(sales_data: list, inventory_data: list) -> list:
    """
    Z-score + rule-based anomaly detection.

    Parameters:
        sales_data: list of dicts with keys: retailer_id, retailer_name, week, revenue
        inventory_data: list of dicts with keys: retailer_id, retailer_name, sku_qty, daily_demand

    Returns:
        list of alert dicts: {type, outlet_id, outlet_name, message, severity, timestamp}
    """
    alerts = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Group sales by retailer
    retailer_sales = {}
    for s in sales_data:
        rid = s.get("retailer_id", "unknown")
        retailer_sales.setdefault(rid, []).append(s)

    for rid, sales in retailer_sales.items():
        if len(sales) < 4:
            continue

        revenues = [s.get("revenue", 0) for s in sales]
        name = sales[0].get("retailer_name", "Unknown")

        # Last 4 weeks for baseline
        baseline = revenues[-4:]
        mean_rev = np.mean(baseline)
        std_rev = np.std(baseline) if len(baseline) > 1 else 0
        current = revenues[-1] if revenues else 0

        if std_rev > 0:
            z_score = (current - mean_rev) / std_rev

            # 1. Sales velocity spike: z > 2
            if z_score > 2.0:
                alerts.append({
                    "type": "sales_spike",
                    "outlet_id": rid,
                    "outlet_name": name,
                    "message": f"{name} — sales up {int((current/mean_rev - 1)*100)}% vs 4-week average",
                    "severity": "medium",
                    "timestamp": now
                })

            # 2. Sales velocity drop: z < -2
            elif z_score < -2.0:
                alerts.append({
                    "type": "sales_drop",
                    "outlet_id": rid,
                    "outlet_name": name,
                    "message": f"{name} — sales dropped {int((1 - current/mean_rev)*100)}% below 4-week average",
                    "severity": "high",
                    "timestamp": now
                })

    # 3. Inventory < 3 days of stock → "Stock-out risk"
    for inv in inventory_data:
        sku = inv.get("sku_qty", 0)
        demand = inv.get("daily_demand", 1)
        days_of_stock = sku / max(demand, 0.1)

        if days_of_stock < 3:
            alerts.append({
                "type": "stock_out_risk",
                "outlet_id": inv.get("retailer_id", "unknown"),
                "outlet_name": inv.get("retailer_name", "Unknown"),
                "message": f"{inv.get('retailer_name', 'Unknown')} — stock runs out in {days_of_stock:.0f} days",
                "severity": "high",
                "timestamp": now
            })

    return alerts
