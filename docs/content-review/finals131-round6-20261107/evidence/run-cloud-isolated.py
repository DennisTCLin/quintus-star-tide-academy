import pathlib,subprocess,os,json,uuid,datetime
root=pathlib.Path.cwd();out=root/'output/round6/cloud-per-file';out.mkdir(parents=True,exist_ok=True)
minimal={k:v for k,v in os.environ.items() if k in ['PATH','HOME','TMPDIR','LANG','LC_ALL','SHELL']};minimal.update(NO_COLOR='1',CI='1')
files=[p for p in sorted((root/'src/__tests__').glob('*test.mjs')) if 'TEST_DATABASE_URL' in p.read_text()]
results=[]
for file in files:
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 name='f131_round6_'+uuid.uuid4().hex[:12]
 subprocess.run(['createdb','-h','127.0.0.1','-p','55931','-U','finals131_test','--no-password',name],check=True,capture_output=True)
 preflight=subprocess.run(['psql','-h','127.0.0.1','-p','55931','-U','finals131_test','--no-password','-d',name,'-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"],check=True,capture_output=True,text=True).stdout.strip()
 assert preflight=='0',preflight
 env={**minimal,'TEST_DATABASE_URL':f'postgresql://finals131_test@127.0.0.1:55931/{name}'}
 log=out/(file.stem+'.log'); report=out/(file.stem+'.json')
 with log.open('w') as f:r=subprocess.run(['npx','vitest','run','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile.json='+str(report),str(file.relative_to(root))],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT)
 raw=json.loads(report.read_text()) if report.exists() else {}
 assertions=[{'file':str(pathlib.Path(s['name']).relative_to(root)),'fullName':t['fullName'],'status':t['status']} for s in raw.get('testResults',[]) for t in s['assertionResults']]
 entry={'startedAt':started,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'file':file.name,'exitCode':r.returncode,'passedTests':raw.get('numPassedTests'),'freshDatabasePerFile':True,'databaseName':name,'publicTablesBefore':int(preflight),'log':log.name,'assertions':assertions};results.append(entry)
 summary={'integratedBase':'c66f492811c51298673fede44d0997d33aa64494','expectedFiles':len(files),'completedFiles':len(results),'allPassed':len(results)==len(files) and all(x['exitCode']==0 for x in results),'passedTests':sum(x['passedTests'] or 0 for x in results),'results':results}
 (out/'results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 print(file.name,r.returncode,raw.get('numPassedTests'),flush=True)
 if r.returncode:break
