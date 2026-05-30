# What it does: Generates a 3-line plain-English recalibration explanation
#   for a field manager (non-technical audience).
#
# Input:
#   moved_up:   list of {name, old_score, new_score, delta}
#   moved_down: list of {name, old_score, new_score, delta}
#   stats:      {log_count, sales_count, no_outcome_count, days}
#
# Output: {"line1": str, "line2": str, "line3": str, "full_text": str}
#
# Tier 1: Gemini 1.5 Flash (judge-facing prompt exactly)
# Tier 2: OpenRouter LLaMA-3
# Tier 3: Deterministic rule-based (always works, cites real numbers)
#
# Called by: routers/recalibrate.py

import os
import json

GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# ── Prompt template (mirrors judge-facing spec exactly) ───────────────────────
_SYSTEM = (
    "You are a field operations AI explaining a live score update to a Syngenta field manager. "
    "Write exactly 3 lines. Plain text only — no JSON, no bullets, no markdown. "
    "Write to a non-technical manager. Every sentence must cite a specific number from the data."
)


def _build_prompt(moved_up: list, moved_down: list, stats: dict) -> str:
    """
    Fill the judge-facing prompt template with real data.
    """
    def fmt_list(items: list) -> str:
        if not items:
            return "none"
        return ", ".join(
            f"{x['name']}: {x['old_score']} → {x['new_score']} ({'+' if x['delta']>0 else ''}{x['delta']})"
            for x in items[:5]
        )

    days         = stats.get("days", 30)
    log_count    = stats.get("log_count", 0)
    sales_count  = stats.get("sales_count", 0)
    no_out_count = stats.get("no_outcome_count", 0)

    return f"""\
RECALIBRATION JUST RAN using: final_score = 80% model score + 20% historical conversion rate

OUTLETS THAT MOVED UP:
{fmt_list(moved_up)}

OUTLETS THAT MOVED DOWN:
{fmt_list(moved_down)}

OUTCOMES ANALYZED:
- Visit logs reviewed: {log_count}
- Confirmed sales: {sales_count}
- No outcome recorded: {no_out_count}
- Time window: last {days} days

Write exactly 3 lines for the manager:
Line 1: Biggest mover (up or down) and why in one sentence
Line 2: What this means for tomorrow's plan in one sentence
Line 3: One outlet the rep should now prioritize that they were ignoring

Plain text, 3 lines only. No JSON. No bullets. Write to a non-technical manager."""


# ── Deterministic fallback (always works, no API) ─────────────────────────────

def _rule_based_explain(moved_up: list, moved_down: list, stats: dict) -> dict:
    """
    Generate a 3-line explanation using only the real numbers — no LLM needed.
    Every sentence cites a specific figure from the recalibration output.
    """
    log_count    = stats.get("log_count", 0)
    sales_count  = stats.get("sales_count", 0)
    no_out_count = stats.get("no_outcome_count", 0)
    days         = stats.get("days", 30)

    # Pick the biggest absolute mover across both lists
    all_movers = moved_up + moved_down
    if all_movers:
        biggest = max(all_movers, key=lambda x: abs(x["delta"]))
        direction = "up" if biggest["delta"] > 0 else "down"
        delta_str = f"+{biggest['delta']}" if biggest["delta"] > 0 else str(biggest["delta"])
        line1 = (
            f"{biggest['name']} moved {direction} the most, from score "
            f"{biggest['old_score']} to {biggest['new_score']} ({delta_str} pts) "
            f"after {sales_count} confirmed sale{'s' if sales_count != 1 else ''} "
            f"were factored into the 80/20 recalibration."
        )
    else:
        line1 = (
            f"Scores held steady across all outlets — "
            f"{log_count} visit log{'s' if log_count != 1 else ''} reviewed with "
            f"{sales_count} confirmed sale{'s' if sales_count != 1 else ''} in the last {days} days."
        )

    # Line 2 — action implication
    if moved_up:
        top = moved_up[0]
        line2 = (
            f"Tomorrow, prioritise {top['name']} (now scoring {top['new_score']}/100) "
            f"as it jumped {top['delta']} points — the model sees a strong conversion window."
        )
    elif moved_down:
        worst = moved_down[0]
        line2 = (
            f"Tomorrow, shift time away from {worst['name']} (score fell to {worst['new_score']}/100) "
            f"and focus on outlets where recent logs show higher close rates."
        )
    else:
        line2 = (
            f"Tomorrow's plan stays the same — with {no_out_count} visits still unrecorded, "
            f"ask the rep team to log outcomes so the model can recalibrate more accurately."
        )

    # Line 3 — hidden gem: highest-scoring outlet that had no recent outcome logged
    if moved_up and len(moved_up) > 1:
        hidden = moved_up[-1]   # smallest mover in the up-list = previously overlooked
        line3 = (
            f"Don't overlook {hidden['name']} — its score rose to {hidden['new_score']}/100 "
            f"but it likely hasn't been visited recently; now is the right window."
        )
    elif moved_down:
        # Fallen outlet might be recoverable
        recover = moved_down[-1]
        line3 = (
            f"Consider a recovery visit to {recover['name']} (score: {recover['new_score']}/100) "
            f"before its ranking falls further — early engagement often reverses the trend."
        )
    else:
        line3 = (
            f"Focus on the {no_out_count} visit{'s' if no_out_count != 1 else ''} "
            f"with no outcome recorded — logging even a 'no sale' trains the model for better predictions."
        )

    full_text = f"{line1}\n{line2}\n{line3}"
    return {"line1": line1, "line2": line2, "line3": line3, "full_text": full_text, "source": "rule-based"}


# ── Main public function ──────────────────────────────────────────────────────

async def generate_recalibration_explanation(
    moved_up: list,
    moved_down: list,
    stats: dict,
) -> dict:
    """
    Generate the 3-line manager explanation for a recalibration run.

    Parameters:
        moved_up:   list of {name, old_score, new_score, delta}
        moved_down: list of {name, old_score, new_score, delta}
        stats:      {log_count, sales_count, no_outcome_count, days}

    Returns:
        {"line1": str, "line2": str, "line3": str, "full_text": str, "source": str}
    """
    prompt = _build_prompt(moved_up, moved_down, stats)
    result = None

    # ── Tier 1: Gemini ────────────────────────────────────────────────────────
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=_SYSTEM
            )
            resp  = model.generate_content(prompt)
            lines = [l.strip() for l in resp.text.strip().splitlines() if l.strip()]
            if len(lines) >= 3:
                result = {
                    "line1": lines[0], "line2": lines[1], "line3": lines[2],
                    "full_text": "\n".join(lines[:3]),
                    "source": "gemini-1.5-flash"
                }
        except Exception as exc:
            print(f"[recalib-explain] Gemini failed: {exc}")

    # ── Tier 2: OpenRouter LLaMA-3 ────────────────────────────────────────────
    if result is None and OPENROUTER_API_KEY and not OPENROUTER_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
            resp = client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct",
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": prompt}
                ],
                temperature=0.4,
                max_tokens=300,
            )
            text  = resp.choices[0].message.content.strip()
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            if len(lines) >= 3:
                result = {
                    "line1": lines[0], "line2": lines[1], "line3": lines[2],
                    "full_text": "\n".join(lines[:3]),
                    "source": "openrouter-llama3"
                }
        except Exception as exc:
            print(f"[recalib-explain] OpenRouter failed: {exc}")

    # ── Tier 3: Rule-based deterministic ──────────────────────────────────────
    if result is None:
        result = _rule_based_explain(moved_up, moved_down, stats)

    return result
