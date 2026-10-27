import json,urllib.request,concurrent.futures,time,sys
from pathlib import Path
root=Path(__file__).parent
(root/'source').mkdir(exist_ok=True)
def fetch(job):
 url,p=job
 if not p.exists():
  temp=p.with_suffix(p.suffix+'.part');urllib.request.urlretrieve(url,temp);temp.replace(p)
 return p.name
while True:
 jobs=[]
 kinds=[('redo-video','mp4')] if '--redo' in sys.argv else [('image','png'),('video','mp4')]
 for kind,ext in kinds:
  for j in json.loads((root/f'{kind}-jobs.json').read_text()).get('results',[]):
   if j['status']=='completed' and j.get('result_url'):jobs.append((j['result_url'],root/'source'/f"{kind}-{j['index']:03}.{ext}"))
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(fetch,j):j[1].name for j in jobs if not j[1].exists()}
  for task in concurrent.futures.as_completed(futures):
   try:print(task.result(),flush=True)
   except Exception as e:print('download retry required',futures[task],type(e).__name__,flush=True)
 if '--watch' not in sys.argv or len(jobs)==(7 if '--redo' in sys.argv else 50+json.loads((root/'production-control.json').read_text())['originalVideoLimit']) and all(j[1].exists() for j in jobs):break
 time.sleep(30)
