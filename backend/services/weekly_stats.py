# What it does: Weekly Outcome Learning Engine — all from DB, no external APIs
#
# Data sources (both SQLite tables):
#   visit_logs          → live rep-submitted visits (outcome, rep_id, date, retailer_name)
#   historical_visit_log → 30 000-row Syngenta dataset (product_recommended, rep_id, visit_date)
#
# Three SQL queries exactly as specified:
#   Q1: Conversion breakdown (sales_pct, orders_pct, total) — last 7 days
#   Q2: Product pitch table (product → pitched count, accepted count)
#   Q3: Rep breakdown (rep_id → visits, rate)
#
# Because the live table has few rows during the hackathon, we UNION data from
# historical_visit_log (anchored to dataset end date 2026-03-29) as a fallback.
#
# Output:
#   {
#     week_label, district, state,
#     total_visits, total_with_outcomes,
#     sales_pct, orders_pct, no_outcome_pct,
#     prev_week_rate, this_week_rate, delta,
#     product_table_str,   # formatted string → {product_table} in prompt
#     product_rows,        # list of {product, pitched, accepted, rate}
#     rep_breakdown_str,   # formatted string → {rep_breakdown} in prompt
#     rep_rows,            # list of {rep_id, visits, rate}
#     district_breakdown_str,
#     deprioritize_outlets, # list of retailer IDs with 0 conversion in 14+ days
#   }
#
# Called by: services/weekly_learning.py → routers/learning.py

import os
from datetime import date, timedelta

# Dataset end date — all rolling windows anchor here for consistency with seeded data
DATASET_END_DATE = date(2026, 3, 29)


def _window_dates(anchor: date = DATASET_END_DATE) -> tuple[str, str, str, str]:
    """Return (this_week_start, this_week_end, prev_week_start, prev_week_end) as ISO strings."""
    this_end   = anchor.isoformat()
    this_start = (anchor - timedelta(days=6)).isoformat()
    prev_end   = (anchor - timedelta(days=7)).isoformat()
    prev_start = (anchor - timedelta(days=13)).isoformat()
    return this_start, this_end, prev_start, prev_end


async def _q1_conversion(db, this_start: str, this_end: str, prev_start: str, prev_end: str) -> dict:
    """
    Q1 — Conversion breakdown from historical_visit_log UNION visit_logs.
    historical_visit_log has no 'outcome' column so we treat every row as a 'visit'
    and use visit_logs for actual sale/order outcomes.
    """
    # This week: total visits from historical log
    async with db.execute(
        "SELECT COUNT(*) as total FROM historical_visit_log WHERE visit_date BETWEEN ? AND ?",
        (this_start, this_end)
    ) as cur:
        row = await cur.fetchone()
        total_hist = row["total"] or 0

    # This week: live outcomes from visit_logs
    async with db.execute(
        """SELECT
            SUM(CASE WHEN outcome IN ('sale','Order placed') THEN 1 ELSE 0 END) as sales,
            SUM(CASE WHEN outcome IN ('order','Interested') THEN 1 ELSE 0 END) as orders,
            SUM(CASE WHEN outcome IS NULL OR outcome = '' THEN 1 ELSE 0 END) as no_out,
            COUNT(*) as total
           FROM visit_logs
           WHERE date BETWEEN ? AND ?""",
        (this_start, this_end)
    ) as cur:
        row = await cur.fetchone()
        sales_live   = row["sales"] or 0
        orders_live  = row["orders"] or 0
        no_out_live  = row["no_out"] or 0
        total_live   = row["total"] or 0

    # Combined totals
    total = max(total_hist + total_live, total_live, 1)
    total_with_outcomes = total_live

    sales_pct    = round(sales_live  * 100.0 / max(total_live, 1), 1)
    orders_pct   = round(orders_live * 100.0 / max(total_live, 1), 1)
    no_out_pct   = round(no_out_live * 100.0 / max(total_live, 1), 1)

    # Previous week rate (for delta)
    async with db.execute(
        """SELECT SUM(CASE WHEN outcome IN ('sale','Order placed') THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0) as rate
           FROM visit_logs WHERE date BETWEEN ? AND ?""",
        (prev_start, prev_end)
    ) as cur:
        row = await cur.fetchone()
        prev_rate = round(row["rate"] or 0.0, 1)

    this_rate = sales_pct
    delta     = round(this_rate - prev_rate, 1)

    return {
        "total_visits":          total,
        "total_with_outcomes":   total_with_outcomes,
        "sales_pct":             sales_pct,
        "orders_pct":            orders_pct,
        "no_outcome_pct":        no_out_pct,
        "prev_week_rate":        prev_rate,
        "this_week_rate":        this_rate,
        "delta":                 f"+{delta}" if delta >= 0 else str(delta),
    }


async def _q2_products(db, this_start: str, this_end: str) -> tuple[list, str]:
    """
    Q2 — Product pitch table.
    Pulls product_recommended from historical_visit_log (has the real SKU data)
    and matches against live outcomes where available.
    """
    # Product pitch counts from historical data (real SKU column)
    async with db.execute(
        """SELECT product_recommended,
                  COUNT(*) as pitched
           FROM historical_visit_log
           WHERE visit_date BETWEEN ? AND ?
             AND product_recommended IS NOT NULL AND product_recommended != ''
           GROUP BY product_recommended
           ORDER BY pitched DESC
           LIMIT 10""",
        (this_start, this_end)
    ) as cur:
        hist_rows = await cur.fetchall()

    # Live acceptance counts
    async with db.execute(
        """SELECT outlet_id,
                  SUM(CASE WHEN outcome IN ('sale','Order placed') THEN 1 ELSE 0 END) as accepted
           FROM visit_logs
           WHERE date BETWEEN ? AND ?
           GROUP BY outlet_id""",
        (this_start, this_end)
    ) as cur:
        live_rows = await cur.fetchall()
    total_live_sales = sum(r["accepted"] or 0 for r in live_rows)

    # Build product rows
    rows = []
    for r in hist_rows:
        product = r["product_recommended"]
        pitched = r["pitched"] or 0
        # Distribute live sales proportionally (best estimate without product column in live table)
        accepted = round((pitched / max(sum(x["pitched"] or 0 for x in hist_rows), 1)) * total_live_sales)
        rate     = round(accepted * 100.0 / max(pitched, 1), 1)
        rows.append({"product": product, "pitched": pitched, "accepted": accepted, "rate": rate})

    # Format string for prompt
    if rows:
        lines = [f"{r['product']}: pitched={r['pitched']}, accepted={r['accepted']}, rate={r['rate']}%" for r in rows]
        table_str = "\n".join(lines)
    else:
        table_str = "No product data for this week"

    return rows, table_str


async def _q3_reps(db, this_start: str, this_end: str) -> tuple[list, str]:
    """
    Q3 — Rep breakdown from historical_visit_log (has TEXT rep_ids).
    """
    async with db.execute(
        """SELECT rep_id,
                  COUNT(*) as visits,
                  0 as sales
           FROM historical_visit_log
           WHERE visit_date BETWEEN ? AND ?
             AND rep_id IS NOT NULL
           GROUP BY rep_id
           ORDER BY visits DESC
           LIMIT 15""",
        (this_start, this_end)
    ) as cur:
        rows = await cur.fetchall()

    # Also pull from live visit_logs
    async with db.execute(
        """SELECT CAST(rep_id AS TEXT) as rep_id,
                  COUNT(*) as visits,
                  SUM(CASE WHEN outcome IN ('sale','Order placed') THEN 1 ELSE 0 END) as sales
           FROM visit_logs
           WHERE date BETWEEN ? AND ?
           GROUP BY rep_id""",
        (this_start, this_end)
    ) as cur:
        live_rows = await cur.fetchall()

    live_map = {str(r["rep_id"]): {"visits": r["visits"] or 0, "sales": r["sales"] or 0} for r in live_rows}

    rep_rows = []
    for r in rows:
        rid   = str(r["rep_id"])
        visits = (r["visits"] or 0) + live_map.get(rid, {}).get("visits", 0)
        sales  = live_map.get(rid, {}).get("sales", 0)
        rate   = round(sales * 100.0 / max(visits, 1), 1)
        rep_rows.append({"rep_id": rid, "visits": visits, "rate": rate, "sales": sales})

    rep_rows.sort(key=lambda x: x["rate"], reverse=True)

    if rep_rows:
        lines = [f"{r['rep_id']}: {r['visits']} visits, {r['rate']}% conversion" for r in rep_rows[:10]]
        rep_str = "\n".join(lines)
    else:
        rep_str = "No rep visit data for this week"

    return rep_rows, rep_str


async def _deprioritize_outlets(db, anchor: date) -> list:
    """Return outlet/retailer IDs with zero conversions in the last 14 days."""
    cutoff = (anchor - timedelta(days=14)).isoformat()
    async with db.execute(
        """SELECT outlet_id,
                  SUM(CASE WHEN outcome IN ('sale','Order placed') THEN 1 ELSE 0 END) as wins,
                  COUNT(*) as visits
           FROM visit_logs
           WHERE date >= ?
           GROUP BY outlet_id
           HAVING wins = 0 AND visits >= 1""",
        (cutoff,)
    ) as cur:
        rows = await cur.fetchall()
    return [str(r["outlet_id"]) for r in rows]


async def collect_weekly_stats(district: str, state: str, db, anchor: date = DATASET_END_DATE) -> dict:
    """
    Run all three SQL queries and return the structured context dict
    ready to be injected into the LLM prompt.

    Parameters:
        district: display string (e.g. "Jalgaon")
        state:    display string (e.g. "Maharashtra")
        db:       aiosqlite connection
        anchor:   end date for rolling window (default = dataset end date 2026-03-29)

    Returns:
        Full context dict with all prompt variables + structured rows for UI rendering.
    """
    this_start, this_end, prev_start, prev_end = _window_dates(anchor)
    week_label = f"{this_start} – {this_end}"

    q1 = await _q1_conversion(db, this_start, this_end, prev_start, prev_end)
    product_rows, product_table_str = await _q2_products(db, this_start, this_end)
    rep_rows, rep_breakdown_str     = await _q3_reps(db, this_start, this_end)
    deprioritize = await _deprioritize_outlets(db, anchor)

    # District breakdown (summarise from rep data — no separate district column in hist log)
    district_breakdown_str = f"{district}: {q1['total_visits']} visits | {q1['this_week_rate']}% conversion"

    # Best product (highest acceptance rate with at least 2 pitches)
    pitched_enough = [p for p in product_rows if p["pitched"] >= 2]
    best_product = max(pitched_enough, key=lambda x: x["rate"]) if pitched_enough else (product_rows[0] if product_rows else None)

    return {
        # Prompt template variables
        "week_label":              week_label,
        "district":                district,
        "state":                   state,
        "total_visits":            q1["total_visits"],
        "total_with_outcomes":     q1["total_with_outcomes"],
        "sales_pct":               q1["sales_pct"],
        "orders_pct":              q1["orders_pct"],
        "no_outcome_pct":          q1["no_outcome_pct"],
        "prev_week_rate":          q1["prev_week_rate"],
        "this_week_rate":          q1["this_week_rate"],
        "delta":                   q1["delta"],
        "product_table":           product_table_str,
        "district_breakdown":      district_breakdown_str,
        "rep_breakdown":           rep_breakdown_str,
        # Structured data for UI
        "product_rows":            product_rows,
        "rep_rows":                rep_rows,
        "best_product":            best_product["product"] if best_product else "N/A",
        "best_product_rate":       best_product["rate"] if best_product else 0,
        "deprioritize_outlets":    deprioritize,
        "reps_needing_coaching":   [r["rep_id"] for r in rep_rows if r["rate"] < 30 and r["visits"] >= 2],
        # Meta
        "data_source":             "historical_visit_log + visit_logs",
        "anchor_date":             anchor.isoformat(),
    }
