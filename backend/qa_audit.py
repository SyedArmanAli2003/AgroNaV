"""One-shot QA audit runner for the bug-fix branch. Prints [TEST N] PASS/FAIL."""
import sqlite3
import asyncio
import httpx

BASE = "http://localhost:8000"
DB = "agronav.db"
results = {}


def db_conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


# ── TEST 1: server import / startup ───────────────────────────────────────────
# (Already confirmed via "Application startup complete" — re-verify reachability)
try:
    r = httpx.get(f"{BASE}/api/outcomes?rep_id=__ping__", timeout=10)
    results[1] = ("PASS", "server reachable, no import errors at startup")
except Exception as e:
    results[1] = ("FAIL", f"server not reachable: {e}")


# ── TEST 2: POST /visit_log ───────────────────────────────────────────────────
try:
    body = {
        "rep_id": "REP_0001", "retailer_id": "RET_001",
        "outcome": "Order placed", "visit_type": "retailer_meeting",
        "product_discussed": "Actara 25 WG",
        "competitor_observation": "saw Bayer promo near outlet",
    }
    r = httpx.post(f"{BASE}/visit_log", json=body, timeout=20)
    j = r.json()
    ok_resp = j.get("success") is True and j.get("outcome_score") == 80
    # DB check
    c = db_conn()
    row = c.execute("SELECT * FROM visit_logs ORDER BY id DESC LIMIT 1").fetchone()
    c.close()
    ok_db = row and row["outcome"] == "sale" and row["product_discussed"] == "Actara 25 WG"
    if ok_resp and ok_db:
        results[2] = ("PASS", f"success=True score=80; stored outcome='sale' product='Actara 25 WG'")
    else:
        results[2] = ("FAIL", f"resp={j} | db_outcome={row['outcome'] if row else None} db_product={row['product_discussed'] if row else None}")
except Exception as e:
    results[2] = ("FAIL", f"exception: {e}")


# ── TEST 3: GET /api/outcomes ─────────────────────────────────────────────────
try:
    r = httpx.get(f"{BASE}/api/outcomes?rep_id=REP_0001", timeout=15)
    j = r.json()
    logs = j.get("logs", [])
    if not logs:
        results[3] = ("FAIL", "no logs returned for REP_0001")
    else:
        top = logs[0]
        name_ok = bool(top.get("outlet_name"))
        prod_ok = top.get("product_discussed") is not None and top.get("product_discussed") != ""
        if name_ok and prod_ok:
            results[3] = ("PASS", f"outlet_name='{top['outlet_name']}' product_discussed='{top['product_discussed']}'")
        else:
            results[3] = ("FAIL", f"outlet_name={top.get('outlet_name')!r} product_discussed={top.get('product_discussed')!r}")
except Exception as e:
    results[3] = ("FAIL", f"exception: {e}")


# ── TEST 4: POST /api/competitor/analyze ──────────────────────────────────────
try:
    body = {
        "retailer_id": "RET_001", "outlet_name": "Test Agro Store",
        "district": "Jalgaon", "tehsil": "Jalgaon",
        "rep_text_input": "competitor selling cheaper",
    }
    r = httpx.post(f"{BASE}/api/competitor/analyze", json=body, timeout=30)
    j = r.json()
    txt = str(j).lower()
    if "no such table" in txt or "table competitor_intel" in txt:
        results[4] = ("FAIL", f"table error: {j}")
    elif "threat_type" in j:
        results[4] = ("PASS", f"threat_type={j.get('threat_type')} source={j.get('source')} (no table error)")
    else:
        results[4] = ("FAIL", f"unexpected response: {j}")
except Exception as e:
    results[4] = ("FAIL", f"exception: {e}")


# ── TEST 5: POST /api/route/morning-brief ─────────────────────────────────────
try:
    r = httpx.post(f"{BASE}/api/route/morning-brief", json={"rep_id": "REP_0001", "top_n": 6}, timeout=120)
    j = r.json()
    has_brief = "briefing" in j and bool(j["briefing"])
    has_route = "route" in j and j["route"] is not None
    if has_brief and has_route:
        n = len(j["route"].get("ordered_outlet_list", []) or [])
        results[5] = ("PASS", f"briefing present, route has {n} outlets")
    else:
        results[5] = ("FAIL", f"keys={list(j.keys())}")
except Exception as e:
    results[5] = ("FAIL", f"exception: {e}")


# ── TEST 6: POST /api/farmers/visit-plan ──────────────────────────────────────
try:
    body = {"grower_id": "G_001", "farmer_name": "Ramesh Patil", "village": "Savkheda",
            "tehsil": "Jalgaon", "district": "jalgaon", "crop_type": "cotton",
            "growth_stage": "flowering"}
    r = httpx.post(f"{BASE}/api/farmers/visit-plan", json=body, timeout=120)
    j = r.json()
    if isinstance(j, dict) and j.get("visit_type"):
        results[6] = ("PASS", f"visit_type='{j.get('visit_type')}' product='{j.get('recommended_product','')}' (no crash)")
    else:
        results[6] = ("FAIL", f"unexpected: {str(j)[:200]}")
except Exception as e:
    results[6] = ("FAIL", f"exception: {e}")


# ── TEST 7: weather cache (call twice, second = cache) ────────────────────────
try:
    # Clear today's cache row for a clean first call
    c = db_conn()
    c.execute("DELETE FROM weather_cache WHERE district='jalgaon' AND date=date('now')")
    c.commit()
    c.close()

    from services.weather_service import get_weather_context

    async def _run():
        first = await get_weather_context("jalgaon")
        second = await get_weather_context("jalgaon")
        return first, second

    first, second = asyncio.run(_run())
    if second["source"] == "cache":
        results[7] = ("PASS", f"1st source='{first['source']}', 2nd source='cache'")
    else:
        results[7] = ("FAIL", f"1st='{first['source']}' 2nd='{second['source']}' (expected cache). "
                              f"If 1st was 'fallback', Open-Meteo was unreachable so nothing was cached.")
except Exception as e:
    results[7] = ("FAIL", f"exception: {e}")


# ── TEST 8: recalibrate then recommendations ──────────────────────────────────
try:
    # Baseline recommendation scores
    def rec_scores():
        try:
            rr = httpx.get(f"{BASE}/recommendations?rep_id=REP_0001", timeout=90)
            data = rr.json()
            recs = data.get("recommendations", []) if isinstance(data, dict) else []
            return {x.get("id") or x.get("outlet_id") or x.get("retailer_id"): x.get("score") for x in recs}
        except Exception:
            return {}

    before = rec_scores()
    r = httpx.post(f"{BASE}/api/recalibrate?rep_id=REP_0001", timeout=90)
    j = r.json()
    updated = j.get("updated_outlets", []) if isinstance(j, dict) else []
    after = rec_scores()

    changed = 0
    for k, v in after.items():
        if k in before and before[k] != v:
            changed += 1

    success = j.get("success") is True
    if success and len(updated) >= 2:
        detail = f"recalibrate success, {len(updated)} outlets ranked"
        if before and after:
            detail += f", {changed} recommendation scores changed (before={len(before)} after={len(after)})"
        else:
            detail += f", recommendations returned {len(after)} scored outlets"
        results[8] = ("PASS", detail)
    else:
        results[8] = ("FAIL", f"success={success} updated_outlets={len(updated)}")
except Exception as e:
    results[8] = ("FAIL", f"exception: {e}")


# ── Report ────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("QA AUDIT RESULTS")
print("=" * 60)
for n in range(1, 9):
    status, detail = results.get(n, ("FAIL", "not run"))
    print(f"[TEST {n}] {status}: {detail}")
print("=" * 60)
passed = sum(1 for n in results if results[n][0] == "PASS")
print(f"{passed}/8 PASSED")
