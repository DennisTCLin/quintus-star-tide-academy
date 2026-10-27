"""Publish job IDs and output hashes only; never signed download URLs."""
import json,hashlib
from pathlib import Path
root=Path(__file__).parent;p=Path('docs/monster-wave4-media.json');doc=json.loads(p.read_text())
original={j['index']:j['job_id'] for j in json.loads((root/'video-jobs.json').read_text())['jobs']}
redo={j['index']:j['job_id'] for j in json.loads((root/'redo-video-jobs.json').read_text())['jobs']}
matte=sorted(json.loads((root/'matte-videos.json').read_text()),key=lambda x:x['index'])
trims={j['index']:j for j in json.loads((root/'editorial-trims.json').read_text())}
for item in doc['items']:
 item['videos']=[]
 for r in matte:
  if r['id']!=item['id']:continue
  path=Path('public/assets/monsters/wave4')/f"{r['id']}-{r['action']}.mp4"
  assert hashlib.sha256(path.read_bytes()).hexdigest()==r['sha256']
  v={'index':r['index'],'action':r['action'],'jobId':redo.get(r['index'],original[r['index']]),'model':'seedance_2_5/omni_reference','path':str(path),'sha256':r['sha256'],'bytes':r['bytes'],'format':r['format'],'width':r['width'],'height':r['height'],'fps':r['fps'],'frames':r['frames']}
  if r['index'] in redo:v['supersededJobId']=original[r['index']]
  if r['index'] in trims:v['editorialTrim']={k:v for k,v in trims[r['index']].items() if k not in ['previousMatte','index']}
  item['videos'].append(v)
control=json.loads((root/'production-control.json').read_text());limit=control['originalVideoLimit']
doc['authorizedVideos']=limit;doc['originalVideoScope']=250;doc['deferredVideos']=250-limit;doc['activeAnimatedCreatures']=limit//5
doc['completedVideoFiles']=len(matte);doc['pendingVideoFiles']=limit-len(matte)
doc['status']='blocked-insufficient-higgsfield-credits' if (root/'credit-block.json').exists() else ('production-stopped-at-user-limit-quality-review-pending' if len(matte)==limit else 'animations-in-production')
doc['postprocessing']={'mask':'BiRefNet Lite','source':'ZhengPeng7/BiRefNet_lite','revision':'aa62cd87eafb9cc43056d08ef3615a14628b831d','weightsSha256':'4417d89795250e698c3cb0ae8df15743810065f646f48a694fdfa7ca052d0815','license':'MIT','implementation':'side-by-side RGB and alpha in a single H.264 stream'}
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
print('sanitized provenance',len(matte),'of',limit)

jobs=json.loads((root/'video-jobs.json').read_text());statuses={j['index']:j for j in jobs['results']}
checkpoint={'status':doc['status'],'originalJobsSubmitted':len(jobs['jobs']),'originalJobsCompleted':sum(j['status']=='completed' for j in jobs['results']),'paidRedoCompleted':len(redo),'processedCanonicalVideos':len(matte),'pendingSubmittedJobs':[{'index':j['index'],'jobId':j['job_id'],'status':statuses.get(j['index'],{}).get('status','submitted')} for j in jobs['jobs'] if statuses.get(j['index'],{}).get('status')!='completed'],'originalVideoLimit':limit,'deferredVideos':250-limit,'notSubmitted':[i for i in range(1,limit+1) if i not in original],'releaseReady':False,'verification':{'unitPassed':881,'unitSkipped':179,'databasePassed':182,'browserMotionPassed':len(json.loads((root/'all-motion/results.json').read_text())),'layoutChecks':60,'captureFlows':16,'physicalIPad':False}}
(root/'checkpoint.json').write_text(json.dumps(checkpoint,indent=2)+'\n')
