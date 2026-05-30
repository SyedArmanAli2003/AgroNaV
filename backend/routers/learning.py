# What it does: Weekly Outcome Learning API endpoints
#
# GET  /api/learning/weekly-stats    → raw DB stats (3 SQL queries, no LLM)
# POST /api/learning/weekly-analysis → full pipeline (stats + LLM analysis)
#
# Both accept optional query params: district, state, rep_id
# /weekly-analysis additionally runs NVIDIA GLM → OpenRouter → Gemini → rule-based
#
# Called by: Manager.js "Weekly Learning" tab

from fastapi import APIRouter, Depends, Query
from db.database import get_db
from services.weekly_stats import collect_weekly_stats
from services.weekly_learning import analyze_weekly_outcomes

router = APIRouter(tags=["learning"])


@router.get("/api/learning/weekly-stats")
async def weekly_stats_endpoint(
    district: str = Query("Jalgaon", description="District name"),
    state:    str = Query("Maharashtra", description="State name"),
    db=Depends(get_db)
):
    """
    Run all 3 SQL queries and return raw stats — no LLM.
    Fast response, used for dashboard KPI cards.
    """
    ctx = await collect_weekly_stats(district=district, state=state, db=db)
    return {
        "week_label":           ctx["week_label"],
        "district":             ctx["district"],
        "total_visits":         ctx["total_visits"],
        "total_with_outcomes":  ctx["total_with_outcomes"],
        "sales_pct":            ctx["sales_pct"],
        "orders_pct":           ctx["orders_pct"],
        "no_outcome_pct":       ctx["no_outcome_pct"],
        "this_week_rate":       ctx["this_week_rate"],
        "prev_week_rate":       ctx["prev_week_rate"],
        "delta":                ctx["delta"],
        "product_rows":         ctx["product_rows"],
        "rep_rows":             ctx["rep_rows"],
        "best_product":         ctx["best_product"],
        "reps_needing_coaching":ctx["reps_needing_coaching"],
        "deprioritize_outlets": ctx["deprioritize_outlets"],
        "anchor_date":          ctx["anchor_date"],
    }


@router.post("/api/learning/weekly-analysis")
async def weekly_analysis_endpoint(
    district: str = Query("Jalgaon"),
    state:    str = Query("Maharashtra"),
    db=Depends(get_db)
):
    """
    Full weekly learning pipeline:

    1. Run 3 SQL queries → conversion breakdown, product table, rep breakdown
    2. Fill the judge-facing prompt template with real numbers
    3. Run NVIDIA GLM-5.1 → OpenRouter LLaMA → Gemini → rule-based fallback
    4. Return 9-field JSON: manager_alert, best_product_next_week,
       reps_needing_coaching, deprioritize_outlets, learning_action, etc.

    All rules from the prompt spec are enforced:
    - manager_alert ≤ 15 words
    - reps_needing_coaching = acceptance rate < 30%
    - deprioritize_outlets = zero conversion in 14+ days
    - learning_action = ONE specific change
    """
    ctx    = await collect_weekly_stats(district=district, state=state, db=db)
    result = await analyze_weekly_outcomes(ctx)

    print(
        f"[learning] Weekly analysis for {district}: "
        f"visits={ctx['total_visits']} conversion={ctx['this_week_rate']}% "
        f"source={result.get('source')}"
    )

    return result
