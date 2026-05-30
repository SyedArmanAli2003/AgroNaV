# What it does: Weekly Outcome Learning Engine — LLM analysis of weekly DB stats
#
# Uses the exact judge-facing prompt template:
#   "You are a sales analytics AI for Syngenta India.
#    WEEK: {week_label} | {district}, {state}
#    VISITS: {total_visits} | WITH OUTCOMES: {total_with_outcomes}
#    CONVERSION: Sales {sales_pct}% | Orders {orders_pct}% | No outcome {no_outcome_pct}%
#    VS LAST WEEK: {prev_week_rate}% → {this_week_rate}% ({delta} change)
#    PRODUCTS PITCHED vs ACCEPTED: {product_table}
#    DISTRICT BREAKDOWN: {district_breakdown}
#    REP BREAKDOWN: {rep_breakdown}
#    ..."
#
# Fallback chain: NVIDIA GLM-5.1 → OpenRouter LLaMA → Gemini → rule-based
#
# Output JSON (9-field schema):
#   manager_alert, top_performing_district, underperforming_district,
#   best_product_next_week, best_product_reason, reps_needing_coaching,
#   deprioritize_outlets, insight_summary, learning_action
#
# Called by: routers/learning.py

import os
import json

NVIDIA_API_KEY     = os.getenv("NVIDIA_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")

# ── System persona ────────────────────────────────────────────────────────────
_SYSTEM = (
    "You are a sales analytics AI for Syngenta India. "
    "Return ONLY valid JSON matching the exact schema. No markdown, no explanation. "
    "Only cite patterns visible in the numbers — never invent trends."
)

# ── Expected output schema ────────────────────────────────────────────────────
_EMPTY_RESULT = {
    "manager_alert": "",
    "top_performing_district": "",
    "underperforming_district": "",
    "best_product_next_week": "",
    "best_product_reason": "",
    "reps_needing_coaching": [],
    "deprioritize_outlets": [],
    "insight_summary": "",
    "learning_action": "",
}

_REQUIRED_KEYS = set(_EMPTY_RESULT.keys())


def _build_prompt(ctx: dict) -> str:
    """Fill the exact judge-facing prompt template with real DB numbers."""
    return f"""\
You are a sales analytics AI for Syngenta India.

WEEK: {ctx['week_label']} | {ctx['district']}, {ctx['state']}
VISITS: {ctx['total_visits']} | WITH OUTCOMES: {ctx['total_with_outcomes']}
CONVERSION: Sales {ctx['sales_pct']}% | Orders {ctx['orders_pct']}% | No outcome {ctx['no_outcome_pct']}%
VS LAST WEEK: {ctx['prev_week_rate']}% → {ctx['this_week_rate']}% ({ctx['delta']} change)

PRODUCTS PITCHED vs ACCEPTED:
{ctx['product_table']}

DISTRICT BREAKDOWN:
{ctx['district_breakdown']}

REP BREAKDOWN:
{ctx['rep_breakdown']}

RULES:
- Only cite patterns visible in the numbers — no invented trends
- High pitch + low acceptance = scripting_problem not product_problem
- reps_needing_coaching = acceptance rate below 30%
- deprioritize_outlets = zero conversion in 14+ days
- manager_alert must be under 15 words
- learning_action = ONE specific change for next week's plan

Return ONLY valid JSON, no markdown:
{{"manager_alert":"","top_performing_district":"","underperforming_district":"","best_product_next_week":"","best_product_reason":"","reps_needing_coaching":[],"deprioritize_outlets":[],"insight_summary":"","learning_action":""}}"""


def _validate(result: dict, ctx: dict) -> dict:
    """Enforce the strict rules from the prompt spec."""
    # reps_needing_coaching must be from ctx reps_needing_coaching if LLM is wrong
    if not isinstance(result.get("reps_needing_coaching"), list):
        result["reps_needing_coaching"] = ctx.get("reps_needing_coaching", [])

    # deprioritize_outlets similarly
    if not isinstance(result.get("deprioritize_outlets"), list):
        result["deprioritize_outlets"] = ctx.get("deprioritize_outlets", [])

    # manager_alert ≤ 15 words
    alert = result.get("manager_alert", "")
    if len(str(alert).split()) > 15:
        result["manager_alert"] = " ".join(str(alert).split()[:15])

    # Fill any missing keys from rule-based defaults
    for k in _REQUIRED_KEYS:
        if k not in result:
            result[k] = _EMPTY_RESULT[k]

    return result


def _parse_json(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(text)


# ── Rule-based deterministic fallback ─────────────────────────────────────────

def _rule_based_analysis(ctx: dict) -> dict:
    """
    Generate the 9-field output from pure DB numbers — no LLM needed.
    All facts cited are real numbers from the queries.
    """
    best_product = ctx.get("best_product", "N/A")
    best_rate    = ctx.get("best_product_rate", 0)
    district     = ctx.get("district", "your district")
    total        = ctx.get("total_visits", 0)
    this_rate    = ctx.get("this_week_rate", 0)
    prev_rate    = ctx.get("prev_week_rate", 0)
    delta        = ctx.get("delta", "0")
    reps_coach   = ctx.get("reps_needing_coaching", [])
    deprior      = ctx.get("deprioritize_outlets", [])
    no_out_pct   = ctx.get("no_outcome_pct", 0)
    sales_pct    = ctx.get("sales_pct", 0)
    orders_pct   = ctx.get("orders_pct", 0)

    # manager_alert — ≤ 15 words, cites a number
    if this_rate < prev_rate:
        manager_alert = f"Conversion fell to {this_rate}% from {prev_rate}% last week — coach low-rate reps"
    elif no_out_pct > 40:
        manager_alert = f"{no_out_pct}% visits have no outcome logged — fix data discipline"
    else:
        manager_alert = f"Conversion {this_rate}% this week from {total} visits in {district}"
    # Trim to 15 words
    manager_alert = " ".join(manager_alert.split()[:15])

    # insight_summary
    if no_out_pct > 40:
        insight = (
            f"High pitch volume ({total} visits) but {no_out_pct}% lack outcome data. "
            f"This is a data discipline issue, not a product problem. "
            f"{best_product} has the strongest conversion signal at {best_rate}%."
        )
    elif sales_pct < 20 and orders_pct > sales_pct:
        insight = (
            f"{orders_pct}% of visits resulted in orders vs {sales_pct}% in direct sales — "
            f"reps are getting intent but not closing. Scripting problem likely. "
            f"Focus on closing technique in next coaching session."
        )
    else:
        insight = (
            f"This week: {total} visits, {this_rate}% conversion vs {prev_rate}% last week ({delta} pts). "
            f"{best_product} leads product acceptance at {best_rate}%. "
            f"{'Reps needing coaching: ' + ', '.join(reps_coach[:3]) + '.' if reps_coach else 'All reps above 30% threshold.'}"
        )

    # learning_action — one specific change
    if reps_coach:
        learning_action = (
            f"Run a 20-min role-play session with {reps_coach[0]} this Monday "
            f"focusing on closing objections — their conversion is below 30%."
        )
    elif no_out_pct > 30:
        learning_action = (
            f"Make outcome logging mandatory for all visits starting Monday — "
            f"{no_out_pct}% of this week's visits have no outcome recorded."
        )
    elif best_product != "N/A":
        learning_action = (
            f"Push {best_product} as the primary pitch for all reps next week — "
            f"it has the highest acceptance rate ({best_rate}%) in {district}."
        )
    else:
        learning_action = f"Focus next week's plan on the top 5 priority outlets by score in {district}."

    return {
        "manager_alert":            manager_alert,
        "top_performing_district":  district,
        "underperforming_district": district,
        "best_product_next_week":   best_product,
        "best_product_reason":      f"{best_product} had {best_rate}% acceptance rate this week in {district}",
        "reps_needing_coaching":    reps_coach,
        "deprioritize_outlets":     deprior,
        "insight_summary":          insight,
        "learning_action":          learning_action,
    }


# ── Main public function ──────────────────────────────────────────────────────

async def analyze_weekly_outcomes(ctx: dict) -> dict:
    """
    Run the weekly learning analysis via 4-tier LLM fallback.

    Parameters:
        ctx: output of weekly_stats.collect_weekly_stats()

    Returns:
        9-field JSON dict (manager_alert, top_performing_district, ...)
        plus metadata: {"source": str, "raw_ctx": ctx}
    """
    prompt = _build_prompt(ctx)
    result = None

    # ── Tier 1: NVIDIA GLM-5.1 ───────────────────────────────────────────────
    if NVIDIA_API_KEY and not NVIDIA_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=NVIDIA_API_KEY)
            resp = client.chat.completions.create(
                model="z-ai/glm-5.1",
                messages=[{"role": "system", "content": _SYSTEM}, {"role": "user", "content": prompt}],
                temperature=0.2, max_tokens=600, stream=False,
            )
            result = _parse_json(resp.choices[0].message.content)
            if not _REQUIRED_KEYS.issubset(result.keys()):
                raise ValueError(f"Missing keys: {_REQUIRED_KEYS - set(result.keys())}")
            result = _validate(result, ctx)
            result["source"] = "nvidia-glm-5.1"
        except Exception as e:
            print(f"[learning] NVIDIA GLM failed: {e}")
            result = None

    # ── Tier 2: OpenRouter LLaMA 3.3 ─────────────────────────────────────────
    if result is None and OPENROUTER_API_KEY and not OPENROUTER_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
            resp = client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct",
                messages=[{"role": "system", "content": _SYSTEM}, {"role": "user", "content": prompt}],
                temperature=0.2, max_tokens=600,
            )
            result = _parse_json(resp.choices[0].message.content)
            if not _REQUIRED_KEYS.issubset(result.keys()):
                raise ValueError(f"Missing keys: {_REQUIRED_KEYS - set(result.keys())}")
            result = _validate(result, ctx)
            result["source"] = "openrouter-llama3"
        except Exception as e:
            print(f"[learning] OpenRouter failed: {e}")
            result = None

    # ── Tier 3: Google Gemini ─────────────────────────────────────────────────
    if result is None and GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(model_name="gemini-2.0-flash", system_instruction=_SYSTEM)
            resp  = model.generate_content(prompt)
            result = _parse_json(resp.text)
            if not _REQUIRED_KEYS.issubset(result.keys()):
                raise ValueError(f"Missing keys: {_REQUIRED_KEYS - set(result.keys())}")
            result = _validate(result, ctx)
            result["source"] = "gemini-2.0-flash"
        except Exception as e:
            print(f"[learning] Gemini failed: {e}")
            result = None

    # ── Tier 4: Rule-based ────────────────────────────────────────────────────
    if result is None:
        result = _rule_based_analysis(ctx)
        result["source"] = "rule-based"

    return {**result, "raw_ctx": ctx}
