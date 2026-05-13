# What it does: Generates Next Best Action recommendations using Gemini AI
# Input: Outlet dict with attributes
# Output: NBACard dict with product, pitch, tip, promotion, why
# Called by: routers/nba.py

import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import GEMINI_API_KEY

# Hardcoded fallback NBA when Gemini is unavailable
FALLBACK = {
    "product": "Ampligo 150 ZC",
    "pitch": "Bollworm pressure is high right now. Ampligo gives 21-day residual control — your farmers need this before the window closes.",
    "tip": "Cotton at boll formation is most vulnerable. Spray within 72 hours of first sighting.",
    "promotion": "Buy 20+ units — 5% extra dealer margin this week.",
    "why": "Active pest alert + stock running low + boll formation stage = act today."
}


async def get_nba(outlet, db=None):
    """Get Next Best Action for an outlet — cache → Gemini → fallback.

    # What it does: Returns an NBA recommendation, trying cache first, then Gemini AI, then fallback
    # Input: outlet dict with name, type, district, stock_days_remaining, has_pest_alert, crop_stage
    # Output: dict with product, pitch, tip, promotion, why
    # Called by: routers/nba.py
    """
    outlet_id = outlet.get("id", 0)
    today = datetime.now().strftime("%Y-%m-%d")

    # Step 1: Check nba_cache
    if db is not None:
        try:
            async with db.execute(
                "SELECT product, pitch, tip, promotion, why FROM nba_cache WHERE outlet_id = ? AND date = ?",
                (outlet_id, today)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "product": row["product"],
                        "pitch": row["pitch"],
                        "tip": row["tip"],
                        "promotion": row["promotion"],
                        "why": row["why"]
                    }
        except Exception as e:
            print(f"[gemini] Cache check failed: {e}")

    # Step 2: If no API key → return fallback silently
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("get_from"):
        return FALLBACK.copy()

    # Step 3: Build prompt and call Gemini
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)

        prompt = f"""You are a Syngenta field sales advisor in rural India.

Outlet: {outlet.get('name', 'Unknown')} ({outlet.get('type', 'retailer')})
District: {outlet.get('district', 'Unknown')}
Stock remaining: {outlet.get('stock_days_remaining', 'Unknown')} days
Pest alert: {'Yes' if outlet.get('has_pest_alert') else 'No'}
Crop stage: {outlet.get('crop_stage', 'not specified')}
Crop: Cotton, Kharif season, Nalgonda district

Return ONLY a JSON object, no explanation, no markdown fences:
{{
  "product": "specific Syngenta product name",
  "pitch": "2 sentences. use the outlet name. reference pest or crop stage.",
  "tip": "1 sentence agronomic advice to share.",
  "promotion": "1 sentence current offer.",
  "why": "1 sentence specific reason this matters today."
}}"""

        # Step 4: Call Gemini 1.5 Flash
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        result = json.loads(text)

        # Validate all required keys
        for key in ["product", "pitch", "tip", "promotion", "why"]:
            if key not in result:
                print(f"[gemini] Missing key '{key}' in response, using fallback")
                return FALLBACK.copy()

        # Step 5: Save to nba_cache
        if db is not None:
            try:
                await db.execute(
                    "INSERT INTO nba_cache (outlet_id, date, product, pitch, tip, promotion, why) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (outlet_id, today, result["product"], result["pitch"], result["tip"], result["promotion"], result["why"])
                )
                await db.commit()
            except Exception as e:
                print(f"[gemini] Cache save failed: {e}")

        # Step 6: Return parsed dict
        return result

    except Exception as e:
        print(f"[gemini] Gemini API call failed: {e}")
        return FALLBACK.copy()
