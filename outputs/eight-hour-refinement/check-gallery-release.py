"""Read-only verification of the last static gallery release; no account requests."""
from pathlib import Path
import concurrent.futures, datetime, hashlib, json, re, subprocess, sys
root=Path(__file__).resolve().parents[2]
base='https://quintus-star-tide-academy-production.up.railway.app/'
entry=re.search(r'src="(/assets/[^\"]+\.js)"',(root/'dist/index.html').read_text()).group(1).lstrip('/')
files=[str(p.relative_to(root/'dist')) for p in (root/'dist/assets').glob('*') if p.suffix in ('.js','.css')]
files+=['creature-design-review/'+n for n in ['index.html','gallery.js','style.css']]
def check(path):
    body=subprocess.check_output(['curl','--fail','--silent','--show-error','--max-time','30',base+path])
    out={'path':path,'httpSuccess':True,'bytes':len(body)}
    if path in files:
        out['sha256']=hashlib.sha256(body).hexdigest()
        out['match']=out['sha256']==hashlib.sha256((root/'dist'/path).read_bytes()).hexdigest()
    elif path=='': out['expectedEntry']=entry in body.decode()
    else: out['ok']=json.loads(body)['ok'] is True
    return out
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: checks=list(pool.map(check,['','healthz']+files))
assert all(c.get('match',True) and c.get('expectedEntry',True) and c.get('ok',True) for c in checks)
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':subprocess.check_output(['git','rev-parse','741bd65'],cwd=root,text=True).strip(),'deployment':sys.argv[1],'entry':entry,'checks':checks,'scope':'8 compiled assets plus 3 changed gallery files. Unchanged 100 artwork and manifest verified in Batch20, not redownloaded.'}
(root/'outputs/eight-hour-refinement/gallery-failure-production-check.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'httpChecks':len(checks),'hashMatches':len(files),'entry':entry}))
