"""Recheck the published changed files and image samples without student writes."""
import hashlib,json,urllib.request,urllib.error,time
from pathlib import Path
folder=Path(__file__).resolve().parent
report=json.loads((folder/'production-assets.json').read_text())
base='https://quintus-star-tide-academy-production.up.railway.app/'
for row in report['verifiedFiles']:
 for attempt in range(3):
  try:
   request=urllib.request.Request(base+row['path']+'?verify=jay407',headers={'Cache-Control':'no-cache'})
   data=urllib.request.urlopen(request,timeout=25).read()
   assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'],row['path']
   print('PASS',row['path']);break
  except Exception:
   if attempt==2:raise
   time.sleep(.3)
assert json.loads(urllib.request.urlopen(base+'healthz',timeout=20).read())['ok']
try:urllib.request.urlopen(base+'api/state',timeout=20);raise AssertionError('Expected authentication guard')
except urllib.error.HTTPError as e:assert e.code==401
print('PASS release files, health and unauthenticated-state401; no student writes')
