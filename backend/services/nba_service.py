# What it does: Next Best Action generation via 3-tier fallback
#   Tier 1: Google Gemini (gemini-1.5-flash)
#   Tier 2: OpenRouter (meta-llama/llama-3.3-70b-instruct)
#   Tier 3: Rule-based deterministic fallback (works offline)
# Input: Outlet context dict, async DB connection
# Output: NBA dict with product_to_pitch, agronomic_advice, etc.
# Called by: routers/recommendations.py

import os
import json
from datetime import date

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

NBA_SYSTEM_PROMPT = """You are an expert agronomist and sales coach for Syngenta India.
Given structured context about a field visit, output a JSON object with EXACTLY these keys:
- product_to_pitch: string (specific Syngenta product name)
- agronomic_advice: string (1-2 sentences, actionable)
- promotional_mechanic: string or null
- talking_points: array of exactly 3 strings
- one_line_summary: string (what the rep should say first, under 20 words)
Respond ONLY with valid JSON. No markdown, no explanation, no backticks."""


async def get_nba(outlet_context: dict, db) -> dict:
    """
    Returns Next Best Action for an outlet.
    Checks SQLite cache first (by retailer_id + today's date).
    Falls back through Gemini → OpenRouter → rule-based.
    """
    today = date.today().isoformat()
    retailer_id = outlet_context.get("retailer_id", "unknown")

    # 1. Check cache (nba_responses table)
    try:
        async with db.execute(
            "SELECT response_json FROM nba_responses WHERE retailer_id=? AND date=?",
            (retailer_id, today)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return json.loads(row["response_json"])
    except Exception as e:
        print(f"[NBA] Cache check failed: {e}")

    # 2. Build prompt
    user_prompt = f"Outlet context: {json.dumps(outlet_context, indent=2, default=str)}"
    result = None

    # 3. Try Gemini first
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=NBA_SYSTEM_PROMPT
            )
            response = model.generate_content(user_prompt)
            text = response.text.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            result = json.loads(text)
            # Validate required keys
            required = ["product_to_pitch", "agronomic_advice", "talking_points", "one_line_summary"]
            if not all(k in result for k in required):
                print("[NBA] Gemini response missing keys, trying next tier")
                result = None
        except Exception as e:
            print(f"[NBA] Gemini failed: {e}. Trying OpenRouter...")

    # 4. Try OpenRouter (LLaMA) if Gemini failed
    if result is None and OPENROUTER_API_KEY and not OPENROUTER_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=OPENROUTER_API_KEY,
            )
            response = client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct",
                messages=[
                    {"role": "system", "content": NBA_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            text = response.choices[0].message.content.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            result = json.loads(text)
        except Exception as e:
            print(f"[NBA] OpenRouter failed: {e}. Using rule-based fallback.")

    # 5. Rule-based fallback (always works, no API needed)
    if result is None:
        result = _rule_based_nba(outlet_context)

    # 6. Cache result in nba_responses
    try:
        await db.execute(
            "INSERT OR REPLACE INTO nba_responses (retailer_id, date, response_json) VALUES (?,?,?)",
            (retailer_id, today, json.dumps(result))
        )
        await db.commit()
    except Exception as e:
        print(f"[NBA] Cache save failed: {e}")

    return result


def _rule_based_nba(ctx: dict) -> dict:
    """Deterministic fallback — works fully offline, no API needed."""
    product = ctx.get("recommended_product", ctx.get("product_recommended", "Ampligo 150 ZC"))
    pest = ctx.get("active_pest_alerts", "")
    crop_stage = ctx.get("crop_growth_stage", "vegetative")
    days = ctx.get("days_since_last_visit", 0)

    if pest:
        advice = f"Pest pressure detected — recommend {product} as preventive treatment now."
        points = [
            f"Discuss active {pest} outbreak in the district",
            f"Explain how {product} protects at this crop stage",
            "Offer reorder timing to ensure stock before peak demand"
        ]
        promo = "Bundle 3 units for a 5% discount this week"
        summary = f"Visit to address pest alert and pitch {product} before outbreak peaks."
    elif days and int(days) > 14:
        advice = f"No visit in {days} days — reconnect and pitch {product} for the season."
        points = [
            f"Check how {product} performed since last purchase",
            "Review current stock and suggest optimal reorder quantity",
            "Share seasonal demand forecast and new product launches"
        ]
        promo = "Early order discount available for this month"
        summary = f"Reconnect visit — pitch {product} and check stock levels."
    else:
        advice = f"Crop at {crop_stage} stage — this is the right window for {product}."
        points = [
            f"Check current inventory levels of {product}",
            "Review last purchase and suggest optimal restock quantity",
            "Share upcoming season forecast and demand outlook"
        ]
        promo = None
        summary = f"Routine restocking visit — pitch {product} for the current season."

    return {
        "product_to_pitch": product,
        "agronomic_advice": advice,
        "promotional_mechanic": promo,
        "talking_points": points,
        "one_line_summary": summary
    }
