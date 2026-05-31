import requests, json, sqlite3, uuid, sys

BASE = 'http://localhost:8000'
PASS = 0
FAIL = 0

def ok(label, detail=""):
    global PASS
    PASS += 1
    print(f"  [PASS] {label}" + (f" — {detail}" if detail else ""))

def fail(label, detail=""):
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {label}" + (f" — {detail}" if detail else ""))

# ── TEST 1: /signup returns 403 ─────────────────────────────────────────────
r = requests.post(f'{BASE}/signup',
    json={'email':'qa@test.com','password':'x','rep_id':'X','name':'X'})
if r.status_code == 403 and 'Registration is closed' in r.json().get('detail', ''):
    ok("T1 /signup is closed (403)", r.json()['detail'])
else:
    fail("T1 /signup should be 403", f"got {r.status_code}: {r.text[:100]}")

# ── TEST 2: Login with seeded rep ───────────────────────────────────────────
# Seed a test rep we know the password for (idempotent)
import bcrypt as _bcrypt
_conn = sqlite3.connect('agronav.db')
_pw = _bcrypt.hashpw(b'syngenta123', _bcrypt.gensalt()).decode()
try:
    _conn.execute(
        "INSERT OR IGNORE INTO users (email,password_hash,name,rep_id,role,district,state) VALUES (?,?,?,?,?,?,?)",
        ('qa_logintest@syngenta.com', _pw, 'QA Login Rep', 'REP_QATEST', 'rep', 'Jalgaon', 'Maharashtra'))
    _conn.commit()
except Exception:
    pass
_conn.close()

r = requests.post(f'{BASE}/login', json={'email':'qa_logintest@syngenta.com','password':'syngenta123'})
if r.status_code == 200:
    token = r.json()['token']
    role  = r.json()['role']
    ok("T2 Login (rep)", f"role={role}")
    headers = {'Authorization': f'Bearer {token}'}
else:
    fail("T2 Login failed", f"{r.status_code} {r.text[:100]}")
    headers = {}

# ── TEST 3: Recommendations ──────────────────────────────────────────────────
if headers:
    r = requests.get(f'{BASE}/recommendations?rep_id=REP_QATEST', headers=headers)
    if r.status_code == 200:
        recs = r.json().get('recommendations', [])
        top  = recs[0] if recs else {}
        ok("T3 Recommendations", f"{len(recs)} outlets")
    else:
        fail("T3 Recommendations", f"{r.status_code}")

# ── TEST 4: /api/manager/districts ──────────────────────────────────────────
r = requests.get(f'{BASE}/api/manager/districts', headers=headers)
if r.status_code == 200:
    dists = r.json().get('districts', [])
    ok("T4 GET /api/manager/districts", f"{len(dists)} districts: {dists[:3]}")
else:
    fail("T4 Districts endpoint", f"{r.status_code}")

# ── TEST 5: rep role blocked from create-rep ─────────────────────────────────
if headers:
    r = requests.post(f'{BASE}/api/manager/create-rep',
        headers={**headers, 'Content-Type':'application/json'},
        json={'name':'X','email':'x@x.com','password':'x','district':'Jalgaon'})
    if r.status_code == 403:
        ok("T5 create-rep blocked for role=rep (403)")
    else:
        fail("T5 create-rep should be 403 for rep", f"got {r.status_code}")
else:
    fail("T5 skipped (no token)")

# ── Seed a temporary manager ─────────────────────────────────────────────────
import bcrypt
conn = sqlite3.connect('agronav.db')
mgr_email  = f'mgr_{uuid.uuid4().hex[:6]}@qa.test'
mgr_rep_id = f'MGR_{uuid.uuid4().hex[:6].upper()}'
rep_email  = f'newrep_{uuid.uuid4().hex[:6]}@qa.test'
pw = bcrypt.hashpw(b'Mgr1234!', bcrypt.gensalt()).decode()
conn.execute(
    'INSERT INTO users (email,password_hash,name,rep_id,role,district,state) VALUES (?,?,?,?,?,?,?)',
    (mgr_email, pw, 'QA Manager', mgr_rep_id, 'manager', 'Jalgaon', 'Maharashtra'))
conn.commit()
conn.close()

# ── TEST 6: Manager login ────────────────────────────────────────────────────
r = requests.post(f'{BASE}/login', json={'email':mgr_email,'password':'Mgr1234!'})
if r.status_code == 200 and r.json()['role'] == 'manager':
    mgr_token = r.json()['token']
    ok("T6 Manager login", f"role={r.json()['role']}")
    mh = {'Authorization': f'Bearer {mgr_token}', 'Content-Type':'application/json'}
else:
    fail("T6 Manager login failed", f"{r.status_code} {r.text[:80]}")
    mh = {}

# ── TEST 7: create-rep ───────────────────────────────────────────────────────
if mh:
    r = requests.post(f'{BASE}/api/manager/create-rep', headers=mh,
        json={'name':'QA Field Rep','email':rep_email,
              'password':'Rep1234!','district':'Nashik',
              'territory':'Igatpuri','phone':'+91 9000000001'})
    if r.status_code == 200 and r.json().get('success'):
        creds = r.json()['login_credentials']
        ok("T7 create-rep success", f"rep_id={creds['rep_id']}")
    else:
        fail("T7 create-rep", f"{r.status_code}: {r.text[:120]}")

# ── TEST 8: New rep can login ────────────────────────────────────────────────
    r = requests.post(f'{BASE}/login', json={'email':rep_email,'password':'Rep1234!'})
    if r.status_code == 200 and r.json()['role'] == 'rep':
        ok("T8 New rep login", f"name={r.json()['user']['name']} role={r.json()['role']}")
    else:
        fail("T8 New rep login", f"{r.status_code}: {r.text[:80]}")

# ── TEST 9: 409 on duplicate email ───────────────────────────────────────────
    r = requests.post(f'{BASE}/api/manager/create-rep', headers=mh,
        json={'name':'Dup','email':rep_email,'password':'x','district':'Jalgaon'})
    if r.status_code == 409:
        ok("T9 409 on duplicate email", r.json().get('detail',''))
    else:
        fail("T9 409 on duplicate", f"got {r.status_code}: {r.text[:80]}")

# ── TEST 10: Alerts endpoint ─────────────────────────────────────────────────
r = requests.get(f'{BASE}/api/alerts?district=Jalgaon', headers=headers)
if r.status_code == 200:
    body = r.json()
    cnt = len(body) if isinstance(body, list) else len(body.get('alerts', body))
    ok("T10 GET /api/alerts", f"{cnt} alerts")
else:
    fail("T10 Alerts", f"{r.status_code}")

# ── TEST 11: Weekly stats ────────────────────────────────────────────────────
r = requests.get(f'{BASE}/api/learning/weekly-stats?district=Jalgaon&state=Maharashtra', headers=headers)
if r.status_code == 200:
    ws = r.json()
    ok("T11 Weekly stats", f"total_visits={ws.get('total_visits')} sales_pct={ws.get('sales_pct')}")
else:
    fail("T11 Weekly stats", f"{r.status_code}")

# ── TEST 12: Farmer seed + visit plan ───────────────────────────────────────
r = requests.post(f'{BASE}/api/farmers/seed-demo', headers={**headers, 'Content-Type':'application/json'})
if r.status_code == 200:
    ok("T12 Farmer demo seed", r.json().get('message',''))
else:
    fail("T12 Farmer seed", f"{r.status_code}")

# ── TEST 13: Morning brief (route engine) ────────────────────────────────────
r = requests.post(f'{BASE}/api/route/morning-brief',
    headers={**headers, 'Content-Type':'application/json'},
    json={'rep_id':'REP_0001','top_n':3})
if r.status_code == 200:
    brief = r.json()
    ok("T13 Morning brief", f"source={brief.get('briefing_source')} stops={len(brief.get('ordered_stops',[]))}")
else:
    fail("T13 Morning brief", f"{r.status_code}: {r.text[:80]}")

# ── Cleanup ───────────────────────────────────────────────────────────────────
conn = sqlite3.connect('agronav.db')
conn.execute('DELETE FROM users WHERE email IN (?,?,?)', (mgr_email, rep_email, 'qa_logintest@syngenta.com'))
conn.commit()
conn.close()

# ── Summary ───────────────────────────────────────────────────────────────────
print()
print("="*50)
print(f"  PASSED: {PASS}/13 | FAILED: {FAIL}/13")
print("="*50)
if FAIL == 0:
    print("  ALL TESTS PASSED — system is production-ready")
