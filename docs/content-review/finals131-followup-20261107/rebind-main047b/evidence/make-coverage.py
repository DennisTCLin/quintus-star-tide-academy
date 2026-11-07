import json,pathlib,collections,hashlib
root=pathlib.Path.cwd();out=root/'output/pr22-main047b'
ordinary=json.loads((out/'general.json').read_text()); cloud=json.loads((out/'cloud-per-file/results.json').read_text())
assert ordinary['success'] and ordinary['numFailedTests']==0
assert cloud['allPassed'] and cloud['completedFiles']==cloud['expectedFiles']==36
# Include the occurrence ordinal so duplicate table-generated names cannot collapse.
def index(items):
 counts=collections.Counter();result={}
 for x in items:
  key=(x['file'],x['fullName']);counts[key]+=1
  result[(*key,counts[key])]=x['status']
 return result
normal=index([{'file':str(pathlib.Path(s['name']).relative_to(root)),'fullName':t['fullName'],'status':t['status']} for s in ordinary['testResults'] for t in s['assertionResults']])
pg=index([t for s in cloud['results'] for t in s['assertions']])
rows=[]
for key,status in normal.items():
 if status=='passed':continue
 assert status=='skipped',(key,status)
 assert pg.get(key)=='passed',(key,pg.get(key))
 rows.append({'file':key[0],'fullName':key[1],'occurrence':key[2],'ordinaryStatus':status,'pgStatus':pg[key]})
extra=[]
for key,status in pg.items():
 assert status=='passed',(key,status)
 if key not in {(r['file'],r['fullName'],r['occurrence']) for r in rows}:
  assert normal.get(key)=='passed',(key,normal.get(key))
  extra.append({'file':key[0],'fullName':key[1],'occurrence':key[2],'ordinaryStatus':normal[key],'pgStatus':status})
report={'integratedBase':'047bda19d2d74e4d550c0ede4eeb436e7846f953','identity':'repo-relative file + exact fullName + occurrence ordinal','ordinaryPassed':ordinary['numPassedTests'],'ordinarySkipped':ordinary['numPendingTests'],'pgPassed':cloud['passedTests'],'matchedSkippedToPgPassed':len(rows),'uncoveredSkipped':[],'overlappingAlreadyPassed':len(extra),'uniqueTestsCovered':ordinary['numPassedTests']+len(rows),'mappings':rows,'overlap':extra,'inputs':{p.relative_to(out).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in [out/'general.json',out/'cloud-per-file/results.json']}}
assert len(rows)==ordinary['numPendingTests'];assert len(rows)+len(extra)==cloud['passedTests']
(out/'skip-pg-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in report.items() if k not in ['mappings','overlap','inputs']})
