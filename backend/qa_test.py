import requests, json, sys

BASE = 'http://localhost:8000'
results = []

def chk(label, r, key=None):
    s = r.status_code
    status = "PASS" if s < 300 else "FAIL"
    results.append((status, label, s))
    print(f"[{status}] [{s}] {label}")
    if s >= 300:
        print(f"       BODY: {r.text[:200]}")
        return None
    d = r.json()
    if key and key not in str(d):
        print(f"       MISSING: {key}")
    return d

# ── HEALTH ────────────────────────────────────────────────
print("\n=== HEALTH ===")
r = requests.get(f"{BASE}/health")
d = chk("GET /health", r)
if d: print(f"       {d}")

# ── AUTH ──────────────────────────────────────────────────
print("\n=== AUTH ===")
r = requests.post(f"{BASE}/login", json={"email": "rep1@agronav.ai", "password": "rep123"})
if r.status_code != 200:
    r = requests.post(f"{BASE}/login", json={"email": "REP_0001", "password": "rep123"})
chk("POST /login (rep)", r)
tok = r.json().get("access_token", "") if r.status_code == 200 else ""
print(f"       token: {'OK ('+tok[:20]+'...)' if tok else 'MISSING'}")
hdrs = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

# Try manager login
r_mgr = requests.post(f"{BASE}/login", json={"email": "manager@agronav.ai", "password": "manager123"})
chk("POST /login (manager)", r_mgr)
mgr_tok = r_mgr.json().get("access_token", "") if r_mgr.status_code == 200 else ""
mgr_hdrs = {"Authorization": f"Bearer {mgr_tok}", "Content-Type": "application/json"}

# ── RECOMMENDATIONS ────────────────────────────────────────
print("\n=== RECOMMENDATIONS ===")
r = requests.get(f"{BASE}/recommendations?rep_id=REP_0001&date=2026-03-29", headers=hdrs)
d = chk("GET /recommendations", r)
if d:
    items = d if isinstance(d, list) else d.get("recommendations", d.get("items", [d]))
    print(f"       count={len(items)}")
    if items:
        first = items[0] if isinstance(items[0], dict) else {}
        has_weather = any(k in str(first) for k in ["weather", "rainfall", "temp_c"])
        has_nba = any(k in str(first) for k in ["nba", "talking_point", "product"])
        print(f"       has_weather_fields={has_weather}  has_nba_fields={has_nba}")
        print(f"       sample keys: {list(first.keys())[:10]}")

# ── NBA ────────────────────────────────────────────────────
print("\n=== NBA ===")
r = requests.get(f"{BASE}/api/nba/REP_0001", headers=hdrs)
if r.status_code == 404:
    # Try post body
    r = requests.post(f"{BASE}/api/nba", json={"rep_id": "REP_0001"}, headers=hdrs)
chk("GET /api/nba/REP_0001", r)

# ── ALERTS ────────────────────────────────────────────────
print("\n=== ALERTS ===")
r = requests.get(f"{BASE}/api/alerts?district=Jalgaon", headers=hdrs)
d = chk("GET /api/alerts?district=Jalgaon", r)
if d:
    alerts = d if isinstance(d, list) else d.get("alerts", [])
    print(f"       count={len(alerts)}")
    if alerts:
        print(f"       sample: type={alerts[0].get('type','?')} sev={alerts[0].get('severity','?')}")

# ── ANOMALY DETECT ─────────────────────────────────────────
print("\n=== ANOMALY DETECT ===")
r = requests.post(f"{BASE}/api/alerts/detect", json={"district": "Jalgaon", "category": "insecticide"}, headers=hdrs)
d = chk("POST /api/alerts/detect", r)
if d:
    print(f"       anomaly={d.get('is_anomaly')} type={d.get('anomaly_type','?')}")

# ── OUTLETS ──────────────────────────────────────────────
print("\n=== OUTLETS ===")
r = requests.get(f"{BASE}/api/outlets?rep_id=REP_0001&limit=5", headers=hdrs)
d = chk("GET /api/outlets", r)
if d:
    items = d if isinstance(d, list) else d.get("outlets", d.get("items", []))
    print(f"       count={len(items)}")

# ── RECALIBRATE ───────────────────────────────────────────
print("\n=== RECALIBRATE ===")
r = requests.post(f"{BASE}/api/recalibrate?rep_id=REP_0001", headers=hdrs)
d = chk("POST /api/recalibrate", r)
if d:
    print(f"       updated={d.get('updated_count', d.get('count','?'))}")

# ── RECAL EXPLAIN ─────────────────────────────────────────
print("\n=== RECAL EXPLAIN ===")
r = requests.post(f"{BASE}/api/recalibrate/explain?rep_id=REP_0001&days=30", headers=hdrs)
d = chk("POST /api/recalibrate/explain", r)
if d:
    print(f"       line1: {str(d.get('line1','?'))[:80]}")

# ── ROUTE OPTIMIZE ────────────────────────────────────────
print("\n=== ROUTE OPTIMIZE ===")
r = requests.post(f"{BASE}/api/route/optimize",
    json={"rep_id": "REP_0001", "top_n": 5}, headers=hdrs)
d = chk("POST /api/route/optimize", r)
if d:
    print(f"       source={d.get('source','?')} stops={len(d.get('stops',d.get('ordered_outlets',[])))} total_km={d.get('total_km','?')}")

# ── MORNING BRIEF ─────────────────────────────────────────
print("\n=== MORNING BRIEF ===")
r = requests.post(f"{BASE}/api/route/morning-brief",
    json={"rep_id": "REP_0001", "top_n": 4}, headers=hdrs)
d = chk("POST /api/route/morning-brief", r)
if d:
    print(f"       source={d.get('source','?')}")
    print(f"       line1: {str(d.get('line1','?'))[:80]}")

# ── COMPETITOR ANALYZE ────────────────────────────────────
print("\n=== COMPETITOR ===")
r = requests.post(f"{BASE}/api/competitor/analyze", json={
    "retailer_id": "R_0001", "rep_text_input": "Saw a Bayer rep giving discounts near Sharma Agro",
    "district": "Jalgaon", "tehsil": "Jalgaon", "outlet_lat": 21.00, "outlet_lng": 75.56
}, headers=hdrs)
d = chk("POST /api/competitor/analyze", r)
if d:
    print(f"       threat_type={d.get('threat_type','?')} opp={d.get('opportunity_flag','?')}")
    print(f"       action: {str(d.get('immediate_action','?'))[:80]}")

# ── WEEKLY STATS ──────────────────────────────────────────
print("\n=== WEEKLY STATS ===")
r = requests.get(f"{BASE}/api/learning/weekly-stats?district=Jalgaon&state=Maharashtra", headers=hdrs)
d = chk("GET /api/learning/weekly-stats", r)
if d:
    print(f"       total_visits={d.get('total_visits','?')} sales_pct={d.get('sales_pct','?')}")

# ── FARMER VISIT ──────────────────────────────────────────
print("\n=== FARMER VISIT PLAN ===")
r = requests.post(f"{BASE}/api/farmers/seed-demo", headers=hdrs)
chk("POST /api/farmers/seed-demo", r)
r = requests.post(f"{BASE}/api/farmers/visit-plan", json={
    "grower_id": "G_T001", "farmer_name": "Ramesh Patil",
    "village": "Savkheda", "tehsil": "Jalgaon", "district": "Jalgaon",
    "farm_acres": 3.5, "crop_type": "cotton", "growth_stage": "flowering",
    "last_product": "Tilt 250 EC", "last_purchase_date": "2026-03-10"
}, headers=hdrs)
d = chk("POST /api/farmers/visit-plan", r)
if d:
    print(f"       visit_type={d.get('visit_type','?')} product={d.get('recommended_product','?')}")
    print(f"       distance_km={d.get('distance_km','?')} detour={d.get('detour_minutes','?')}min")

# ── WEATHER ───────────────────────────────────────────────
print("\n=== WEATHER SIGNAL ===")
r = requests.get(f"{BASE}/api/alerts?district=Jalgaon", headers=hdrs)
d = chk("GET /api/alerts (weather check)", r)
if d:
    alerts = d if isinstance(d, list) else []
    weather_alerts = [a for a in alerts if "weather" in str(a).lower() or "rain" in str(a).lower()]
    print(f"       weather-related alerts: {len(weather_alerts)}")

# ── SUMMARY ──────────────────────────────────────────────
print("\n" + "="*55)
print("QA SUMMARY")
print("="*55)
passed = sum(1 for r,_,_ in results if r == "PASS")
failed = sum(1 for r,_,_ in results if r == "FAIL")
print(f"PASSED: {passed}/{passed+failed}")
for status, label, code in results:
    mark = "[OK]" if status == "PASS" else "[!!]"
    print(f"  {mark} {label} → {code}")
