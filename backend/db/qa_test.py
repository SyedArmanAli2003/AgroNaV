import urllib.request, json

url = 'https://agronav-730909394840.us-central1.run.app/api/debug/seed-status'
resp = urllib.request.urlopen(url, timeout=15)
data = json.loads(resp.read())
print('Seed status:', json.dumps(data, indent=2))

url2 = 'https://agronav-730909394840.us-central1.run.app/recommendations?rep_id=rep_102&date=2026-05-22'
resp2 = urllib.request.urlopen(url2, timeout=45)
data2 = json.loads(resp2.read())
recs = data2.get('recommendations', [])
print(f'Recommendations count: {len(recs)}')
for r in recs[:10]:
    rid = r.get('retailer_id','')
    name = r.get('retailer_name','')
    dist = r.get('district','')
    teh  = r.get('tehsil','')
    prod = r.get('product_recommended','')
    score = r.get('priority_score',0)
    model = r.get('model_used','')
    print(f'  {rid} | {name} | {dist} | {teh} | {prod} | {round(score,3)} | {model}')
