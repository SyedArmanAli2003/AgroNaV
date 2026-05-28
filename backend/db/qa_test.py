import urllib.request, json

# Test with the real Jalgaon rep (REP_0203)
url = 'https://agronav-730909394840.us-central1.run.app/recommendations?rep_id=REP_0203&date=2026-05-22'
resp = urllib.request.urlopen(url, timeout=60)
data = json.loads(resp.read())
recs = data.get('recommendations', [])
print(f'REP_0203 (Jalgaon) recommendations: {len(recs)}')
for r in recs[:10]:
    rid   = r.get('retailer_id','')
    name  = r.get('retailer_name','')
    dist  = r.get('district','')
    teh   = r.get('tehsil','')
    prod  = r.get('product_recommended','')
    score = r.get('priority_score',0)
    model = r.get('model_used','')
    print(f'  {rid} | {name} | dist={dist} | teh={teh} | {prod} | {round(score,3)} | {model}')

print()
# Also check rep_102 (the ehtesham user)
url2 = 'https://agronav-730909394840.us-central1.run.app/recommendations?rep_id=rep_102&date=2026-05-22'
resp2 = urllib.request.urlopen(url2, timeout=60)
data2 = json.loads(resp2.read())
recs2 = data2.get('recommendations', [])
print(f'rep_102 recommendations: {len(recs2)}')
for r in recs2[:5]:
    rid   = r.get('retailer_id','')
    name  = r.get('retailer_name','')
    dist  = r.get('district','')
    teh   = r.get('tehsil','')
    prod  = r.get('product_recommended','')
    score = r.get('priority_score',0)
    print(f'  {rid} | {name} | dist={dist} | teh={teh} | {prod} | {round(score,3)}')
