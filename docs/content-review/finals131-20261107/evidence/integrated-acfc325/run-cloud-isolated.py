import pathlib,subprocess,os,json,uuid
root=pathlib.Path.cwd();out=root/'output/finals131/integrated-acfc325/cloud-per-file';out.mkdir(exist_ok=True)
minimal={k:v for k,v in os.environ.items() if k in ['PATH','HOME','TMPDIR','LANG','LC_ALL','SHELL']};minimal.update(NO_COLOR='1',CI='1')
files=[p for p in sorted((root/'src/__tests__').glob('*test.mjs')) if 'TEST_DATABASE_URL' in p.read_text()]
results=[]
for file in files:
 name='f131_acfc_'+uuid.uuid4().hex[:12]
 subprocess.run(['createdb','-h','127.0.0.1','-p','55931','-U','finals131_test','--no-password',name],check=True,capture_output=True)
 env={**minimal,'TEST_DATABASE_URL':f'postgresql://finals131_test@127.0.0.1:55931/{name}'}
 log=out/(file.stem+'.log'); report=out/(file.stem+'.json')
 with log.open('w') as f:r=subprocess.run(['npx','vitest','run','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile.json='+str(report),str(file.relative_to(root))],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT)
 raw=json.loads(report.read_text()) if report.exists() else {}
 assertions=[{'file':str(pathlib.Path(s['name']).relative_to(root)),'fullName':t['fullName'],'status':t['status']} for s in raw.get('testResults',[]) for t in s['assertionResults']]
 entry={'file':file.name,'exitCode':r.returncode,'passedTests':raw.get('numPassedTests'),'freshDatabasePerFile':True,'log':log.name,'assertions':assertions};results.append(entry)
 summary={'integratedBase':'acfc325806be99254856ff31f88c4138961da8db','expectedFiles':len(files),'completedFiles':len(results),'allPassed':len(results)==len(files) and all(x['exitCode']==0 for x in results),'passedTests':sum(x['passedTests'] or 0 for x in results),'results':results}
 (out/'results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 print(file.name,r.returncode,raw.get('numPassedTests'),flush=True)
 if r.returncode:break
