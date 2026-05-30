# What it does: Generates a 3-sentence morning briefing for the field rep
#   using the exact judge-facing prompt template.
#
# Prompt template (exact match to spec):
#   "You are a field operations planner for Syngenta India.
#    REP NAME: {rep_name} | DATE: {date} | START: {district}
#    TODAY'S ROUTE: {ordered_outlet_list}
#    TOTAL: {total_km}km | {total_minutes} minutes drive time
#    TOP ALERT: {top_alert_message}
#    WEATHER: {weather_risk}
#    Write a morning briefing. Exactly 3 sentences..."
#
# Fallback chain:
#   Tier 1: NVIDIA GLM-5.1 (primary)
#   Tier 2: OpenRouter LLaMA 3.3
#   Tier 3: Google Gemini 2.0 Flash
#   Tier 4: Rule-based deterministic (always works offline)
#
# Input: all fields from the prompt template
# Output: {"line1": str, "line2": str, "line3": str, "full_text": str, "source": str}
# Called by: routers/route.py

import os
import json

NVIDIA_API_KEY     = os.getenv("NVIDIA_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")

# ── System persona (unchanged per spec) ──────────────────────────────────────
_SYSTEM = (
    "You are a field operations planner for Syngenta India. "
    "Write exactly 3 sentences of plain text. No JSON, no bullets, no markdown. "
    "Talk directly to the rep by name in simple English. "
    "Every sentence must be grounded in the data provided."
)

# ── Prompt builder (mirrors judge-facing template exactly) ────────────────────

def _build_prompt(
    rep_name: str,
    date: str,
    district: str,
    ordered_outlet_list: str,
    total_km: float,
    total_minutes: int,
    top_alert_message: str,
    weather_risk: str,
) -> str:
    return f"""\
You are a field operations planner for Syngenta India.

REP NAME: {rep_name} | DATE: {date} | START: {district}

TODAY'S ROUTE (ordered by Google Routes API + priority score):
{ordered_outlet_list}

TOTAL: {total_km}km | {total_minutes} minutes drive time
TOP ALERT: {top_alert_message}
WEATHER: {weather_risk}

Write a morning briefing. Exactly 3 sentences:
1. Name Stop 1 and the single most urgent reason to go there first
2. Total route time and distance
3. One thing to watch for today based on weather or alerts

Plain text only. No JSON. No bullets. Talk directly to {rep_name} in simple English.
3 sentences maximum."""


# ── Parse 3 lines from LLM output ────────────────────────────────────────────

def _parse_lines(text: str) -> list[str]:
    """Extract exactly 3 non-empty lines from LLM output."""
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    # Strip leading numbering like "1." or "1)"
    cleaned = []
    for l in lines:
        if len(l) > 2 and l[0].isdigit() and l[1] in ".):":
            l = l[2:].strip()
        cleaned.append(l)
    return cleaned[:3]


# ── Rule-based fallback ───────────────────────────────────────────────────────

def _rule_based_brief(
    rep_name: str,
    date: str,
    district: str,
    ordered_outlet_list: str,
    total_km: float,
    total_minutes: int,
    top_alert_message: str,
    weather_risk: str,
) -> dict:
    """
    Generate a 3-sentence briefing from pure data — no API needed.
    Every sentence cites a specific figure or signal.
    """
    # Extract Stop 1 name from the formatted list
    first_line = (ordered_outlet_list or "").splitlines()[0] if ordered_outlet_list else ""
    stop1_name = "your first stop"
    stop1_reason = "its high priority score"
    if "Stop 1:" in first_line:
        parts = first_line.split("|")
        stop1_name = parts[0].replace("Stop 1:", "").strip() if parts else stop1_name
        for p in parts:
            if "Reason:" in p:
                stop1_reason = p.replace("Reason:", "").strip()
                break

    total_hours = f"{total_minutes // 60}h {total_minutes % 60}min" if total_minutes >= 60 else f"{total_minutes}min"

    line1 = (
        f"{rep_name}, head to {stop1_name} first today — "
        f"{stop1_reason} makes it the most urgent stop on your route."
    )
    line2 = (
        f"Your full route covers {total_km}km with approximately {total_hours} of drive time, "
        f"so plan to start early to hit all {len([l for l in ordered_outlet_list.splitlines() if 'Stop' in l])} stops."
    )

    # Line 3 based on weather or alert
    if top_alert_message and top_alert_message.lower() not in ("none", "no alerts", ""):
        line3 = (
            f"Watch out for the active alert — {top_alert_message} — "
            f"and have your talking points ready before you walk in."
        )
    elif "fungal" in weather_risk.lower() or "rain" in weather_risk.lower():
        line3 = (
            f"With {weather_risk} in the forecast, push fungicide stock replenishment "
            f"at every stop — spray windows will open in the next 48 hours."
        )
    elif "heat" in weather_risk.lower():
        line3 = (
            f"Heat stress is forecast today ({weather_risk}), "
            f"so advise early-morning spray timing to all retailers you visit."
        )
    else:
        line3 = (
            f"Weather looks {weather_risk} today — stay alert for any field reports "
            f"of pest activity and log them via the Competitor Observation field."
        )

    full_text = f"{line1} {line2} {line3}"
    return {
        "line1":     line1,
        "line2":     line2,
        "line3":     line3,
        "full_text": full_text,
        "source":    "rule-based",
    }


# ── Main public function ──────────────────────────────────────────────────────

async def generate_morning_briefing(
    rep_name: str,
    date: str,
    district: str,
    ordered_outlet_list: str,
    total_km: float,
    total_minutes: int,
    top_alert_message: str,
    weather_risk: str,
) -> dict:
    """
    Generate the 3-sentence morning briefing via 4-tier fallback chain.

    Returns:
        {"line1": str, "line2": str, "line3": str, "full_text": str, "source": str}
    """
    prompt = _build_prompt(
        rep_name, date, district, ordered_outlet_list,
        total_km, total_minutes, top_alert_message, weather_risk,
    )
    result = None

    # ── Tier 1: NVIDIA GLM-5.1 ───────────────────────────────────────────────
    if NVIDIA_API_KEY and not NVIDIA_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY,
            )
            resp = client.chat.completions.create(
                model="z-ai/glm-5.1",
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.3,
                max_tokens=400,
                stream=False,
            )
            lines = _parse_lines(resp.choices[0].message.content)
            if len(lines) >= 3:
                result = {
                    "line1": lines[0], "line2": lines[1], "line3": lines[2],
                    "full_text": " ".join(lines[:3]),
                    "source": "nvidia-glm-5.1",
                }
        except Exception as exc:
            print(f"[briefing] NVIDIA GLM failed: {exc}")

    # ── Tier 2: OpenRouter LLaMA 3.3 ─────────────────────────────────────────
    if result is None and OPENROUTER_API_KEY and not OPENROUTER_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=OPENROUTER_API_KEY,
            )
            resp = client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct",
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.3,
                max_tokens=400,
            )
            lines = _parse_lines(resp.choices[0].message.content)
            if len(lines) >= 3:
                result = {
                    "line1": lines[0], "line2": lines[1], "line3": lines[2],
                    "full_text": " ".join(lines[:3]),
                    "source": "openrouter-llama3",
                }
        except Exception as exc:
            print(f"[briefing] OpenRouter failed: {exc}")

    # ── Tier 3: Google Gemini ─────────────────────────────────────────────────
    if result is None and GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                system_instruction=_SYSTEM,
            )
            resp  = model.generate_content(prompt)
            lines = _parse_lines(resp.text)
            if len(lines) >= 3:
                result = {
                    "line1": lines[0], "line2": lines[1], "line3": lines[2],
                    "full_text": " ".join(lines[:3]),
                    "source": "gemini-2.0-flash",
                }
        except Exception as exc:
            print(f"[briefing] Gemini failed: {exc}")

    # ── Tier 4: Rule-based deterministic ─────────────────────────────────────
    if result is None:
        result = _rule_based_brief(
            rep_name, date, district, ordered_outlet_list,
            total_km, total_minutes, top_alert_message, weather_risk,
        )

    return result
