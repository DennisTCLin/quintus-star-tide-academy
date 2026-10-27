import json,re,hashlib,urllib.request,urllib.error
from pathlib import Path
BASE="https://quintus-star-tide-academy-production.up.railway.app"
def get(path):
    try:
        with urllib.request.urlopen(BASE+path,timeout=30) as r:return r.status,dict(r.headers),r.read()
    except urllib.error.HTTPError as e:return e.code,dict(e.headers),e.read()
status,headers,body=get("/healthz")
assert status==200,(status,body)
result={"health":json.loads(body),"healthStatus":status}
status,headers,body=get("/")
assert status==200
live=re.findall(r'(?:src|href)="(/assets/[^"]+)"',body.decode())
local=re.findall(r'(?:src|href)="(/assets/[^"]+)"',Path("dist/index.html").read_text())
assert live==local,{"live":live,"local":local}
assets=[]
for asset in live:
    status,_,body=get(asset)
    expected=Path("dist"+asset).read_bytes()
    assert status==200 and body==expected,asset
    assets.append({"path":asset,"sha256":hashlib.sha256(body).hexdigest()})
result["assets"]=assets
status,_,body=get("/api/collections?player=quintus")
assert status==401,(status,body)
result["anonymousCollectionsStatus"]=status
result["scope"]="Read-only unauthenticated production health and exact deployed asset verification; authenticated behavior verified on isolated real PostgreSQL."
Path("output/playwright/collections-release/production-verification.json").write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
